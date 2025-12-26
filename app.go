package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/caboose-desktop/internal/core/config"
	"github.com/caboose-desktop/internal/core/database"
	"github.com/caboose-desktop/internal/core/exceptions"
	"github.com/caboose-desktop/internal/core/metrics"
	"github.com/caboose-desktop/internal/core/process"
	"github.com/caboose-desktop/internal/core/security"
	"github.com/caboose-desktop/internal/core/ssh"
	"github.com/caboose-desktop/internal/core/workers"
	"github.com/caboose-desktop/internal/models"
	"github.com/caboose-desktop/internal/plugin"
	_ "github.com/caboose-desktop/internal/plugins/rails" // Auto-register Rails plugin
	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ProcessInfo represents process information sent to the frontend
type ProcessInfo struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
	Port        int       `json:"port,omitempty"`
	Command     string    `json:"command"`
	PID         int       `json:"pid,omitempty"`
	Uptime      string    `json:"uptime,omitempty"`
	CPU         float64   `json:"cpu"`
	Memory      int64     `json:"memory"`
	AutoRestart bool      `json:"autoRestart"`
	Color       string    `json:"color,omitempty"`
	StartedAt   time.Time `json:"startedAt,omitempty"`
}

// LogEntry represents a log line sent to the frontend
type LogEntry struct {
	ID        string    `json:"id"`
	Process   string    `json:"process"`
	Content   string    `json:"content"`
	Level     string    `json:"level"`
	Timestamp time.Time `json:"timestamp"`
}

// App struct holds the application state and Wails runtime context
type App struct {
	ctx              context.Context
	processManager   *process.Manager
	databaseManager  *database.Manager
	exceptionTracker *exceptions.Tracker
	metricsTracker   *metrics.Tracker
	workerPool       *workers.Pool
	rateLimiter      *security.RateLimiter
	sshManager       *ssh.Manager
	config           *config.Config
	projectDir       string
	logMu            sync.RWMutex
	logs             []LogEntry
	logBuffer        int
	logIdCounter     int64

	// Plugin Architecture
	pluginRegistry   *plugin.Registry
	pluginDetector   *plugin.Detector
	currentPlugin    plugin.FrameworkPlugin
	frameworkName    string
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Use the default registry which has plugins auto-registered via init()
	registry := plugin.DefaultRegistry
	detector := plugin.NewDetector(registry)

	return &App{
		logs:             make([]LogEntry, 0),
		logBuffer:        10000,
		databaseManager:  database.NewManager(),
		exceptionTracker: exceptions.NewTracker(),
		metricsTracker:   metrics.NewTracker(),
		workerPool:       workers.NewPool(0), // 0 = use CPU count
		rateLimiter:      security.NewRateLimiter(),
		pluginRegistry:   registry,
		pluginDetector:   detector,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize process manager
	a.processManager = process.NewManager()

	// Set up event callbacks
	a.processManager.OnStatusChange = func(name string, status models.ProcessStatus) {
		runtime.EventsEmit(a.ctx, "process:status", map[string]interface{}{
			"name":   name,
			"status": string(status),
		})
	}

	a.processManager.OnLog = func(name string, line string) {
		a.addLog(name, line, "info")
	}

	a.processManager.OnConsoleOutput = func(name string, data string) {
		// Emit console output event for interactive consoles
		runtime.EventsEmit(a.ctx, "console:output", map[string]interface{}{
			"process": name,
			"content": data,
		})
	}

	// Try to load project config from current directory or detect project
	a.loadProjectConfig()

	// Initialize SSH manager with config (after config is loaded)
	if a.config != nil {
		a.sshManager = ssh.NewManager(&a.config.SSH)

		// Set up SSH event callbacks
		a.sshManager.OnOutput = func(sessionID, data string) {
			runtime.EventsEmit(a.ctx, "ssh:output", map[string]interface{}{
				"sessionId": sessionID,
				"content":   data,
			})
		}

		a.sshManager.OnDisconnect = func(sessionID string) {
			runtime.EventsEmit(a.ctx, "ssh:disconnect", map[string]interface{}{
				"sessionId": sessionID,
			})
		}

		a.sshManager.OnHealthUpdate = func(sessionID string, health models.SSHHealth) {
			runtime.EventsEmit(a.ctx, "ssh:health", health)
		}
	}

	// Start metrics collection ticker
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if a.metricsTracker != nil {
				a.metricsTracker.RecordTimeSeriesPoint()
			}
		}
	}()
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.processManager != nil {
		a.processManager.Shutdown()
	}
	if a.databaseManager != nil {
		a.databaseManager.Disconnect()
	}
	if a.sshManager != nil {
		a.sshManager.Shutdown()
	}
	if a.workerPool != nil {
		// Give workers 5 seconds to finish
		a.workerPool.CloseWithTimeout(5 * time.Second)
	}
}

// loadProjectConfig loads configuration from the project directory
func (a *App) loadProjectConfig() error {
	// Try current working directory first
	cwd, err := os.Getwd()
	if err != nil {
		return err
	}

	a.projectDir = cwd
	cfg, err := config.Load(cwd)
	if err != nil {
		return err
	}

	a.config = cfg

	// Detect framework using plugin system
	a.detectFramework()

	// If no processes configured, try to detect and add defaults
	if len(cfg.Processes) == 0 {
		a.detectAndAddDefaultProcesses()
	} else {
		// Add configured processes to manager
		for name, procConfig := range cfg.Processes {
			procConfig.Name = name
			a.processManager.AddProcess(procConfig)
		}
	}

	return nil
}

// detectFramework detects the framework using the plugin system
func (a *App) detectFramework() {
	if a.projectDir == "" {
		return
	}

	// Detect framework
	detectedPlugin := a.pluginDetector.Detect(a.projectDir)
	if detectedPlugin != nil {
		a.currentPlugin = detectedPlugin
		a.frameworkName = detectedPlugin.Name()

		// If plugin supports SetProjectPath, call it
		if railsPlugin, ok := detectedPlugin.(*interface{ SetProjectPath(string) }); ok {
			(*railsPlugin).SetProjectPath(a.projectDir)
		}

		log.Printf("[Plugin] Detected framework: %s (v%s)",
			detectedPlugin.Name(), detectedPlugin.Version())

		// Emit framework detected event to frontend
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "framework:detected", map[string]interface{}{
				"name":    detectedPlugin.Name(),
				"version": detectedPlugin.Version(),
			})
		}
	} else {
		log.Printf("[Plugin] No framework detected, using generic mode")
		a.frameworkName = "generic"
	}
}

