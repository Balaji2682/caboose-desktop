package process

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/caboose-desktop/internal/models"
)

// Manager handles process lifecycle management
type Manager struct {
	mu        sync.RWMutex
	processes map[string]*ManagedProcess
	ctx       context.Context
	cancel    context.CancelFunc

	// Callbacks for events
	OnStatusChange func(name string, status models.ProcessStatus)
	OnLog          func(name string, line string)
}

// ManagedProcess wraps a process with management capabilities
type ManagedProcess struct {
	Config       models.ProcessConfig
	Process      *models.Process
	cmd          *exec.Cmd
	pty          *os.File
	mu           sync.Mutex
	restartCount int
	lastRestart  time.Time
}

// NewManager creates a new process manager
func NewManager() *Manager {
	ctx, cancel := context.WithCancel(context.Background())
	return &Manager{
		processes: make(map[string]*ManagedProcess),
		ctx:       ctx,
		cancel:    cancel,
	}
}

// AddProcess adds a process configuration to the manager
func (m *Manager) AddProcess(config models.ProcessConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.processes[config.Name]; exists {
		return fmt.Errorf("process %s already exists", config.Name)
	}

	m.processes[config.Name] = &ManagedProcess{
		Config: config,
		Process: &models.Process{
			Name:        config.Name,
			Command:     config.Command,
			Args:        config.Args,
			WorkingDir:  config.WorkingDir,
			Environment: config.Environment,
			Status:      models.ProcessStatusStopped,
			AutoRestart: config.AutoRestart,
			UsePTY:      config.UsePTY,
			Color:       config.Color,
		},
	}

	return nil
}

// Start starts a process by name
func (m *Manager) Start(name string) error {
	m.mu.RLock()
	mp, exists := m.processes[name]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("process %s not found", name)
	}

	return m.startProcess(mp)
}

// startProcess handles the actual process starting logic
func (m *Manager) startProcess(mp *ManagedProcess) error {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	if mp.Process.Status == models.ProcessStatusRunning {
		return fmt.Errorf("process %s is already running", mp.Config.Name)
	}

	mp.Process.Status = models.ProcessStatusStarting
	m.emitStatusChange(mp.Config.Name, models.ProcessStatusStarting)

	var err error
	if mp.Config.UsePTY {
		err = m.startWithPTY(mp)
	} else {
		err = m.startPlain(mp)
	}

	if err != nil {
		mp.Process.Status = models.ProcessStatusCrashed
		m.emitStatusChange(mp.Config.Name, models.ProcessStatusCrashed)
		return err
	}

	mp.Process.Status = models.ProcessStatusRunning
	now := time.Now()
	mp.Process.StartedAt = &now
	mp.Process.PID = mp.cmd.Process.Pid
	m.emitStatusChange(mp.Config.Name, models.ProcessStatusRunning)

	// Start output reader goroutine
	go m.readOutput(mp)

	// Start process monitor goroutine
	go m.monitorProcess(mp)

	return nil
}

// startPlain starts a process without PTY
func (m *Manager) startPlain(mp *ManagedProcess) error {
	mp.cmd = exec.CommandContext(m.ctx, mp.Config.Command, mp.Config.Args...)
	mp.cmd.Dir = mp.Config.WorkingDir

	// Set environment
	mp.cmd.Env = os.Environ()
	for k, v := range mp.Config.Environment {
		mp.cmd.Env = append(mp.cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	return mp.cmd.Start()
}

// Stop stops a process by name
func (m *Manager) Stop(name string) error {
	m.mu.RLock()
	mp, exists := m.processes[name]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("process %s not found", name)
	}

	return m.stopProcess(mp)
}

// stopProcess handles the actual process stopping logic
func (m *Manager) stopProcess(mp *ManagedProcess) error {
	mp.mu.Lock()
	defer mp.mu.Unlock()

	if mp.Process.Status != models.ProcessStatusRunning {
		return nil
	}

	mp.Process.Status = models.ProcessStatusStopping
	m.emitStatusChange(mp.Config.Name, models.ProcessStatusStopping)

	// Try graceful shutdown first
	if mp.cmd != nil && mp.cmd.Process != nil {
		mp.cmd.Process.Signal(os.Interrupt)

		// Wait for graceful shutdown with timeout
		done := make(chan error, 1)
		go func() {
			done <- mp.cmd.Wait()
		}()

		select {
		case <-done:
			// Process exited gracefully
		case <-time.After(5 * time.Second):
			// Force kill after timeout
			mp.cmd.Process.Kill()
		}
	}

	mp.Process.Status = models.ProcessStatusStopped
	mp.Process.StartedAt = nil
	mp.Process.PID = 0
	m.emitStatusChange(mp.Config.Name, models.ProcessStatusStopped)

	return nil
}

// Restart restarts a process by name
func (m *Manager) Restart(name string) error {
	if err := m.Stop(name); err != nil {
		return err
	}
	return m.Start(name)
}

// GetProcess returns process info by name
func (m *Manager) GetProcess(name string) (*models.Process, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	mp, exists := m.processes[name]
	if !exists {
		return nil, false
	}
	return mp.Process, true
}

// GetAllProcesses returns all process info
func (m *Manager) GetAllProcesses() []*models.Process {
	m.mu.RLock()
	defer m.mu.RUnlock()

	processes := make([]*models.Process, 0, len(m.processes))
	for _, mp := range m.processes {
		processes = append(processes, mp.Process)
	}
	return processes
}

// monitorProcess watches for process exit and handles restart
func (m *Manager) monitorProcess(mp *ManagedProcess) {
	if mp.cmd == nil {
		return
	}

	err := mp.cmd.Wait()

	mp.mu.Lock()
	defer mp.mu.Unlock()

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		}
	}
	mp.Process.ExitCode = &exitCode

	if mp.Process.Status == models.ProcessStatusStopping {
		return // Expected stop
	}

	mp.Process.Status = models.ProcessStatusCrashed
	m.emitStatusChange(mp.Config.Name, models.ProcessStatusCrashed)

	// Handle auto-restart with exponential backoff
	if mp.Config.AutoRestart {
		go m.handleAutoRestart(mp)
	}
}

// handleAutoRestart implements exponential backoff for restarts
func (m *Manager) handleAutoRestart(mp *ManagedProcess) {
	mp.restartCount++

	// Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
	backoff := time.Duration(1<<uint(mp.restartCount-1)) * time.Second
	if backoff > 30*time.Second {
		backoff = 30 * time.Second
	}

	// Reset restart count if last restart was more than 60s ago
	if time.Since(mp.lastRestart) > 60*time.Second {
		mp.restartCount = 1
		backoff = time.Second
	}

	time.Sleep(backoff)
	mp.lastRestart = time.Now()

	m.startProcess(mp)
}

// readOutput reads process output and emits log events
func (m *Manager) readOutput(mp *ManagedProcess) {
	// Implementation depends on PTY vs plain mode
	// This is a placeholder for the output reading logic
}

// emitStatusChange calls the status change callback if set
func (m *Manager) emitStatusChange(name string, status models.ProcessStatus) {
	if m.OnStatusChange != nil {
		m.OnStatusChange(name, status)
	}
}

// Shutdown stops all processes and cleans up
func (m *Manager) Shutdown() {
	m.cancel()

	m.mu.RLock()
	names := make([]string, 0, len(m.processes))
	for name := range m.processes {
		names = append(names, name)
	}
	m.mu.RUnlock()

	for _, name := range names {
		m.Stop(name)
	}
}
