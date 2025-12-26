package ssh

import (
	"fmt"
	"io"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"

	"github.com/caboose-desktop/internal/core/config"
	"github.com/caboose-desktop/internal/models"
)

// Session represents an active SSH session
type Session struct {
	ID              string
	Server          models.SSHServer
	Config          *config.SSHConfig
	Client          *ssh.Client
	Session         *ssh.Session
	mu              sync.Mutex
	onOutput        func(data string)
	onDisconnect    func()
	onHealthUpdate  func(health models.SSHHealth)
	logs            []models.SSHSessionLog
	stdin           io.WriteCloser
	keepaliveTicker *time.Ticker
	keepaliveStop   chan struct{}
	healthTicker    *time.Ticker
	healthStop      chan struct{}
	lastLatency     time.Duration
	avgLatency      time.Duration
	latencySamples  []time.Duration
}

// Connect establishes the SSH connection with retry logic
func (s *Session) Connect() error {
	maxRetries := s.Config.MaxRetries
	if maxRetries <= 0 {
		maxRetries = 3
	}

	backoff := time.Duration(s.Config.RetryBackoff) * time.Second
	if backoff <= 0 {
		backoff = time.Second
	}

	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			slog.Info("retrying SSH connection",
				"attempt", attempt,
				"max_retries", maxRetries,
				"server", s.Server.Name,
				"backoff", backoff)
			time.Sleep(backoff)
			backoff *= 2
			if backoff > 30*time.Second {
				backoff = 30 * time.Second
			}
		}

		err := s.connectOnce()
		if err == nil {
			slog.Info("SSH connection established",
				"server", s.Server.Name,
				"host", s.Server.Host,
				"username", s.Server.Username,
				"session_id", s.ID)

			// Start keepalive if configured
			if s.Config.KeepaliveInterval > 0 {
				s.startKeepalive()
			}

			// Start health monitoring
			s.startHealthMonitoring()

			return nil
		}

		lastErr = err
		slog.Warn("SSH connection attempt failed",
			"attempt", attempt+1,
			"server", s.Server.Name,
			"error", err.Error())
	}

	slog.Error("SSH connection failed after all retries",
		"server", s.Server.Name,
		"attempts", maxRetries+1,
		"error", lastErr.Error())

	return fmt.Errorf("failed to connect after %d attempts: %w", maxRetries+1, lastErr)
}

// connectOnce attempts a single SSH connection
func (s *Session) connectOnce() error {
	// Get known_hosts callback
	hostKeyCallback, err := GetKnownHostsCallback(s.Config.KnownHostsFile)
	if err != nil {
		slog.Error("failed to create known_hosts callback", "error", err)
		return err
	}

	// Build SSH client config
	timeout := time.Duration(s.Config.ConnectionTimeout) * time.Second
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	sshConfig := &ssh.ClientConfig{
		User:            s.Server.Username,
		HostKeyCallback: hostKeyCallback,
		Timeout:         timeout,
	}

	// Add auth method
	if s.Server.UseAgent {
		authMethod, err := GetSSHAgent()
		if err != nil {
			return err
		}
		sshConfig.Auth = []ssh.AuthMethod{authMethod}
		slog.Debug("using SSH agent for authentication", "server", s.Server.Name)
	} else if s.Server.PrivateKeyPath != "" {
		authMethod, err := LoadPrivateKey(s.Server.PrivateKeyPath)
		if err != nil {
			return err
		}
		sshConfig.Auth = []ssh.AuthMethod{authMethod}
		slog.Debug("using private key for authentication",
			"server", s.Server.Name,
			"key_path", s.Server.PrivateKeyPath)
	}

	// Connect to SSH server
	addr := fmt.Sprintf("%s:%d", s.Server.Host, s.Server.Port)
	client, err := ssh.Dial("tcp", addr, sshConfig)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	s.Client = client

	// Create session
	session, err := client.NewSession()
	if err != nil {
		client.Close()
		return fmt.Errorf("failed to create session: %w", err)
	}
	s.Session = session

	// Set up PTY
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty("xterm-256color", 24, 80, modes); err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to request PTY: %w", err)
	}

	// Get stdin/stdout pipes
	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		client.Close()
		return err
	}
	s.stdin = stdin

	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		client.Close()
		return err
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		session.Close()
		client.Close()
		return err
	}

	// Start shell
	if err := session.Shell(); err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to start shell: %w", err)
	}

	// Start output readers
	go s.readOutput(stdout)
	go s.readOutput(stderr)

	return nil
}

