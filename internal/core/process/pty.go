package process

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"

	"github.com/creack/pty"
)

// startWithPTY starts a process with PTY support for interactive terminals
func (m *Manager) startWithPTY(mp *ManagedProcess) error {
	mp.cmd = exec.CommandContext(m.ctx, mp.Config.Command, mp.Config.Args...)
	mp.cmd.Dir = mp.Config.WorkingDir

	// Set environment
	mp.cmd.Env = os.Environ()
	for k, v := range mp.Config.Environment {
		mp.cmd.Env = append(mp.cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	// Start with PTY
	ptmx, err := pty.Start(mp.cmd)
	if err != nil {
		return fmt.Errorf("failed to start with pty: %w", err)
	}

	mp.pty = ptmx

	// Start reading PTY output in a goroutine
	go m.readPTYOutput(mp)

	return nil
}

// readPTYOutput reads output from the PTY and emits log events
func (m *Manager) readPTYOutput(mp *ManagedProcess) {
	if mp.pty == nil {
		return
	}

	reader := bufio.NewReader(mp.pty)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err != io.EOF {
				// Log error but don't crash
			}
			break
		}

		// Emit log line
		if m.OnLog != nil {
			m.OnLog(mp.Config.Name, line)
		}
	}
}

// ResizePTY resizes the PTY window
func (m *Manager) ResizePTY(name string, rows, cols uint16) error {
	m.mu.RLock()
	mp, exists := m.processes[name]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("process %s not found", name)
	}

	mp.mu.Lock()
	defer mp.mu.Unlock()

	if mp.pty == nil {
		return fmt.Errorf("process %s is not running with PTY", name)
	}

	return pty.Setsize(mp.pty, &pty.Winsize{
		Rows: rows,
		Cols: cols,
	})
}

// WriteToPTY writes data to a process's PTY (for interactive input)
func (m *Manager) WriteToPTY(name string, data []byte) error {
	m.mu.RLock()
	mp, exists := m.processes[name]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("process %s not found", name)
	}

	mp.mu.Lock()
	defer mp.mu.Unlock()

	if mp.pty == nil {
		return fmt.Errorf("process %s is not running with PTY", name)
	}

	_, err := mp.pty.Write(data)
	return err
}

// ClosePTY closes the PTY file descriptor
func (m *Manager) ClosePTY(name string) error {
	m.mu.RLock()
	mp, exists := m.processes[name]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("process %s not found", name)
	}

	mp.mu.Lock()
	defer mp.mu.Unlock()

	if mp.pty != nil {
		err := mp.pty.Close()
		mp.pty = nil
		return err
	}

	return nil
}