// detectAndAddDefaultProcesses detects project type and adds default processes
func (a *App) detectAndAddDefaultProcesses() {
	// Check for Rails project
	if _, err := os.Stat(filepath.Join(a.projectDir, "Gemfile")); err == nil {
		if _, err := os.Stat(filepath.Join(a.projectDir, "config", "application.rb")); err == nil {
			a.addRailsProcesses()
			return
		}
	}

	// Check for Node.js project
	if _, err := os.Stat(filepath.Join(a.projectDir, "package.json")); err == nil {
		a.addNodeProcesses()
		return
	}
}

// addRailsProcesses adds default Rails development processes
func (a *App) addRailsProcesses() {
	processes := []models.ProcessConfig{
		{
			Name:        "rails",
			Command:     "bundle",
			Args:        []string{"exec", "rails", "server", "-b", "0.0.0.0"},
			WorkingDir:  a.projectDir,
			AutoRestart: true,
			UsePTY:      true,
			Color:       "#ef4444", // red
		},
		{
			Name:        "sidekiq",
			Command:     "bundle",
			Args:        []string{"exec", "sidekiq"},
			WorkingDir:  a.projectDir,
			AutoRestart: true,
			UsePTY:      true,
			Color:       "#f97316", // orange
		},
	}

	// Check for webpack/esbuild/vite
	if _, err := os.Stat(filepath.Join(a.projectDir, "bin", "dev")); err == nil {
		// Using bin/dev (likely uses foreman/overmind)
	} else if _, err := os.Stat(filepath.Join(a.projectDir, "config", "webpack")); err == nil {
		processes = append(processes, models.ProcessConfig{
			Name:        "webpack",
			Command:     "bin/webpack-dev-server",
			WorkingDir:  a.projectDir,
			AutoRestart: true,
			UsePTY:      true,
			Color:       "#3b82f6", // blue
		})
	} else if _, err := os.Stat(filepath.Join(a.projectDir, "esbuild.config.mjs")); err == nil {
		processes = append(processes, models.ProcessConfig{
			Name:        "esbuild",
			Command:     "node",
			Args:        []string{"esbuild.config.mjs", "--watch"},
			WorkingDir:  a.projectDir,
			AutoRestart: true,
			UsePTY:      true,
			Color:       "#eab308", // yellow
		})
	}

	// Check for Tailwind CSS
	if _, err := os.Stat(filepath.Join(a.projectDir, "tailwind.config.js")); err == nil {
		processes = append(processes, models.ProcessConfig{
			Name:       "tailwind",
			Command:    "npx",
			Args:       []string{"tailwindcss", "-i", "./app/assets/stylesheets/application.tailwind.css", "-o", "./app/assets/builds/application.css", "--watch"},
			WorkingDir: a.projectDir,
			UsePTY:     true,
			Color:      "#06b6d4", // cyan
		})
	}

	// Add processes to manager and save to config
	a.addAndSaveProcesses(processes)
}

// addNodeProcesses adds default Node.js development processes
func (a *App) addNodeProcesses() {
	processes := []models.ProcessConfig{
		{
			Name:        "dev",
			Command:     "npm",
			Args:        []string{"run", "dev"},
			WorkingDir:  a.projectDir,
			AutoRestart: true,
			UsePTY:      true,
			Color:       "#22c55e", // green
		},
	}

	// Add processes to manager and save to config
	a.addAndSaveProcesses(processes)
}

// addAndSaveProcesses adds processes to manager and saves to config file
func (a *App) addAndSaveProcesses(processes []models.ProcessConfig) {
	if a.config.Processes == nil {
		a.config.Processes = make(map[string]models.ProcessConfig)
	}

	for _, proc := range processes {
		a.processManager.AddProcess(proc)
		a.config.Processes[proc.Name] = proc
	}

	// Save to config file for persistence
	if err := a.config.Save(a.projectDir); err != nil {
		fmt.Printf("Warning: failed to save config: %v\n", err)
	}
}

// GetProcesses returns a list of all configured processes
func (a *App) GetProcesses() []ProcessInfo {
	if a.processManager == nil {
		return []ProcessInfo{}
	}

	processes := a.processManager.GetAllProcesses()
	result := make([]ProcessInfo, len(processes))

	for i, p := range processes {
		uptime := ""
		if p.StartedAt != nil {
			uptime = formatUptime(time.Since(*p.StartedAt))
		}

		result[i] = ProcessInfo{
			ID:          p.Name,
			Name:        p.Name,
			Type:        detectProcessType(p.Command),
			Status:      string(p.Status),
			Command:     formatCommand(p.Command, p.Args),
			PID:         p.PID,
			Uptime:      uptime,
			AutoRestart: p.AutoRestart,
			Color:       p.Color,
		}

		if p.StartedAt != nil {
			result[i].StartedAt = *p.StartedAt
		}
	}

	return result
}

// GetProcess returns information about a specific process
func (a *App) GetProcess(name string) (*ProcessInfo, error) {
	if a.processManager == nil {
		return nil, fmt.Errorf("process manager not initialized")
	}

	p, exists := a.processManager.GetProcess(name)
	if !exists {
		return nil, fmt.Errorf("process %s not found", name)
	}

	uptime := ""
	if p.StartedAt != nil {
		uptime = formatUptime(time.Since(*p.StartedAt))
	}

	info := &ProcessInfo{
		ID:          p.Name,
		Name:        p.Name,
		Type:        detectProcessType(p.Command),
		Status:      string(p.Status),
		Command:     formatCommand(p.Command, p.Args),
		PID:         p.PID,
		Uptime:      uptime,
		AutoRestart: p.AutoRestart,
		Color:       p.Color,
	}

	if p.StartedAt != nil {
		info.StartedAt = *p.StartedAt
	}

	return info, nil
}

// StartProcess starts a process by name
func (a *App) StartProcess(name string) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	err := a.processManager.Start(name)
	if err != nil {
		runtime.EventsEmit(a.ctx, "process:error", map[string]interface{}{
			"name":  name,
			"error": err.Error(),
		})
		return err
	}

	return nil
}

// StopProcess stops a process by name
func (a *App) StopProcess(name string) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	err := a.processManager.Stop(name)
	if err != nil {
		runtime.EventsEmit(a.ctx, "process:error", map[string]interface{}{
			"name":  name,
			"error": err.Error(),
		})
		return err
	}

	return nil
}

// RestartProcess restarts a process by name
func (a *App) RestartProcess(name string) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	err := a.processManager.Restart(name)
	if err != nil {
		runtime.EventsEmit(a.ctx, "process:error", map[string]interface{}{
			"name":  name,
			"error": err.Error(),
		})
		return err
	}

	return nil
}

