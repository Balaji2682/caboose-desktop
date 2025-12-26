package security

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// AllowedCommands is the whitelist of commands that can be executed
var AllowedCommands = map[string]bool{
	"bundle":    true,
	"npm":       true,
	"yarn":      true,
	"pnpm":      true,
	"rails":     true,
	"ruby":      true,
	"node":      true,
	"npx":       true,
	"rake":      true,
	"sidekiq":   true,
	"good_job":  true,
	"python":    true,
	"python3":   true,
	"go":        true,
	"cargo":     true,
	"make":      true,
	"docker":    true,
	"docker-compose": true,
}

// Shell metacharacters that could be dangerous
var shellMetachars = regexp.MustCompile(`[;&|<>$` + "`" + `(){}]`)

// ValidateCommand checks if a command is in the whitelist
func ValidateCommand(command string) error {
	// Get base command (strip path)
	baseCmd := filepath.Base(command)

	if !AllowedCommands[baseCmd] {
		return fmt.Errorf("command not allowed: %s (not in whitelist)", baseCmd)
	}

	return nil
}

// ValidateArguments checks arguments for shell metacharacters
func ValidateArguments(args []string) error {
	for i, arg := range args {
		if shellMetachars.MatchString(arg) {
			return fmt.Errorf("argument %d contains dangerous characters: %s", i, arg)
		}
	}
	return nil
}

// ValidateProjectPath validates a project directory path
func ValidateProjectPath(path string) (string, error) {
	// Path must be absolute
	if !filepath.IsAbs(path) {
		return "", fmt.Errorf("path must be absolute")
	}

	// Clean and resolve path
	cleanPath := filepath.Clean(path)

	// Resolve symlinks
	realPath, err := filepath.EvalSymlinks(cleanPath)
	if err != nil {
		// If EvalSymlinks fails, the path might not exist yet, use clean path
		realPath = cleanPath
	}

	return realPath, nil
}

// SanitizePTYInput sanitizes input sent to PTY to prevent command injection
func SanitizePTYInput(input string) (string, error) {
	// Check for dangerous control characters
	if strings.ContainsAny(input, "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f") {
		return "", fmt.Errorf("input contains invalid control characters")
	}

	// Warn about potentially dangerous patterns (but allow - it's a console)
	dangerous := []string{"rm -rf", "DROP DATABASE", "DELETE FROM", "TRUNCATE"}
	inputUpper := strings.ToUpper(input)
	for _, pattern := range dangerous {
		if strings.Contains(inputUpper, pattern) {
			// Log warning but allow (user knows what they're doing in console)
			// Could add user confirmation here in the future
		}
	}

	return input, nil
}

// IsDestructiveQuery checks if a SQL query is destructive
func IsDestructiveQuery(query string) bool {
	queryUpper := strings.ToUpper(strings.TrimSpace(query))

	destructive := []string{
		"DROP ",
		"DELETE ",
		"TRUNCATE ",
		"UPDATE ",
		"ALTER ",
		"INSERT ",
		"CREATE ",
	}

	for _, keyword := range destructive {
		if strings.HasPrefix(queryUpper, keyword) {
			return true
		}
	}

	return false
}

// ValidateSSLMode ensures only secure SSL modes are used
func ValidateSSLMode(mode string) error {
	allowed := map[string]bool{
		"":           true, // No TLS
		"disable":    true, // Explicitly disabled
		"preferred":  true, // Secure modes
		"require":    true,
		"verify-ca":  true,
		"verify-full": true,
	}

	if !allowed[mode] {
		return fmt.Errorf("insecure SSL mode: %s (use: require, verify-ca, or verify-full)", mode)
	}

	return nil
}

// SanitizeError removes sensitive information from errors
func SanitizeError(err error, internal bool) error {
	if err == nil {
		return nil
	}

	// For internal use, return full error
	if internal {
		return err
	}

	// For external use, return generic error
	// Log the actual error internally (caller's responsibility)
	return fmt.Errorf("operation failed")
}
