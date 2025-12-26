package ssh

import (
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/caboose-desktop/internal/core/config"
	"github.com/caboose-desktop/internal/models"
)

// Manager handles all SSH connections
type Manager struct {
	mu            sync.RWMutex
	sessions      map[string]*Session
	config        *config.SSHConfig
	cleanupTicker *time.Ticker
	cleanupStop   chan struct{}

	OnOutput       func(sessionID, data string)
	OnDisconnect   func(sessionID string)
	OnHealthUpdate func(sessionID string, health models.SSHHealth)
}

// NewManager creates a new SSH manager
func NewManager(cfg *config.SSHConfig) *Manager {
	m := &Manager{
		sessions:    make(map[string]*Session),
		config:      cfg,
		cleanupStop: make(chan struct{}),
	}

	// Start cleanup goroutine
	m.startCleanup()

	slog.Info("SSH manager initialized",
		"max_sessions", cfg.MaxSessions,
		"keepalive_interval", cfg.KeepaliveInterval)

	return m
}

// startCleanup starts periodic cleanup of stale sessions
func (m *Manager) startCleanup() {
	m.cleanupTicker = time.NewTicker(5 * time.Minute)

	go func() {
		defer m.cleanupTicker.Stop()

		for {
			select {
			case <-m.cleanupTicker.C:
				m.cleanupStaleSessions()

			case <-m.cleanupStop:
				slog.Debug("SSH manager cleanup stopped")
				return
			}
		}
	}()
}

// cleanupStaleSessions removes disconnected sessions
func (m *Manager) cleanupStaleSessions() {
	m.mu.Lock()
	defer m.mu.Unlock()

	removed := 0
	for id, session := range m.sessions {
		// Check if session is still connected
		if session.Client == nil || session.Session == nil {
			delete(m.sessions, id)
			removed++
		}
	}

	if removed > 0 {
		slog.Info("cleaned up stale SSH sessions",
			"removed", removed,
			"active", len(m.sessions))
	}
}

// CreateSession creates a new SSH session
func (m *Manager) CreateSession(server models.SSHServer) (string, error) {
	// Check session limit
	m.mu.RLock()
	currentSessions := len(m.sessions)
	m.mu.RUnlock()

	maxSessions := m.config.MaxSessions
	if maxSessions <= 0 {
		maxSessions = 5
	}
	if maxSessions > 10 {
		maxSessions = 10 // Hard limit
	}

	if currentSessions >= maxSessions {
		slog.Warn("session limit reached",
			"current", currentSessions,
			"max", maxSessions)
		return "", fmt.Errorf("maximum number of concurrent sessions reached (%d/%d)", currentSessions, maxSessions)
	}

	sessionID := uuid.New().String()

	slog.Info("creating SSH session",
		"session_id", sessionID,
		"server", server.Name,
		"host", server.Host)

	session := &Session{
		ID:     sessionID,
		Server: server,
		Config: m.config,
		logs:   []models.SSHSessionLog{},
	}

	session.onOutput = func(data string) {
		if m.OnOutput != nil {
			m.OnOutput(sessionID, data)
		}
	}

	session.onDisconnect = func() {
		if m.OnDisconnect != nil {
			m.OnDisconnect(sessionID)
		}
	}

	session.onHealthUpdate = func(health models.SSHHealth) {
		if m.OnHealthUpdate != nil {
			m.OnHealthUpdate(sessionID, health)
		}
	}

	// Connect
	if err := session.Connect(); err != nil {
		slog.Error("failed to create SSH session",
			"session_id", sessionID,
			"server", server.Name,
			"error", err.Error())
		return "", err
	}

	m.mu.Lock()
	m.sessions[sessionID] = session
	m.mu.Unlock()

	slog.Info("SSH session created successfully",
		"session_id", sessionID,
		"server", server.Name,
		"active_sessions", len(m.sessions))

	return sessionID, nil
}

// Write writes data to a session
func (m *Manager) Write(sessionID string, data []byte) error {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session %s not found", sessionID)
	}

	return session.Write(data)
}

// Resize resizes a session's terminal
func (m *Manager) Resize(sessionID string, rows, cols int) error {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session %s not found", sessionID)
	}

	return session.Resize(rows, cols)
}

// CloseSession closes an SSH session
func (m *Manager) CloseSession(sessionID string) error {
	m.mu.Lock()
	session, exists := m.sessions[sessionID]
	if exists {
		delete(m.sessions, sessionID)
	}
	m.mu.Unlock()

	if !exists {
		return fmt.Errorf("session %s not found", sessionID)
	}

	return session.Close()
}

// GetSessionLogs returns logs for a session
func (m *Manager) GetSessionLogs(sessionID string) ([]models.SSHSessionLog, error) {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("session %s not found", sessionID)
	}

	return session.GetLogs(), nil
}

// CreateTunnel creates an SSH tunnel
func (m *Manager) CreateTunnel(sessionID string, tunnel models.SSHTunnel) error {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session %s not found", sessionID)
	}

	switch tunnel.Type {
	case "local":
		return session.CreateLocalTunnel(tunnel)
	case "dynamic":
		return session.CreateDynamicTunnel(tunnel.LocalHost, tunnel.LocalPort)
	default:
		return fmt.Errorf("unsupported tunnel type: %s", tunnel.Type)
	}
}

// GetAllSessions returns information about all active sessions
func (m *Manager) GetAllSessions() []models.SSHSession {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sessions := make([]models.SSHSession, 0, len(m.sessions))
	for id, session := range m.sessions {
		sessions = append(sessions, models.SSHSession{
			ID:         id,
			ServerID:   session.Server.ID,
			ServerName: session.Server.Name,
			Status:     "connected",
		})
	}
	return sessions
}

// Shutdown closes all SSH sessions
func (m *Manager) Shutdown() {
	slog.Info("shutting down SSH manager")

	// Stop cleanup ticker
	if m.cleanupStop != nil {
		close(m.cleanupStop)
	}
	if m.cleanupTicker != nil {
		m.cleanupTicker.Stop()
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	sessionCount := len(m.sessions)
	for id, session := range m.sessions {
		slog.Debug("closing session during shutdown", "session_id", id)
		session.Close()
	}
	m.sessions = make(map[string]*Session)

	slog.Info("SSH manager shutdown complete", "closed_sessions", sessionCount)
}