// Write sends data to the SSH session
func (s *Session) Write(data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.stdin == nil {
		return fmt.Errorf("session not connected")
	}

	_, err := s.stdin.Write(data)

	// Log input with rotation
	s.addLogEntry(models.SSHSessionLog{
		SessionID: s.ID,
		Timestamp: time.Now(),
		Server:    s.Server.Name,
		Type:      "input",
		Content:   string(data),
	})

	return err
}

// addLogEntry adds a log entry with rotation
func (s *Session) addLogEntry(entry models.SSHSessionLog) {
	s.logs = append(s.logs, entry)

	// Rotate logs if exceeding max size
	maxLogs := s.Config.MaxLogEntries
	if maxLogs <= 0 {
		maxLogs = 10000
	}

	if len(s.logs) > maxLogs {
		// Keep only the most recent entries
		s.logs = s.logs[len(s.logs)-maxLogs:]
		slog.Debug("rotated session logs",
			"session_id", s.ID,
			"max_entries", maxLogs)
	}
}

// Resize resizes the terminal
func (s *Session) Resize(rows, cols int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.Session == nil {
		return fmt.Errorf("session not connected")
	}

	return s.Session.WindowChange(rows, cols)
}

// readOutput reads from SSH session and emits to frontend
func (s *Session) readOutput(reader io.Reader) {
	buf := make([]byte, 4096)
	for {
		n, err := reader.Read(buf)
		if err != nil {
			if err == io.EOF {
				slog.Info("SSH session disconnected (EOF)",
					"session_id", s.ID,
					"server", s.Server.Name)
				if s.onDisconnect != nil {
					s.onDisconnect()
				}
			} else {
				slog.Error("error reading SSH output",
					"session_id", s.ID,
					"error", err.Error())
			}
			break
		}

		if n > 0 {
			data := string(buf[:n])
			if s.onOutput != nil {
				s.onOutput(data)
			}

			// Log output with rotation
			s.mu.Lock()
			s.addLogEntry(models.SSHSessionLog{
				SessionID: s.ID,
				Timestamp: time.Now(),
				Server:    s.Server.Name,
				Type:      "output",
				Content:   data,
			})
			s.mu.Unlock()
		}
	}
}

// startKeepalive starts sending SSH keepalive packets
func (s *Session) startKeepalive() {
	interval := time.Duration(s.Config.KeepaliveInterval) * time.Second
	if interval <= 0 {
		return
	}

	s.keepaliveStop = make(chan struct{})
	s.keepaliveTicker = time.NewTicker(interval)

	go func() {
		defer s.keepaliveTicker.Stop()

		slog.Debug("SSH keepalive started",
			"session_id", s.ID,
			"interval", interval)

		for {
			select {
			case <-s.keepaliveTicker.C:
				if s.Session == nil {
					return
				}

				// Send keepalive request
				_, err := s.Session.SendRequest("keepalive@openssh.com", true, nil)
				if err != nil {
					slog.Warn("SSH keepalive failed",
						"session_id", s.ID,
						"error", err.Error())

					// Connection is dead, trigger disconnect
					if s.onDisconnect != nil {
						s.onDisconnect()
					}
					return
				}

				slog.Debug("SSH keepalive sent",
					"session_id", s.ID)

			case <-s.keepaliveStop:
				slog.Debug("SSH keepalive stopped",
					"session_id", s.ID)
				return
			}
		}
	}()
}