// StartAllProcesses starts all configured processes
func (a *App) StartAllProcesses() error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	processes := a.processManager.GetAllProcesses()
	var lastErr error

	for _, p := range processes {
		if p.Status != models.ProcessStatusRunning {
			if err := a.processManager.Start(p.Name); err != nil {
				lastErr = err
			}
		}
	}

	return lastErr
}

// StopAllProcesses stops all running processes
func (a *App) StopAllProcesses() error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	processes := a.processManager.GetAllProcesses()
	var lastErr error

	for _, p := range processes {
		if p.Status == models.ProcessStatusRunning {
			if err := a.processManager.Stop(p.Name); err != nil {
				lastErr = err
			}
		}
	}

	return lastErr
}

// AddProcess adds a new process configuration and saves to config file
func (a *App) AddProcess(config map[string]interface{}) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	// Rate limit process creation
	if !a.rateLimiter.Allow("process") {
		return fmt.Errorf("rate limit exceeded: too many process operations")
	}

	name, _ := config["name"].(string)
	command, _ := config["command"].(string)
	argsRaw, _ := config["args"].([]interface{})
	workingDir, _ := config["workingDir"].(string)
	autoRestart, _ := config["autoRestart"].(bool)
	usePTY, _ := config["usePty"].(bool)
	color, _ := config["color"].(string)

	// SECURITY: Validate command is in whitelist
	if err := security.ValidateCommand(command); err != nil {
		log.Printf("[SECURITY] Blocked command: %s", command)
		return fmt.Errorf("security error: %w", err)
	}

	args := make([]string, len(argsRaw))
	for i, arg := range argsRaw {
		args[i], _ = arg.(string)
	}

	// SECURITY: Validate arguments don't contain shell metacharacters
	if err := security.ValidateArguments(args); err != nil {
		log.Printf("[SECURITY] Blocked dangerous arguments: %v", args)
		return fmt.Errorf("security error: %w", err)
	}

	if workingDir == "" {
		workingDir = a.projectDir
	}

	// SECURITY: Validate working directory path
	validatedDir, err := security.ValidateProjectPath(workingDir)
	if err != nil {
		log.Printf("[SECURITY] Invalid working directory: %s", workingDir)
		return fmt.Errorf("invalid working directory: %w", err)
	}

	procConfig := models.ProcessConfig{
		Name:        name,
		Command:     command,
		Args:        args,
		WorkingDir:  validatedDir,
		AutoRestart: autoRestart,
		UsePTY:      usePTY,
		Color:       color,
	}

	// Log process creation for audit
	log.Printf("[AUDIT] AddProcess: name=%s, command=%s, args=%v", name, command, args)

	// Add to process manager
	if err := a.processManager.AddProcess(procConfig); err != nil {
		return err
	}

	// Save to config file for persistence
	if a.config != nil {
		if a.config.Processes == nil {
			a.config.Processes = make(map[string]models.ProcessConfig)
		}
		a.config.Processes[name] = procConfig
		if err := a.config.Save(a.projectDir); err != nil {
			// Log error but don't fail - process is still added to manager
			log.Printf("Warning: failed to save config: %v", err)
		}
	}

	return nil
}

// RemoveProcess removes a process configuration and saves to config file
func (a *App) RemoveProcess(name string) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	// Stop the process first if running
	p, exists := a.processManager.GetProcess(name)
	if exists && p.Status == models.ProcessStatusRunning {
		a.processManager.Stop(name)
	}

	// Remove from process manager
	if err := a.processManager.RemoveProcess(name); err != nil {
		return err
	}

	// Remove from config file for persistence
	if a.config != nil && a.config.Processes != nil {
		delete(a.config.Processes, name)
		if err := a.config.Save(a.projectDir); err != nil {
			// Log error but don't fail - process is still removed from manager
			fmt.Printf("Warning: failed to save config: %v\n", err)
		}
	}

	return nil
}

// WriteToPTY writes input to a process PTY (for interactive terminals)
func (a *App) WriteToPTY(name string, input string) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	// Rate limit PTY writes
	if !a.rateLimiter.Allow("pty") {
		log.Printf("[SECURITY] Rate limit exceeded for PTY write")
		return fmt.Errorf("rate limit exceeded: too many PTY write requests")
	}

	// SECURITY: Sanitize PTY input
	sanitized, err := security.SanitizePTYInput(input)
	if err != nil {
		log.Printf("[SECURITY] Blocked dangerous PTY input: %v", err)
		return fmt.Errorf("security error: %w", err)
	}

	// Log PTY writes for audit
	log.Printf("[AUDIT] WriteToPTY: process=%s, input=%q", name, sanitized[:min(50, len(sanitized))])

	return a.processManager.WriteToPTY(name, []byte(sanitized))
}

// ResizePTY resizes a process PTY window
func (a *App) ResizePTY(name string, rows, cols int) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	return a.processManager.ResizePTY(name, uint16(rows), uint16(cols))
}

// addLog adds a log entry and emits event to frontend
func (a *App) addLog(processName, content, level string) {
	a.logMu.Lock()
	defer a.logMu.Unlock()

	a.logIdCounter++
	entry := LogEntry{
		ID:        fmt.Sprintf("%d", a.logIdCounter),
		Process:   processName,
		Content:   content,
		Level:     level,
		Timestamp: time.Now(),
	}

	a.logs = append(a.logs, entry)

	// Trim logs if buffer exceeded
	if len(a.logs) > a.logBuffer {
		a.logs = a.logs[len(a.logs)-a.logBuffer:]
	}

	// Emit log event to frontend
	runtime.EventsEmit(a.ctx, "process:log", entry)
}

// GetLogs returns logs with optional filtering
func (a *App) GetLogs(filter map[string]interface{}) []LogEntry {
	a.logMu.RLock()
	defer a.logMu.RUnlock()

	processFilter, _ := filter["process"].(string)
	levelFilter, _ := filter["level"].(string)
	limitRaw, _ := filter["limit"].(float64)
	limit := int(limitRaw)
	if limit == 0 {
		limit = 100
	}

	result := make([]LogEntry, 0, limit)

	// Iterate backwards for most recent logs
	for i := len(a.logs) - 1; i >= 0 && len(result) < limit; i-- {
		log := a.logs[i]

		if processFilter != "" && log.Process != processFilter {
			continue
		}
		if levelFilter != "" && log.Level != levelFilter {
			continue
		}

		result = append(result, log)
	}

	// Reverse to get chronological order
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	return result
}

