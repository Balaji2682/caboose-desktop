package rails

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/caboose-desktop/internal/plugin"
)

// DebugDetector handles Rails debugger detection and configuration
type DebugDetector struct{}

// NewDebugDetector creates a new debug detector
func NewDebugDetector() *DebugDetector {
	return &DebugDetector{}
}

// DetectDebugger detects which Ruby debugger is available
func (dd *DebugDetector) DetectDebugger(projectPath string) string {
	gemfile := filepath.Join(projectPath, "Gemfile")
	content, err := os.ReadFile(gemfile)
	if err != nil {
		return ""
	}

	gemfileStr := string(content)

	// Check for debug gem (Ruby 3.1+)
	if containsGem(gemfileStr, "debug") {
		return "debug"
	}

	// Check for ruby-debug-ide (classic)
	if containsGem(gemfileStr, "ruby-debug-ide") {
		return "ruby-debug-ide"
	}

	// Check for byebug (older Ruby)
	if containsGem(gemfileStr, "byebug") {
		return "byebug"
	}

	// Check for pry-byebug
	if containsGem(gemfileStr, "pry-byebug") {
		return "pry-byebug"
	}

	return ""
}

// containsGem checks if Gemfile contains a specific gem
func containsGem(gemfile, gem string) bool {
	return containsPattern(gemfile, fmt.Sprintf("gem '%s'", gem)) ||
		containsPattern(gemfile, fmt.Sprintf("gem \"%s\"", gem))
}

func containsPattern(s, pattern string) bool {
	return len(s) >= len(pattern) && findPattern(s, pattern)
}

func findPattern(s, pattern string) bool {
	for i := 0; i <= len(s)-len(pattern); i++ {
		if s[i:i+len(pattern)] == pattern {
			return true
		}
	}
	return false
}

// GetDebugConfig returns the debug configuration for the detected debugger
func (dd *DebugDetector) GetDebugConfig(projectPath string, port int) *plugin.DebugConfig {
	if port == 0 {
		port = 12345 // Default debug port
	}

	debugger := dd.DetectDebugger(projectPath)

	switch debugger {
	case "debug":
		// Ruby 3.1+ debug gem (uses DAP protocol natively)
		return &plugin.DebugConfig{
			Type:        "debug",
			DefaultPort: port,
			LaunchCommand: []string{
				"bundle", "exec", "rdbg",
				"--open",
				"--host", "127.0.0.1",
				"--port", fmt.Sprintf("%d", port),
				"--",
				"bin/rails", "server",
			},
			Environment: map[string]string{
				"RAILS_ENV": "development",
			},
		}

	case "ruby-debug-ide":
		// Classic ruby-debug-ide
		return &plugin.DebugConfig{
			Type:        "ruby-debug-ide",
			DefaultPort: port,
			LaunchCommand: []string{
				"bundle", "exec", "rdebug-ide",
				"--host", "127.0.0.1",
				"--port", fmt.Sprintf("%d", port),
				"--dispatcher-port", "26162",
				"--",
				"bin/rails", "server",
			},
			Environment: map[string]string{
				"RAILS_ENV": "development",
			},
		}

	case "byebug":
		// Byebug (doesn't support DAP directly, but can be used interactively)
		return &plugin.DebugConfig{
			Type:        "byebug",
			DefaultPort: 0, // Not applicable for byebug
			LaunchCommand: []string{
				"bundle", "exec", "byebug",
				"bin/rails", "server",
			},
			Environment: map[string]string{
				"RAILS_ENV": "development",
			},
		}

	case "pry-byebug":
		// Pry with byebug
		return &plugin.DebugConfig{
			Type:        "pry-byebug",
			DefaultPort: 0, // Interactive only
			LaunchCommand: []string{
				"bundle", "exec", "pry",
				"-r", "./config/environment",
			},
			Environment: map[string]string{
				"RAILS_ENV": "development",
			},
		}

	default:
		// Default to ruby-debug-ide if nothing else detected
		return &plugin.DebugConfig{
			Type:        "ruby-debug-ide",
			DefaultPort: port,
			LaunchCommand: []string{
				"bundle", "exec", "rdebug-ide",
				"--host", "127.0.0.1",
				"--port", fmt.Sprintf("%d", port),
				"--",
				"bin/rails", "server",
			},
			Environment: map[string]string{
				"RAILS_ENV": "development",
			},
		}
	}
}

// GetConsoleCommand returns the command to launch Rails console with debugger
func (dd *DebugDetector) GetConsoleCommand(projectPath string) []string {
	debugger := dd.DetectDebugger(projectPath)

	switch debugger {
	case "debug":
		return []string{"bundle", "exec", "rdbg", "-c", "--", "rails", "console"}
	case "pry-byebug":
		return []string{"bundle", "exec", "rails", "console"}
	default:
		return []string{"bundle", "exec", "rails", "console"}
	}
}

// DebuggerFeatures describes what features a debugger supports
type DebuggerFeatures struct {
	DAP               bool // Supports Debug Adapter Protocol
	Breakpoints       bool // Supports breakpoints
	StepControl       bool // Supports step in/over/out
	VariableInspection bool // Can inspect variables
	REPL              bool // Has interactive REPL
}

// GetDebuggerFeatures returns the features supported by the detected debugger
func (dd *DebugDetector) GetDebuggerFeatures(projectPath string) *DebuggerFeatures {
	debugger := dd.DetectDebugger(projectPath)

	switch debugger {
	case "debug":
		return &DebuggerFeatures{
			DAP:                true,
			Breakpoints:        true,
			StepControl:        true,
			VariableInspection: true,
			REPL:               true,
		}
	case "ruby-debug-ide":
		return &DebuggerFeatures{
			DAP:                true,
			Breakpoints:        true,
			StepControl:        true,
			VariableInspection: true,
			REPL:               false,
		}
	case "byebug":
		return &DebuggerFeatures{
			DAP:                false,
			Breakpoints:        true,
			StepControl:        true,
			VariableInspection: true,
			REPL:               true,
		}
	case "pry-byebug":
		return &DebuggerFeatures{
			DAP:                false,
			Breakpoints:        true,
			StepControl:        true,
			VariableInspection: true,
			REPL:               true,
		}
	default:
		return &DebuggerFeatures{
			DAP:                false,
			Breakpoints:        false,
			StepControl:        false,
			VariableInspection: false,
			REPL:               false,
		}
	}
}
