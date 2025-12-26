package rails

import (
	"os"
	"path/filepath"

	"github.com/caboose-desktop/internal/models"
	"github.com/caboose-desktop/internal/plugin"
)

// Plugin implements the Rails framework plugin
type Plugin struct {
	parser        *Parser
	query         *QueryAnalyzer
	testDetector  *TestDetector
	debugDetector *DebugDetector
	projectPath   string
}

// New creates a new Rails plugin instance
func New() *Plugin {
	return &Plugin{
		parser:        NewParser(),
		query:         NewQueryAnalyzer(),
		testDetector:  NewTestDetector(),
		debugDetector: NewDebugDetector(),
	}
}

// SetProjectPath sets the project path for context-aware operations
func (p *Plugin) SetProjectPath(path string) {
	p.projectPath = path
}

// Name returns the plugin name
func (p *Plugin) Name() string {
	return "rails"
}

// Version returns the plugin version
func (p *Plugin) Version() string {
	return "1.0.0"
}

// Detect checks if this is a Rails project
func (p *Plugin) Detect(projectPath string) bool {
	// Check for Gemfile with rails gem
	gemfilePath := filepath.Join(projectPath, "Gemfile")
	if _, err := os.Stat(gemfilePath); err == nil {
		content, err := os.ReadFile(gemfilePath)
		if err == nil {
			// Simple check for rails gem
			if containsRailsGem(string(content)) {
				return true
			}
		}
	}

	// Check for config/application.rb (Rails app structure)
	appConfigPath := filepath.Join(projectPath, "config", "application.rb")
	if _, err := os.Stat(appConfigPath); err == nil {
		return true
	}

	// Check for bin/rails
	binRailsPath := filepath.Join(projectPath, "bin", "rails")
	if _, err := os.Stat(binRailsPath); err == nil {
		return true
	}

	return false
}

// containsRailsGem checks if the Gemfile contains the rails gem
func containsRailsGem(content string) bool {
	// Simple substring check - could be more robust with regex
	return len(content) > 0 &&
		(contains(content, "gem 'rails'") ||
		 contains(content, "gem \"rails\"") ||
		 contains(content, "gem 'railties'") ||
		 contains(content, "gem \"railties\""))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && findSubstr(s, substr)
}

func findSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// ParseLog parses a Rails log line
func (p *Plugin) ParseLog(line string) *models.LogEntry {
	return p.parser.Parse(line)
}

// AnalyzeQuery analyzes a SQL query
func (p *Plugin) AnalyzeQuery(sql string, duration float64) *models.QueryAnalysis {
	return p.query.Analyze(sql, duration)
}

// GetDebugConfig returns the Rails debug configuration
func (p *Plugin) GetDebugConfig() *plugin.DebugConfig {
	if p.projectPath != "" {
		return p.debugDetector.GetDebugConfig(p.projectPath, 12345)
	}

	// Fallback to default if no project path set
	return &plugin.DebugConfig{
		Type:        "ruby-debug-ide",
		DefaultPort: 12345,
		LaunchCommand: []string{
			"bundle", "exec", "rdebug-ide",
			"--host", "127.0.0.1",
			"--port", "12345",
			"--dispatcher-port", "26162",
			"--",
			"bin/rails", "server",
		},
		Environment: map[string]string{
			"RAILS_ENV": "development",
		},
	}
}

// GetTestRunner returns the Rails test runner configuration
func (p *Plugin) GetTestRunner() *plugin.TestRunner {
	if p.projectPath != "" {
		return p.testDetector.GetTestRunner(p.projectPath)
	}

	// Fallback to RSpec as default
	return &plugin.TestRunner{
		Name:         "rspec",
		Command:      []string{"bundle", "exec", "rspec"},
		WatchCommand: []string{"bundle", "exec", "guard"},
		FilePattern:  "spec/**/*_spec.rb",
	}
}

// init registers the Rails plugin
func init() {
	plugin.Register(New())
}