// ClearLogs clears all stored logs
func (a *App) ClearLogs() error {
	a.logMu.Lock()
	defer a.logMu.Unlock()

	a.logs = make([]LogEntry, 0)
	runtime.EventsEmit(a.ctx, "logs:cleared", nil)
	return nil
}

// GetProjectInfo returns information about the current project
func (a *App) GetProjectInfo() map[string]interface{} {
	info := map[string]interface{}{
		"directory": a.projectDir,
	}

	if a.config != nil {
		info["framework"] = a.config.Framework
		info["projectName"] = a.config.ProjectName
	}

	return info
}

// SetProjectDirectory changes the project directory
func (a *App) SetProjectDirectory(dir string) error {
	// SECURITY: Validate project directory path
	validatedDir, err := security.ValidateProjectPath(dir)
	if err != nil {
		log.Printf("[SECURITY] Invalid project directory: %s, error: %v", dir, err)
		return fmt.Errorf("invalid project directory: %w", err)
	}

	// Log directory change for audit
	log.Printf("[AUDIT] SetProjectDirectory: old=%s, new=%s", a.projectDir, validatedDir)

	// Stop all running processes first
	if a.processManager != nil {
		a.processManager.Shutdown()
	}

	// Reinitialize
	a.processManager = process.NewManager()
	a.processManager.OnStatusChange = func(name string, status models.ProcessStatus) {
		runtime.EventsEmit(a.ctx, "process:status", map[string]interface{}{
			"name":   name,
			"status": string(status),
		})
	}
	a.processManager.OnLog = func(name string, line string) {
		a.addLog(name, line, "info")
	}

	a.projectDir = validatedDir
	return a.loadProjectConfig()
}

// SelectProjectDirectory opens a directory picker dialog
func (a *App) SelectProjectDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Project Directory",
	})
	if err != nil {
		return "", err
	}

	if dir != "" {
		if err := a.SetProjectDirectory(dir); err != nil {
			return "", err
		}
	}

	return dir, nil
}

// Helper functions

func formatUptime(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh", days, hours)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	return fmt.Sprintf("%dm", minutes)
}

func formatCommand(cmd string, args []string) string {
	result := cmd
	for _, arg := range args {
		result += " " + arg
	}
	return result
}

func detectProcessType(command string) string {
	switch command {
	case "bundle", "rails", "ruby":
		return "rails"
	case "npm", "yarn", "pnpm", "node":
		return "frontend"
	case "sidekiq", "good_job", "delayed_job":
		return "worker"
	case "postgres", "mysql", "redis":
		return "database"
	case "docker", "docker-compose":
		return "docker"
	default:
		return "custom"
	}
}

// StartRailsConsole starts an interactive Rails console process
func (a *App) StartRailsConsole() error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	// Stop existing console if running
	if p, exists := a.processManager.GetProcess("rails-console"); exists {
		if p.Status == models.ProcessStatusRunning {
			a.processManager.Stop("rails-console")
		}
		a.processManager.RemoveProcess("rails-console")
	}

	// Create rails console config
	config := models.ProcessConfig{
		Name:       "rails-console",
		Command:    "bundle",
		Args:       []string{"exec", "rails", "console"},
		WorkingDir: a.projectDir,
		UsePTY:     true,
		Color:      "#ef4444", // red
	}

	// Add and start
	if err := a.processManager.AddProcess(config); err != nil {
		return err
	}

	return a.processManager.Start("rails-console")
}

// StopRailsConsole stops the Rails console process
func (a *App) StopRailsConsole() error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	return a.processManager.Stop("rails-console")
}

// IsRailsConsoleRunning checks if Rails console is running
func (a *App) IsRailsConsoleRunning() bool {
	if a.processManager == nil {
		return false
	}

	p, exists := a.processManager.GetProcess("rails-console")
	return exists && p.Status == models.ProcessStatusRunning
}

// WriteToRailsConsole writes input to the Rails console PTY
func (a *App) WriteToRailsConsole(input string) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	return a.processManager.WriteToPTY("rails-console", []byte(input))
}

// ResizeRailsConsole resizes the Rails console PTY window
func (a *App) ResizeRailsConsole(rows, cols int) error {
	if a.processManager == nil {
		return fmt.Errorf("process manager not initialized")
	}

	return a.processManager.ResizePTY("rails-console", uint16(rows), uint16(cols))
}

// ================== Database Methods ==================

// ConnectDatabase connects to a database
func (a *App) ConnectDatabase(configMap map[string]interface{}) error {
	if a.databaseManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	sslMode := getString(configMap, "sslMode")

	// SECURITY: Validate SSL mode
	if err := security.ValidateSSLMode(sslMode); err != nil {
		log.Printf("[SECURITY] Invalid SSL mode: %s", sslMode)
		return fmt.Errorf("security error: %w", err)
	}

	config := database.ConnectionConfig{
		Driver:   getString(configMap, "driver"),
		Host:     getString(configMap, "host"),
		Port:     getInt(configMap, "port"),
		User:     getString(configMap, "user"),
		Password: getString(configMap, "password"),
		Database: getString(configMap, "database"),
		SSLMode:  sslMode,
		Name:     getString(configMap, "name"),
	}

	// Log connection attempt (without password) for audit
	log.Printf("[AUDIT] ConnectDatabase: driver=%s, host=%s, database=%s, ssl=%s",
		config.Driver, config.Host, config.Database, config.SSLMode)

	if err := a.databaseManager.Connect(config); err != nil {
		// Sanitize error before returning
		log.Printf("[ERROR] Database connection failed: %v", err)
		return security.SanitizeError(err, false)
	}

	// Clear password from memory
	config.Password = ""

	// Emit connection status event
	runtime.EventsEmit(a.ctx, "database:connected", a.databaseManager.GetStatus())

	return nil
}

// DisconnectDatabase disconnects from the database
func (a *App) DisconnectDatabase() error {
	if a.databaseManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	err := a.databaseManager.Disconnect()

	// Emit disconnection event
	runtime.EventsEmit(a.ctx, "database:disconnected", nil)

	return err
}

// GetDatabaseStatus returns the current database connection status
func (a *App) GetDatabaseStatus() database.DatabaseStatus {
	if a.databaseManager == nil {
		return database.DatabaseStatus{Connected: false}
	}

	return a.databaseManager.GetStatus()
}

// GetDatabaseTables returns all tables in the connected database
func (a *App) GetDatabaseTables() ([]database.TableInfo, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	return a.databaseManager.GetTables()
}

