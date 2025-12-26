package rails

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/caboose-desktop/internal/plugin"
)

// TestDetector handles Rails test framework detection and parsing
type TestDetector struct {
	framework string // "rspec" or "minitest"
}

// NewTestDetector creates a new test detector
func NewTestDetector() *TestDetector {
	return &TestDetector{}
}

// DetectFramework detects which test framework is being used
func (td *TestDetector) DetectFramework(projectPath string) string {
	// Check for RSpec
	if td.hasRSpec(projectPath) {
		return "rspec"
	}

	// Check for Minitest
	if td.hasMinitest(projectPath) {
		return "minitest"
	}

	return ""
}

// hasRSpec checks if RSpec is configured
func (td *TestDetector) hasRSpec(projectPath string) bool {
	// Check for spec/ directory
	specDir := filepath.Join(projectPath, "spec")
	if info, err := os.Stat(specDir); err == nil && info.IsDir() {
		return true
	}

	// Check for .rspec file
	rspecFile := filepath.Join(projectPath, ".rspec")
	if _, err := os.Stat(rspecFile); err == nil {
		return true
	}

	// Check Gemfile for rspec
	gemfile := filepath.Join(projectPath, "Gemfile")
	if content, err := os.ReadFile(gemfile); err == nil {
		return strings.Contains(string(content), "rspec")
	}

	return false
}

// hasMinitest checks if Minitest is configured
func (td *TestDetector) hasMinitest(projectPath string) bool {
	// Check for test/ directory
	testDir := filepath.Join(projectPath, "test")
	if info, err := os.Stat(testDir); err == nil && info.IsDir() {
		return true
	}

	// Rails ships with Minitest by default
	return true
}

// GetTestRunner returns the appropriate test runner configuration
func (td *TestDetector) GetTestRunner(projectPath string) *plugin.TestRunner {
	framework := td.DetectFramework(projectPath)
	td.framework = framework

	switch framework {
	case "rspec":
		return &plugin.TestRunner{
			Name:         "rspec",
			Command:      []string{"bundle", "exec", "rspec"},
			WatchCommand: []string{"bundle", "exec", "guard"},
			FilePattern:  "spec/**/*_spec.rb",
		}
	case "minitest":
		return &plugin.TestRunner{
			Name:         "minitest",
			Command:      []string{"bundle", "exec", "rails", "test"},
			WatchCommand: []string{"bundle", "exec", "guard"},
			FilePattern:  "test/**/*_test.rb",
		}
	default:
		return nil
	}
}

// TestResult represents a single test result
type TestResult struct {
	Name     string
	File     string
	Line     int
	Status   string // "passed", "failed", "pending"
	Duration float64
	Error    string
}

// TestSummary represents a test run summary
type TestSummary struct {
	Total    int
	Passed   int
	Failed   int
	Pending  int
	Duration float64
	Results  []TestResult
}

// TestParser parses test output
type TestParser struct {
	framework        string
	rspecPattern     *regexp.Regexp
	rspecFailPattern *regexp.Regexp
	minitestPattern  *regexp.Regexp
}

// NewTestParser creates a new test parser
func NewTestParser(framework string) *TestParser {
	return &TestParser{
		framework: framework,
		// RSpec: "Finished in 1.23 seconds (files took 0.5 seconds to load)"
		rspecPattern: regexp.MustCompile(`Finished in ([\d\.]+) seconds`),
		// RSpec: "1) User#email validates format"
		rspecFailPattern: regexp.MustCompile(`^\s*\d+\)\s+(.+)`),
		// Minitest: "Finished in 1.23s, 10 runs/s, 15 assertions/s."
		minitestPattern: regexp.MustCompile(`Finished in ([\d\.]+)s`),
	}
}

// ParseOutput parses test output and extracts results
func (tp *TestParser) ParseOutput(output string) *TestSummary {
	summary := &TestSummary{
		Results: make([]TestResult, 0),
	}

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()

		if tp.framework == "rspec" {
			tp.parseRSpecLine(line, summary)
		} else if tp.framework == "minitest" {
			tp.parseMinitestLine(line, summary)
		}
	}

	return summary
}

// parseRSpecLine parses a single RSpec output line
func (tp *TestParser) parseRSpecLine(line string, summary *TestSummary) {
	// Check for duration
	if matches := tp.rspecPattern.FindStringSubmatch(line); matches != nil {
		// Parse duration
		// Duration is in matches[1]
	}

	// Check for test counts
	// "10 examples, 2 failures, 1 pending"
	if strings.Contains(line, "examples") {
		parts := strings.Split(line, ",")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if strings.Contains(part, "examples") {
				// Total count
			} else if strings.Contains(part, "failures") {
				// Failed count
			} else if strings.Contains(part, "pending") {
				// Pending count
			}
		}
	}
}

// parseMinitestLine parses a single Minitest output line
func (tp *TestParser) parseMinitestLine(line string, summary *TestSummary) {
	// Minitest format: "10 runs, 15 assertions, 2 failures, 0 errors, 1 skips"
	if strings.Contains(line, "runs") && strings.Contains(line, "assertions") {
		parts := strings.Split(line, ",")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if strings.Contains(part, "runs") {
				// Total count
			} else if strings.Contains(part, "failures") {
				// Failed count
			} else if strings.Contains(part, "errors") {
				// Error count
			} else if strings.Contains(part, "skips") {
				// Skipped count
			}
		}
	}
}

// IsSlowTest checks if a test is slow (>1 second)
func IsSlowTest(duration float64) bool {
	return duration > 1.0
}