// startHealthMonitoring starts periodic connection health checks
func (s *Session) startHealthMonitoring() {
	interval := 10 * time.Second // Check every 10 seconds

	s.healthStop = make(chan struct{})
	s.healthTicker = time.NewTicker(interval)
	s.latencySamples = make([]time.Duration, 0, 10)

	go func() {
		defer s.healthTicker.Stop()

		slog.Debug("SSH health monitoring started",
			"session_id", s.ID,
			"interval", interval)

		// Initial health check
		s.measureLatency()

		for {
			select {
			case <-s.healthTicker.C:
				s.measureLatency()

			case <-s.healthStop:
				slog.Debug("SSH health monitoring stopped",
					"session_id", s.ID)
				return
			}
		}
	}()
}

// measureLatency measures connection latency and updates health status
func (s *Session) measureLatency() {
	if s.Session == nil {
		return
	}

	// Measure latency with a simple request
	start := time.Now()
	_, err := s.Session.SendRequest("keepalive@openssh.com", true, nil)
	latency := time.Since(start)

	s.mu.Lock()
	defer s.mu.Unlock()

	if err != nil {
		slog.Debug("latency check failed",
			"session_id", s.ID,
			"error", err.Error())
		return
	}

	s.lastLatency = latency

	// Update rolling average (keep last 10 samples)
	s.latencySamples = append(s.latencySamples, latency)
	if len(s.latencySamples) > 10 {
		s.latencySamples = s.latencySamples[1:]
	}

	// Calculate average
	var total time.Duration
	for _, sample := range s.latencySamples {
		total += sample
	}
	s.avgLatency = total / time.Duration(len(s.latencySamples))

	// Determine health status
	status := "healthy"
	latencyMs := s.lastLatency.Milliseconds()
	avgLatencyMs := s.avgLatency.Milliseconds()

	if avgLatencyMs > 500 || latencyMs > 1000 {
		status = "unhealthy"
	} else if avgLatencyMs > 200 || latencyMs > 500 {
		status = "degraded"
	}

	slog.Debug("health check complete",
		"session_id", s.ID,
		"latency_ms", latencyMs,
		"avg_latency_ms", avgLatencyMs,
		"status", status)

	// Send health update
	if s.onHealthUpdate != nil {
		s.onHealthUpdate(models.SSHHealth{
			SessionID:   s.ID,
			Status:      status,
			Latency:     latencyMs,
			AvgLatency:  avgLatencyMs,
			PacketLoss:  0.0, // TODO: Implement packet loss tracking
			LastCheckAt: time.Now().Format(time.RFC3339),
		})
	}
}

// Close closes the SSH session
func (s *Session) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	slog.Info("closing SSH session",
		"session_id", s.ID,
		"server", s.Server.Name)

	// Stop keepalive
	if s.keepaliveStop != nil {
		close(s.keepaliveStop)
		s.keepaliveStop = nil
	}
	if s.keepaliveTicker != nil {
		s.keepaliveTicker.Stop()
		s.keepaliveTicker = nil
	}

	// Stop health monitoring
	if s.healthStop != nil {
		close(s.healthStop)
		s.healthStop = nil
	}
	if s.healthTicker != nil {
		s.healthTicker.Stop()
		s.healthTicker = nil
	}

	// Close SSH session and client
	if s.Session != nil {
		s.Session.Close()
		s.Session = nil
	}
	if s.Client != nil {
		s.Client.Close()
		s.Client = nil
	}
	if s.stdin != nil {
		s.stdin = nil
	}

	slog.Debug("SSH session closed successfully",
		"session_id", s.ID)

	return nil
}

// GetLogs returns session logs for export
func (s *Session) GetLogs() []models.SSHSessionLog {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]models.SSHSessionLog{}, s.logs...)
}