// GetTableColumns returns columns for a specific table
func (a *App) GetTableColumns(tableName string) ([]database.ColumnInfo, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	return a.databaseManager.GetColumns(tableName)
}

// ExecuteDatabaseQuery executes a SQL query (using worker pool for heavy queries)
func (a *App) ExecuteDatabaseQuery(query string, limit int) (*database.QueryResult, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	// Rate limit database queries
	if !a.rateLimiter.Allow("query") {
		log.Printf("[SECURITY] Rate limit exceeded for query")
		return nil, fmt.Errorf("rate limit exceeded: too many query requests")
	}

	// SECURITY: Check if query is destructive
	if security.IsDestructiveQuery(query) {
		log.Printf("[SECURITY] Destructive query detected: %s", query[:min(50, len(query))])
		return nil, fmt.Errorf("destructive query requires explicit confirmation (use ConfirmAndExecuteQuery instead)")
	}

	// Log query execution for audit
	log.Printf("[AUDIT] ExecuteQuery: query=%s...", query[:min(50, len(query))])

	// For heavy queries, use worker pool
	if limit > 1000 || len(query) > 500 {
		result := a.workerPool.SubmitAndWait("query-exec", func(ctx context.Context) (interface{}, error) {
			return a.databaseManager.ExecuteQuery(query, limit)
		})

		if result.Error != nil {
			// Sanitize error before returning
			log.Printf("[ERROR] Query execution failed: %v", result.Error)
			return nil, security.SanitizeError(result.Error, false)
		}

		return result.Data.(*database.QueryResult), nil
	}

	result, err := a.databaseManager.ExecuteQuery(query, limit)
	if err != nil {
		log.Printf("[ERROR] Query execution failed: %v", err)
		return nil, security.SanitizeError(err, false)
	}

	return result, nil
}

// ConfirmAndExecuteQuery executes a destructive query after explicit confirmation
func (a *App) ConfirmAndExecuteQuery(query string, limit int, confirmed bool) (*database.QueryResult, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	// Rate limit
	if !a.rateLimiter.Allow("query") {
		return nil, fmt.Errorf("rate limit exceeded")
	}

	// Require explicit confirmation
	if !confirmed {
		return nil, fmt.Errorf("destructive query requires confirmation")
	}

	// Log destructive query execution
	log.Printf("[AUDIT] DESTRUCTIVE QUERY CONFIRMED: %s", query)

	result, err := a.databaseManager.ExecuteQuery(query, limit)
	if err != nil {
		log.Printf("[ERROR] Destructive query failed: %v", err)
		return nil, security.SanitizeError(err, false)
	}

	return result, nil
}

// Helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ExplainDatabaseQuery returns the execution plan for a query (using worker pool)
func (a *App) ExplainDatabaseQuery(query string) (*database.ExplainResult, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	// Use worker pool for EXPLAIN analysis
	result := a.workerPool.SubmitAndWait("query-explain", func(ctx context.Context) (interface{}, error) {
		return a.databaseManager.ExplainQuery(query)
	})

	if result.Error != nil {
		return nil, result.Error
	}

	return result.Data.(*database.ExplainResult), nil
}

// SaveDatabaseQuery saves a query to history
func (a *App) SaveDatabaseQuery(name, sql string) *database.SavedQuery {
	if a.databaseManager == nil {
		return nil
	}

	query := a.databaseManager.SaveQuery(name, sql)

	// Also save to config for persistence
	if a.config != nil {
		a.config.Database.SavedQueries = append(a.config.Database.SavedQueries, config.SavedQuery{
			ID:        query.ID,
			Name:      query.Name,
			SQL:       query.SQL,
			CreatedAt: query.CreatedAt,
		})
		a.config.Save(a.projectDir)
	}

	return query
}

// GetSavedQueries returns all saved queries
func (a *App) GetSavedQueries() []database.SavedQuery {
	if a.databaseManager == nil {
		return []database.SavedQuery{}
	}

	return a.databaseManager.GetQueryHistory()
}

// DeleteSavedQuery deletes a saved query
func (a *App) DeleteSavedQuery(id string) error {
	if a.databaseManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	err := a.databaseManager.DeleteQuery(id)
	if err != nil {
		return err
	}

	// Also remove from config
	if a.config != nil {
		newQueries := make([]config.SavedQuery, 0)
		for _, q := range a.config.Database.SavedQueries {
			if q.ID != id {
				newQueries = append(newQueries, q)
			}
		}
		a.config.Database.SavedQueries = newQueries
		a.config.Save(a.projectDir)
	}

	return nil
}

// GetSavedConnections returns saved database connections (without passwords)
func (a *App) GetSavedConnections() []config.DatabaseConnection {
	if a.config == nil {
		return []config.DatabaseConnection{}
	}

	return a.config.Database.Connections
}

// SaveDatabaseConnection saves a database connection config
func (a *App) SaveDatabaseConnection(connMap map[string]interface{}) error {
	if a.config == nil {
		return fmt.Errorf("config not initialized")
	}

	conn := config.DatabaseConnection{
		Name:     getString(connMap, "name"),
		Driver:   getString(connMap, "driver"),
		Host:     getString(connMap, "host"),
		Port:     getInt(connMap, "port"),
		User:     getString(connMap, "user"),
		Database: getString(connMap, "database"),
		SSLMode:  getString(connMap, "sslMode"),
	}

	// Check if connection with same name exists, update it
	found := false
	for i, c := range a.config.Database.Connections {
		if c.Name == conn.Name {
			a.config.Database.Connections[i] = conn
			found = true
			break
		}
	}

	if !found {
		a.config.Database.Connections = append(a.config.Database.Connections, conn)
	}

	return a.config.Save(a.projectDir)
}

// DeleteSavedConnection deletes a saved database connection
func (a *App) DeleteSavedConnection(name string) error {
	if a.config == nil {
		return fmt.Errorf("config not initialized")
	}

	newConns := make([]config.DatabaseConnection, 0)
	for _, c := range a.config.Database.Connections {
		if c.Name != name {
			newConns = append(newConns, c)
		}
	}
	a.config.Database.Connections = newConns

	return a.config.Save(a.projectDir)
}

// GetQueryStatistics returns collected query execution statistics
func (a *App) GetQueryStatistics() []database.QueryStatistic {
	if a.databaseManager == nil {
		return []database.QueryStatistic{}
	}

	return a.databaseManager.GetQueryStatistics()
}

