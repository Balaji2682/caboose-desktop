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
}

// DebugConfig contains debugger configuration
type DebugConfig struct {
	// Port is the debugger port
	Port int `toml:"port"`

	// AutoAttach automatically attaches when debugger is detected
	AutoAttach bool `toml:"auto_attach"`
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

	file, err := os.Create(configPath)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := toml.NewEncoder(file)
	return encoder.Encode(c)
}
