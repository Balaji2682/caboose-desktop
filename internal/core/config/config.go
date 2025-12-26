package config

import (
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
	"github.com/caboose-desktop/internal/models"
)

const ConfigFileName = ".caboose.toml"

// Config represents the application configuration
type Config struct {
	// Framework is the detected or configured framework (rails, django, etc.)
	Framework string `toml:"framework,omitempty"`

	// ProjectName is the name of the project
	ProjectName string `toml:"project_name,omitempty"`

	// Processes contains the process configurations
	Processes map[string]models.ProcessConfig `toml:"processes,omitempty"`

	// Log configuration
	Log LogConfig `toml:"log,omitempty"`

	// Database configuration
	Database DatabaseConfig `toml:"database,omitempty"`

	// Debug configuration
	Debug DebugConfig `toml:"debug,omitempty"`

	// SSH configuration
	SSH SSHConfig `toml:"ssh,omitempty"`
}

// LogConfig contains logging configuration
type LogConfig struct {
	// BufferSize is the maximum number of log lines to keep in memory
	BufferSize int `toml:"buffer_size"`

	// ShowTimestamps controls whether timestamps are shown
	ShowTimestamps bool `toml:"show_timestamps"`
}

// DatabaseConfig contains database monitoring configuration
type DatabaseConfig struct {
	// SlowQueryThreshold in milliseconds
	SlowQueryThreshold float64 `toml:"slow_query_threshold"`

	// EnableN1Detection enables N+1 query detection
	EnableN1Detection bool `toml:"enable_n1_detection"`

	// Connections contains saved database connections (passwords not stored)
	Connections []DatabaseConnection `toml:"connections,omitempty"`

	// SavedQueries contains saved SQL queries
	SavedQueries []SavedQuery `toml:"saved_queries,omitempty"`
}

// DatabaseConnection represents a saved database connection
type DatabaseConnection struct {
	// Name is a friendly name for this connection
	Name string `toml:"name"`

	// Driver is the database type (mysql, postgres, sqlite)
	Driver string `toml:"driver"`

	// Host is the database host
	Host string `toml:"host"`

	// Port is the database port
	Port int `toml:"port"`

	// User is the database username
	User string `toml:"user"`

	// Database is the database name
	Database string `toml:"database"`

	// SSLMode is the SSL mode
	SSLMode string `toml:"ssl_mode,omitempty"`
}

// SavedQuery represents a saved SQL query
type SavedQuery struct {
	// ID is the unique identifier
	ID string `toml:"id"`

	// Name is the friendly name
	Name string `toml:"name"`

	// SQL is the query text
	SQL string `toml:"sql"`

	// CreatedAt is when the query was saved
	CreatedAt string `toml:"created_at"`
}

// DebugConfig contains debugger configuration
type DebugConfig struct {
	// Port is the debugger port
	Port int `toml:"port"`

	// AutoAttach automatically attaches when debugger is detected
	AutoAttach bool `toml:"auto_attach"`
}

// SSHConfig contains SSH connection settings
type SSHConfig struct {
	// SavedServers contains SSH server profiles
	SavedServers []models.SSHServer `toml:"servers,omitempty"`

	// DefaultUsername for new connections
	DefaultUsername string `toml:"default_username,omitempty"`

	// PreferAgent prefers SSH agent over key files
	PreferAgent bool `toml:"prefer_agent"`

	// MaxSessions is the maximum number of concurrent SSH sessions (1-10, default 5)
	MaxSessions int `toml:"max_sessions"`

	// ConnectionTimeout in seconds for initial connection (default 10)
	ConnectionTimeout int `toml:"connection_timeout"`

	// MaxRetries for connection attempts (default 3)
	MaxRetries int `toml:"max_retries"`

	// RetryBackoff initial backoff duration in seconds (default 1)
	RetryBackoff int `toml:"retry_backoff"`

	// KeepaliveInterval in seconds for SSH keepalive (default 30, 0 to disable)
	KeepaliveInterval int `toml:"keepalive_interval"`

	// MaxLogEntries per session (default 10000, prevents memory leak)
	MaxLogEntries int `toml:"max_log_entries"`

	// KnownHostsFile path to known_hosts file (default ~/.ssh/known_hosts)
	KnownHostsFile string `toml:"known_hosts_file,omitempty"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Log: LogConfig{
			BufferSize:     10000,
			ShowTimestamps: true,
		},
		Database: DatabaseConfig{
			SlowQueryThreshold: 100.0, // 100ms
			EnableN1Detection:  true,
		},
		Debug: DebugConfig{
			Port:       12345,
			AutoAttach: false,
		},
		SSH: SSHConfig{
			PreferAgent:       true,
			MaxSessions:       5,
			ConnectionTimeout: 10,
			MaxRetries:        3,
			RetryBackoff:      1,
			KeepaliveInterval: 30,
			MaxLogEntries:     10000,
		},
		Processes: make(map[string]models.ProcessConfig),
	}
}

// Load loads configuration from the given directory
func Load(dir string) (*Config, error) {
	configPath := filepath.Join(dir, ConfigFileName)

	// Check if config file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return DefaultConfig(), nil
	}

	config := DefaultConfig()
	if _, err := toml.DecodeFile(configPath, config); err != nil {
		return nil, err
	}

	return config, nil
}

// Save saves the configuration to the given directory
func (c *Config) Save(dir string) error {
	configPath := filepath.Join(dir, ConfigFileName)

	// SECURITY: Create file with restrictive permissions (0600 = owner read/write only)
	file, err := os.OpenFile(configPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := toml.NewEncoder(file)
	return encoder.Encode(c)
}