// ClearQueryStatistics clears all query statistics
func (a *App) ClearQueryStatistics() error {
	if a.databaseManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	a.databaseManager.ClearQueryStatistics()
	return nil
}

// GetDatabaseHealth returns database health metrics (using worker pool)
func (a *App) GetDatabaseHealth() (*database.DatabaseHealth, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	// Use worker pool for health checks (can be expensive)
	result := a.workerPool.SubmitAndWait("db-health", func(ctx context.Context) (interface{}, error) {
		return a.databaseManager.GetDatabaseHealth()
	})

	if result.Error != nil {
		return nil, result.Error
	}

	return result.Data.(*database.DatabaseHealth), nil
}

// GetExceptions returns all tracked exceptions
func (a *App) GetExceptions() []*exceptions.Exception {
	if a.exceptionTracker == nil {
		return []*exceptions.Exception{}
	}

	return a.exceptionTracker.GetExceptions()
}

// ResolveException marks an exception as resolved
func (a *App) ResolveException(id string) error {
	if a.exceptionTracker == nil {
		return fmt.Errorf("exception tracker not initialized")
	}

	return a.exceptionTracker.ResolveException(id)
}

// IgnoreException marks an exception as ignored
func (a *App) IgnoreException(id string) error {
	if a.exceptionTracker == nil {
		return fmt.Errorf("exception tracker not initialized")
	}

	return a.exceptionTracker.IgnoreException(id)
}

// ClearExceptions clears all tracked exceptions
func (a *App) ClearExceptions() error {
	if a.exceptionTracker == nil {
		return fmt.Errorf("exception tracker not initialized")
	}

	a.exceptionTracker.ClearExceptions()
	return nil
}

// GetMetrics returns application metrics
func (a *App) GetMetrics() (*metrics.Metrics, error) {
	if a.metricsTracker == nil {
		return nil, fmt.Errorf("metrics tracker not initialized")
	}

	return a.metricsTracker.GetMetrics(), nil
}

// ResetMetrics resets all metrics
func (a *App) ResetMetrics() error {
	if a.metricsTracker == nil {
		return fmt.Errorf("metrics tracker not initialized")
	}

	a.metricsTracker.Reset()
	return nil
}

// GetWorkerPoolStats returns worker pool statistics
func (a *App) GetWorkerPoolStats() map[string]interface{} {
	if a.workerPool == nil {
		return map[string]interface{}{}
	}

	stats := a.workerPool.Stats()
	return map[string]interface{}{
		"tasksSubmitted":  stats.TasksSubmitted,
		"tasksCompleted":  stats.TasksCompleted,
		"tasksFailed":     stats.TasksFailed,
		"avgDuration":     stats.AverageDuration.Milliseconds(),
		"activeWorkers":   stats.ActiveWorkers,
	}
}

// ============================================================================
// Plugin Architecture API
// ============================================================================

// GetFrameworkInfo returns information about the detected framework
func (a *App) GetFrameworkInfo() map[string]interface{} {
	if a.currentPlugin == nil {
		return map[string]interface{}{
			"detected": false,
			"name":     "generic",
			"version":  "N/A",
		}
	}

	return map[string]interface{}{
		"detected": true,
		"name":     a.currentPlugin.Name(),
		"version":  a.currentPlugin.Version(),
	}
}

// GetAvailablePlugins returns a list of all registered plugins
func (a *App) GetAvailablePlugins() []map[string]interface{} {
	plugins := a.pluginRegistry.List()
	result := make([]map[string]interface{}, 0, len(plugins))

	for _, p := range plugins {
		result = append(result, map[string]interface{}{
			"name":    p.Name(),
			"version": p.Version(),
		})
	}

	return result
}

// GetDebugConfiguration returns the debug configuration for the current framework
func (a *App) GetDebugConfiguration() map[string]interface{} {
	if a.currentPlugin == nil {
		return map[string]interface{}{
			"available": false,
		}
	}

	debugConfig := a.currentPlugin.GetDebugConfig()
	if debugConfig == nil {
		return map[string]interface{}{
			"available": false,
		}
	}

	return map[string]interface{}{
		"available":      true,
		"type":           debugConfig.Type,
		"defaultPort":    debugConfig.DefaultPort,
		"launchCommand":  debugConfig.LaunchCommand,
		"environment":    debugConfig.Environment,
	}
}

// GetTestRunner returns the test runner configuration for the current framework
func (a *App) GetTestRunner() map[string]interface{} {
	if a.currentPlugin == nil {
		return map[string]interface{}{
			"available": false,
		}
	}

	testRunner := a.currentPlugin.GetTestRunner()
	if testRunner == nil {
		return map[string]interface{}{
			"available": false,
		}
	}

	return map[string]interface{}{
		"available":    true,
		"name":         testRunner.Name,
		"command":      testRunner.Command,
		"watchCommand": testRunner.WatchCommand,
		"filePattern":  testRunner.FilePattern,
	}
}

// ParseLogWithPlugin parses a log line using the current plugin
func (a *App) ParseLogWithPlugin(line string) *models.LogEntry {
	if a.currentPlugin != nil {
		return a.currentPlugin.ParseLog(line)
	}

	// Fallback to generic parsing
	return &models.LogEntry{
		Raw:       line,
		Message:   line,
		Timestamp: time.Now(),
		Level:     models.LogLevelInfo,
	}
}

// ============================================================================
// Query Analysis & Recommendations
// ============================================================================

