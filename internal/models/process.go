package models

import "time"

// ProcessStatus represents the current state of a process
type ProcessStatus string

const (
	ProcessStatusStopped  ProcessStatus = "stopped"
	ProcessStatusStarting ProcessStatus = "starting"
	ProcessStatusRunning  ProcessStatus = "running"
	ProcessStatusCrashed  ProcessStatus = "crashed"
	ProcessStatusStopping ProcessStatus = "stopping"
)

// Process represents a managed process
type Process struct {
	// Name is the unique identifier for this process
	Name string `json:"name"`

	// Command is the command to execute
	Command string `json:"command"`

	// Args are the command arguments
	Args []string `json:"args,omitempty"`

	// WorkingDir is the working directory for the process
	WorkingDir string `json:"workingDir,omitempty"`

	// Environment variables for this process
	Environment map[string]string `json:"environment,omitempty"`

	// Status is the current process status
	Status ProcessStatus `json:"status"`

	// PID is the process ID when running
	PID int `json:"pid,omitempty"`

	// StartedAt is when the process was started
	StartedAt *time.Time `json:"startedAt,omitempty"`

	// ExitCode is the last exit code
	ExitCode *int `json:"exitCode,omitempty"`

	// AutoRestart determines if the process should auto-restart on crash
	AutoRestart bool `json:"autoRestart"`

	// RestartCount tracks how many times this process has restarted
	RestartCount int `json:"restartCount"`

	// Color is the color used for this process in logs
	Color string `json:"color,omitempty"`

	// UsePTY determines if the process should run in a pseudo-terminal
	UsePTY bool `json:"usePty"`
}

// ProcessConfig represents the configuration for a process from .caboose.toml
type ProcessConfig struct {
	Name        string            `toml:"name"`
	Command     string            `toml:"command"`
	Args        []string          `toml:"args,omitempty"`
	WorkingDir  string            `toml:"working_dir,omitempty"`
	Environment map[string]string `toml:"environment,omitempty"`
	AutoRestart bool              `toml:"auto_restart"`
	UsePTY      bool              `toml:"use_pty"`
	Color       string            `toml:"color,omitempty"`
}
