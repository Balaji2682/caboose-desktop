package plugin

import (
	"os"
	"path/filepath"
)

// Detector handles automatic framework detection
type Detector struct {
	registry *Registry
}

// NewDetector creates a new framework detector
func NewDetector(registry *Registry) *Detector {
	return &Detector{registry: registry}
}

// Detect automatically detects the framework used in the given project path
func (d *Detector) Detect(projectPath string) FrameworkPlugin {
	for _, plugin := range d.registry.List() {
		if plugin.Detect(projectPath) {
			return plugin
		}
	}
	return nil
}

// DetectAll returns all frameworks detected in the project
func (d *Detector) DetectAll(projectPath string) []FrameworkPlugin {
	var detected []FrameworkPlugin
	for _, plugin := range d.registry.List() {
		if plugin.Detect(projectPath) {
			detected = append(detected, plugin)
		}
	}
	return detected
}

// FileExists checks if a file exists at the given path
func FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// HasFile checks if a file exists in the project directory
func HasFile(projectPath, filename string) bool {
	return FileExists(filepath.Join(projectPath, filename))
}

// HasDirectory checks if a directory exists in the project
func HasDirectory(projectPath, dirname string) bool {
	info, err := os.Stat(filepath.Join(projectPath, dirname))
	return err == nil && info.IsDir()
}