// GetSmartRecommendations generates intelligent query optimization recommendations
func (a *App) GetSmartRecommendations() ([]models.SmartRecommendation, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	// Get query statistics
	stats := a.databaseManager.GetQueryStatistics()

	// Get N+1 warnings (if Rails plugin is available)
	n1Warnings := []models.N1Warning{}
	// TODO: Implement N+1 warning collection from Rails plugin

	// Get EXPLAIN results for problematic queries
	explainResults := make(map[string]*database.ExplainResult)
	// TODO: Could cache EXPLAIN results from previous analyses

	// Generate recommendations using the Rails recommendation engine
	// For now, create a simple recommendation engine instance
	// In a full implementation, this would be part of the Rails plugin
	recommendations := []models.SmartRecommendation{}

	// Generate basic recommendations from query stats
	for _, stat := range stats {
		if stat.Issue == "n+1" {
			// Create N+1 recommendation
			rec := models.SmartRecommendation{
				ID:          stat.ID,
				Type:        "n+1",
				Severity:    "high",
				Title:       "N+1 Query Pattern Detected",
				Description: fmt.Sprintf("Query executed %d times with fingerprint: %s", stat.Count, stat.Fingerprint),
				Impact: models.ImpactEstimate{
					QueryTimeReduction:  70,
					QueryCountReduction: stat.Count - 2,
					TotalTimeSaved:      stat.TotalTime * 0.7,
					ConfidenceScore:     75,
				},
				AffectedQueries: []string{stat.ID},
				Fix: models.RecommendationFix{
					Type:        "rails-code",
					Code:        "Model.includes(:association)",
					Explanation: "Use eager loading to reduce multiple queries to 1-2 queries",
				},
				EstimatedEffort: "easy",
			}
			recommendations = append(recommendations, rec)
		}

		if stat.AvgTime > 100 {
			// Create slow query recommendation
			severity := "medium"
			if stat.AvgTime > 500 {
				severity = "high"
			}

			rec := models.SmartRecommendation{
				ID:          stat.ID + "-slow",
				Type:        "slow",
				Severity:    severity,
				Title:       fmt.Sprintf("Slow Query (%.1fms avg)", stat.AvgTime),
				Description: fmt.Sprintf("Query taking longer than expected. Executed %d times.", stat.Count),
				Impact: models.ImpactEstimate{
					QueryTimeReduction:  50,
					QueryCountReduction: 0,
					TotalTimeSaved:      stat.TotalTime * 0.5,
					ConfidenceScore:     60,
				},
				AffectedQueries: []string{stat.ID},
				Fix: models.RecommendationFix{
					Type:        "query-rewrite",
					Code:        "Run EXPLAIN to identify bottlenecks",
					Explanation: "Analyze query execution plan and add appropriate indexes",
				},
				EstimatedEffort: "moderate",
			}
			recommendations = append(recommendations, rec)
		}
	}

	return recommendations, nil
}

// GetN1Warnings returns detected N+1 query patterns
func (a *App) GetN1Warnings() ([]models.N1Warning, error) {
	// TODO: Implement N+1 warning collection from Rails plugin
	// For now, return warnings inferred from query statistics
	warnings := []models.N1Warning{}

	if a.databaseManager == nil {
		return warnings, nil
	}

	stats := a.databaseManager.GetQueryStatistics()
	for _, stat := range stats {
		if stat.Issue == "n+1" {
			warning := models.N1Warning{
				Fingerprint:   stat.Fingerprint,
				Table:         "", // TODO: Extract from SQL
				Count:         stat.Count,
				TotalDuration: stat.TotalTime,
				Confidence:    75,
				Suggestion:    "Use .includes() or .joins() for eager loading",
				Examples:      []string{stat.SQL},
			}
			warnings = append(warnings, warning)
		}
	}

	return warnings, nil
}

// GetRequestQueryGroups returns queries grouped by HTTP request
func (a *App) GetRequestQueryGroups(limit int) ([]models.RequestQueryGroup, error) {
	// TODO: Implement request-level query grouping
	// This requires tracking request IDs in the Rails log parser
	groups := []models.RequestQueryGroup{}
	return groups, nil
}

// GetQueryDistribution returns query distribution analysis
func (a *App) GetQueryDistribution() (*models.QueryDistribution, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	stats := a.databaseManager.GetQueryStatistics()

	// Group by table
	tableMap := make(map[string]*models.TableDistribution)
	operationMap := make(map[string]*models.OperationDistribution)
	totalQueries := 0

	for _, stat := range stats {
		// Extract table name from fingerprint (simplified)
		// TODO: Improve table extraction logic
		table := extractTableFromSQL(stat.Fingerprint)
		if table != "" {
			if _, exists := tableMap[table]; !exists {
				tableMap[table] = &models.TableDistribution{
					Table: table,
				}
			}
			td := tableMap[table]
			td.QueryCount += stat.Count
			td.TotalTime += stat.TotalTime
			if stat.Issue != "" {
				td.IssueCount++
			}
		}

		// Extract operation type
		operation := extractOperationFromSQL(stat.Fingerprint)
		if operation != "" {
			if _, exists := operationMap[operation]; !exists {
				operationMap[operation] = &models.OperationDistribution{
					Operation: operation,
				}
			}
			od := operationMap[operation]
			od.Count += stat.Count
			od.AvgTime = (od.AvgTime*float64(od.Count-stat.Count) + stat.TotalTime) / float64(od.Count)
			totalQueries += stat.Count
		}
	}

	// Calculate averages and percentages
	byTable := []models.TableDistribution{}
	for _, td := range tableMap {
		if td.QueryCount > 0 {
			td.AvgTime = td.TotalTime / float64(td.QueryCount)
		}
		byTable = append(byTable, *td)
	}

	byOperation := []models.OperationDistribution{}
	for _, od := range operationMap {
		if totalQueries > 0 {
			od.Percentage = float64(od.Count) / float64(totalQueries) * 100
		}
		byOperation = append(byOperation, *od)
	}

	return &models.QueryDistribution{
		ByTable:     byTable,
		ByOperation: byOperation,
	}, nil
}

// IgnoreQueryPattern marks a query pattern as ignored
func (a *App) IgnoreQueryPattern(fingerprint string) error {
	// TODO: Implement ignore pattern storage
	// For now, this is a placeholder
	log.Printf("[Query Analysis] Ignoring pattern: %s", fingerprint)
	return nil
}

// CompareQueryPlans compares two query execution plans
func (a *App) CompareQueryPlans(originalSQL, optimizedSQL string) (*models.QueryComparison, error) {
	if a.databaseManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	// Explain both queries
	beforeExplain, err := a.databaseManager.ExplainQuery(originalSQL)
	if err != nil {
		return nil, fmt.Errorf("failed to explain original query: %w", err)
	}

	afterExplain, err := a.databaseManager.ExplainQuery(optimizedSQL)
	if err != nil {
		return nil, fmt.Errorf("failed to explain optimized query: %w", err)
	}

	// Calculate improvements
	timeReduction := 0.0
	if beforeExplain.ExecutionTime > 0 {
		timeReduction = ((beforeExplain.ExecutionTime - afterExplain.ExecutionTime) / beforeExplain.ExecutionTime) * 100
	}

	rowsReduction := 0.0
	if beforeExplain.Analysis.RowsExamined > 0 {
		rowsReduction = float64(beforeExplain.Analysis.RowsExamined-afterExplain.Analysis.RowsExamined) / float64(beforeExplain.Analysis.RowsExamined) * 100
	}

	scoreImprovement := afterExplain.Analysis.PerformanceScore - beforeExplain.Analysis.PerformanceScore

	return &models.QueryComparison{
		Before: models.QueryExecution{
			SQL:              originalSQL,
			ExplainResult:    beforeExplain,
			EstimatedTime:    beforeExplain.ExecutionTime,
			RowsExamined:     beforeExplain.Analysis.RowsExamined,
			PerformanceScore: beforeExplain.Analysis.PerformanceScore,
		},
		After: models.QueryExecution{
			SQL:              optimizedSQL,
			ExplainResult:    afterExplain,
			EstimatedTime:    afterExplain.ExecutionTime,
			RowsExamined:     afterExplain.Analysis.RowsExamined,
			PerformanceScore: afterExplain.Analysis.PerformanceScore,
		},
		Improvement: models.Improvement{
			TimeReduction:    timeReduction,
			RowsReduction:    rowsReduction,
			ScoreImprovement: scoreImprovement,
		},
	}, nil
}

