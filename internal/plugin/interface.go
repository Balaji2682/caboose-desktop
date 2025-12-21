package plugin

import "github.com/caboose-desktop/internal/models"

// FrameworkPlugin defines the interface that all framework plugins must implement
type FrameworkPlugin interface {
	// Name returns the plugin name (e.g., "rails", "django")
	Name() string

	// Version returns the plugin version
	Version() string

	// Detect checks if this framework is present in the given project path
	Detect(projectPath string) bool

	// ParseLog parses a raw log line into a structured LogEntry
	ParseLog(line string) *models.LogEntry

	// AnalyzeQuery analyzes a SQL query and returns analysis results
	AnalyzeQuery(sql string, duration float64) *models.QueryAnalysis

	// GetDebugConfig returns the debug configuration for this framework
	GetDebugConfig() *DebugConfig

	// GetTestRunner returns the test runner configuration
	GetTestRunner() *TestRunner
}

// DebugConfig holds debugger configuration for a framework
type DebugConfig struct {
	// Type is the debugger type (e.g., "ruby-debug-ide", "debugpy", "xdebug")
	Type string

	// DefaultPort is the default port for the debugger
	DefaultPort int

	// LaunchCommand is the command to start the debugger
	LaunchCommand []string

	// Environment variables needed for debugging
	Environment map[string]string
}

// TestRunner holds test runner configuration for a framework
type TestRunner struct {
	// Name is the test framework name (e.g., "rspec", "pytest", "phpunit")
	Name string

	// Command is the command to run tests
	Command []string

	// WatchCommand is the command to run tests in watch mode
	WatchCommand []string

	// FilePattern is the glob pattern to match test files
	FilePattern string
}