// Helper functions for SQL parsing
func extractTableFromSQL(sql string) string {
	sql = strings.ToUpper(sql)
	if idx := strings.Index(sql, "FROM "); idx != -1 {
		rest := sql[idx+5:]
		words := strings.Fields(rest)
		if len(words) > 0 {
			return strings.ToLower(words[0])
		}
	}
	if idx := strings.Index(sql, "INTO "); idx != -1 {
		rest := sql[idx+5:]
		words := strings.Fields(rest)
		if len(words) > 0 {
			return strings.ToLower(words[0])
		}
	}
	if idx := strings.Index(sql, "UPDATE "); idx != -1 {
		rest := sql[idx+7:]
		words := strings.Fields(rest)
		if len(words) > 0 {
			return strings.ToLower(words[0])
		}
	}
	return ""
}

func extractOperationFromSQL(sql string) string {
	sql = strings.ToUpper(strings.TrimSpace(sql))
	if strings.HasPrefix(sql, "SELECT") {
		return "SELECT"
	}
	if strings.HasPrefix(sql, "INSERT") {
		return "INSERT"
	}
	if strings.HasPrefix(sql, "UPDATE") {
		return "UPDATE"
	}
	if strings.HasPrefix(sql, "DELETE") {
		return "DELETE"
	}
	return ""
}

// ============================================================================
// Helper functions
// ============================================================================

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	if v, ok := m[key].(int); ok {
		return v
	}
	return 0
}

// ============================================================================
// SSH API Methods
// ============================================================================

// GetSSHServers returns all saved SSH server configurations
func (a *App) GetSSHServers() []models.SSHServer {
	if a.config == nil {
		return []models.SSHServer{}
	}
	return a.config.SSH.SavedServers
}

// SaveSSHServer adds or updates an SSH server configuration
func (a *App) SaveSSHServer(server models.SSHServer) error {
	if a.config == nil {
		return fmt.Errorf("config not loaded")
	}

	// Validate
	if server.ID == "" {
		server.ID = uuid.New().String()
	}
	if server.Port == 0 {
		server.Port = 22
	}
	server.CreatedAt = time.Now()

	// Add or update
	found := false
	for i, s := range a.config.SSH.SavedServers {
		if s.ID == server.ID {
			a.config.SSH.SavedServers[i] = server
			found = true
			break
		}
	}
	if !found {
		a.config.SSH.SavedServers = append(a.config.SSH.SavedServers, server)
	}

	return a.config.Save(a.projectDir)
}

// DeleteSSHServer removes an SSH server configuration
func (a *App) DeleteSSHServer(id string) error {
	if a.config == nil {
		return fmt.Errorf("config not loaded")
	}

	filtered := []models.SSHServer{}
	for _, s := range a.config.SSH.SavedServers {
		if s.ID != id {
			filtered = append(filtered, s)
		}
	}
	a.config.SSH.SavedServers = filtered
	return a.config.Save(a.projectDir)
}

// ConnectSSH establishes an SSH connection to a saved server
func (a *App) ConnectSSH(serverID string) (string, error) {
	if a.config == nil {
		return "", fmt.Errorf("config not loaded")
	}

	var server *models.SSHServer
	for _, s := range a.config.SSH.SavedServers {
		if s.ID == serverID {
			server = &s
			break
		}
	}
	if server == nil {
		return "", fmt.Errorf("server not found: %s", serverID)
	}

	// Update last connected timestamp
	now := time.Now()
	server.LastConnected = &now
	a.SaveSSHServer(*server)

	return a.sshManager.CreateSession(*server)
}

// DisconnectSSH closes an SSH session
func (a *App) DisconnectSSH(sessionID string) error {
	return a.sshManager.CloseSession(sessionID)
}

// WriteSSH sends data to an SSH session
func (a *App) WriteSSH(sessionID string, data string) error {
	return a.sshManager.Write(sessionID, []byte(data))
}

// ResizeSSH resizes an SSH session's terminal
func (a *App) ResizeSSH(sessionID string, rows, cols int) error {
	return a.sshManager.Resize(sessionID, rows, cols)
}

// CreateSSHTunnel creates an SSH port forward or SOCKS proxy
func (a *App) CreateSSHTunnel(sessionID string, tunnel models.SSHTunnel) error {
	if tunnel.ID == "" {
		tunnel.ID = uuid.New().String()
	}
	return a.sshManager.CreateTunnel(sessionID, tunnel)
}

// ExportSSHSession exports SSH session logs to CSV or plain text
func (a *App) ExportSSHSession(sessionID string, format string) (string, error) {
	logs, err := a.sshManager.GetSessionLogs(sessionID)
	if err != nil {
		return "", err
	}

	if format == "csv" {
		return exportSSHLogsCSV(logs), nil
	}
	return exportSSHLogsPlainText(logs), nil
}

// GetSSHSessions returns all active SSH sessions
func (a *App) GetSSHSessions() []models.SSHSession {
	return a.sshManager.GetAllSessions()
}

// Helper: Export SSH logs as CSV
func exportSSHLogsCSV(logs []models.SSHSessionLog) string {
	var buf bytes.Buffer
	buf.WriteString("timestamp,server,type,content\n")
	for _, log := range logs {
		// Escape CSV content
		content := strings.ReplaceAll(log.Content, "\"", "\"\"")
		buf.WriteString(fmt.Sprintf("%s,%s,%s,\"%s\"\n",
			log.Timestamp.Format(time.RFC3339),
			log.Server,
			log.Type,
			content,
		))
	}
	return buf.String()
}

// Helper: Export SSH logs as plain text
func exportSSHLogsPlainText(logs []models.SSHSessionLog) string {
	var buf bytes.Buffer
	for _, log := range logs {
		buf.WriteString(log.Content)
	}
	return buf.String()
}
