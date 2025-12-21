package rails

import (
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/caboose-desktop/internal/models"
	"github.com/google/uuid"
)

// Parser parses Rails log lines into structured entries
type Parser struct {
	// Compiled regex patterns
	requestStartPattern  *regexp.Regexp
	processingPattern    *regexp.Regexp
	completedPattern     *regexp.Regexp
	sqlPattern           *regexp.Regexp
	renderPattern        *regexp.Regexp
	exceptionPattern     *regexp.Regexp
	parameterPattern     *regexp.Regexp
}

// NewParser creates a new Rails log parser
func NewParser() *Parser {
	return &Parser{
		// Started GET "/users" for 127.0.0.1 at 2024-01-15 10:30:00 +0000
		requestStartPattern: regexp.MustCompile(
			`Started\s+(\w+)\s+"([^"]+)"\s+for\s+([\d\.]+)\s+at\s+(.+)`,
		),
		// Processing by UsersController#index as HTML
		processingPattern: regexp.MustCompile(
			`Processing\s+by\s+(\w+)#(\w+)\s+as\s+(\w+)`,
		),
		// Completed 200 OK in 50ms (Views: 30.0ms | ActiveRecord: 10.0ms)
		completedPattern: regexp.MustCompile(
			`Completed\s+(\d+)\s+\w+\s+in\s+([\d\.]+)ms`,
		),
		// User Load (0.5ms)  SELECT "users".* FROM "users" WHERE ...
		sqlPattern: regexp.MustCompile(
			`(\w+(?:\s+\w+)?)\s+\(([\d\.]+)ms\)\s+(.+)`,
		),
		// Rendered users/index.html.erb within layouts/application (Duration: 5.0ms)
		renderPattern: regexp.MustCompile(
			`Rendered\s+([^\s]+)(?:\s+within\s+([^\s]+))?\s+\(Duration:\s+([\d\.]+)ms`,
		),
		// Exception pattern for errors
		exceptionPattern: regexp.MustCompile(
			`^(\w+(?:::\w+)*(?:Error|Exception)):\s*(.*)$`,
		),
		// Parameters pattern
		parameterPattern: regexp.MustCompile(
			`Parameters:\s+(\{.+\})`,
		),
	}
}

// Parse parses a log line into a LogEntry
func (p *Parser) Parse(line string) *models.LogEntry {
	entry := &models.LogEntry{
		ID:        uuid.New().String(),
		Timestamp: time.Now(),
		Raw:       line,
		Level:     p.detectLevel(line),
	}

	// Try to parse as different log types
	if p.parseRequestStart(line, entry) {
		return entry
	}
	if p.parseProcessing(line, entry) {
		return entry
	}
	if p.parseCompleted(line, entry) {
		return entry
	}
	if p.parseSQL(line, entry) {
		return entry
	}
	if p.parseRender(line, entry) {
		return entry
	}
	if p.parseException(line, entry) {
		return entry
	}

	// Default: treat as plain message
	entry.Message = strings.TrimSpace(line)
	return entry
}

// detectLevel determines the log level from the line content
func (p *Parser) detectLevel(line string) models.LogLevel {
	lineLower := strings.ToLower(line)

	if strings.Contains(lineLower, "error") || strings.Contains(lineLower, "exception") {
		return models.LogLevelError
	}
	if strings.Contains(lineLower, "warn") {
		return models.LogLevelWarning
	}
	if strings.Contains(lineLower, "debug") {
		return models.LogLevelDebug
	}
	if strings.Contains(lineLower, "fatal") {
		return models.LogLevelFatal
	}

	return models.LogLevelInfo
}

// parseRequestStart parses "Started GET..." log lines
func (p *Parser) parseRequestStart(line string, entry *models.LogEntry) bool {
	matches := p.requestStartPattern.FindStringSubmatch(line)
	if matches == nil {
		return false
	}

	entry.Message = line
	entry.Request = &models.RequestLog{
		Method: matches[1],
		Path:   matches[2],
		IP:     matches[3],
	}

	// Generate request ID for grouping
	entry.RequestID = uuid.New().String()

	if entry.Metadata == nil {
		entry.Metadata = make(map[string]interface{})
	}
	entry.Metadata["type"] = "request_start"
	entry.Metadata["timestamp_str"] = matches[4]

	return true
}

// parseProcessing parses "Processing by..." log lines
func (p *Parser) parseProcessing(line string, entry *models.LogEntry) bool {
	matches := p.processingPattern.FindStringSubmatch(line)
	if matches == nil {
		return false
	}

	entry.Message = line
	if entry.Request == nil {
		entry.Request = &models.RequestLog{}
	}
	entry.Request.Controller = matches[1]
	entry.Request.Action = matches[2]

	if entry.Metadata == nil {
		entry.Metadata = make(map[string]interface{})
	}
	entry.Metadata["type"] = "processing"
	entry.Metadata["format"] = matches[3]

	return true
}

// parseCompleted parses "Completed 200..." log lines
func (p *Parser) parseCompleted(line string, entry *models.LogEntry) bool {
	matches := p.completedPattern.FindStringSubmatch(line)
	if matches == nil {
		return false
	}

	entry.Message = line
	if entry.Request == nil {
		entry.Request = &models.RequestLog{}
	}

	status, _ := strconv.Atoi(matches[1])
	duration, _ := strconv.ParseFloat(matches[2], 64)

	entry.Request.Status = status
	entry.Request.Duration = duration

	if entry.Metadata == nil {
		entry.Metadata = make(map[string]interface{})
	}
	entry.Metadata["type"] = "completed"

	// Determine level based on status code
	if status >= 500 {
		entry.Level = models.LogLevelError
	} else if status >= 400 {
		entry.Level = models.LogLevelWarning
	}

	return true
}

// parseSQL parses SQL query log lines
func (p *Parser) parseSQL(line string, entry *models.LogEntry) bool {
	matches := p.sqlPattern.FindStringSubmatch(line)
	if matches == nil {
		return false
	}

	// Skip SCHEMA queries and TRANSACTION logs
	if strings.Contains(matches[1], "SCHEMA") ||
	   strings.Contains(matches[1], "TRANSACTION") {
		entry.Message = line
		return true
	}

	duration, _ := strconv.ParseFloat(matches[2], 64)
	sql := strings.TrimSpace(matches[3])

	entry.Message = line
	entry.SQL = &models.SQLLog{
		Query:       sql,
		Duration:    duration,
		Fingerprint: fingerprintSQL(sql),
		Operation:   detectSQLOperation(sql),
		Table:       detectTable(sql),
	}

	if entry.Metadata == nil {
		entry.Metadata = make(map[string]interface{})
	}
	entry.Metadata["type"] = "sql"
	entry.Metadata["model"] = matches[1]

	// Flag slow queries
	if duration > 100 {
		entry.Level = models.LogLevelWarning
		entry.Metadata["slow"] = true
	}

	return true
}

// parseRender parses view rendering log lines
func (p *Parser) parseRender(line string, entry *models.LogEntry) bool {
	matches := p.renderPattern.FindStringSubmatch(line)
	if matches == nil {
		return false
	}

	entry.Message = line

	if entry.Metadata == nil {
		entry.Metadata = make(map[string]interface{})
	}
	entry.Metadata["type"] = "render"
	entry.Metadata["template"] = matches[1]
	if matches[2] != "" {
		entry.Metadata["layout"] = matches[2]
	}

	duration, _ := strconv.ParseFloat(matches[3], 64)
	entry.Metadata["duration"] = duration

	return true
}

// parseException parses exception log lines
func (p *Parser) parseException(line string, entry *models.LogEntry) bool {
	matches := p.exceptionPattern.FindStringSubmatch(line)
	if matches == nil {
		return false
	}

	entry.Message = line
	entry.Level = models.LogLevelError
	entry.Exception = &models.ExceptionLog{
		Type:    matches[1],
		Message: matches[2],
	}

	if entry.Metadata == nil {
		entry.Metadata = make(map[string]interface{})
	}
	entry.Metadata["type"] = "exception"

	return true
}

// fingerprintSQL normalizes a SQL query for comparison
func fingerprintSQL(sql string) string {
	// Replace literal values with placeholders
	result := sql

	// Replace numbers
	numPattern := regexp.MustCompile(`\b\d+\b`)
	result = numPattern.ReplaceAllString(result, "?")

	// Replace quoted strings
	stringPattern := regexp.MustCompile(`'[^']*'`)
	result = stringPattern.ReplaceAllString(result, "?")

	// Replace double-quoted strings
	dblStringPattern := regexp.MustCompile(`"[^"]*"`)
	result = dblStringPattern.ReplaceAllString(result, "?")

	// Normalize whitespace
	result = strings.Join(strings.Fields(result), " ")

	return result
}

// detectSQLOperation detects the SQL operation type
func detectSQLOperation(sql string) string {
	sqlUpper := strings.ToUpper(strings.TrimSpace(sql))

	switch {
	case strings.HasPrefix(sqlUpper, "SELECT"):
		return "SELECT"
	case strings.HasPrefix(sqlUpper, "INSERT"):
		return "INSERT"
	case strings.HasPrefix(sqlUpper, "UPDATE"):
		return "UPDATE"
	case strings.HasPrefix(sqlUpper, "DELETE"):
		return "DELETE"
	default:
		return "OTHER"
	}
}

// detectTable attempts to extract the table name from a SQL query
func detectTable(sql string) string {
	sqlUpper := strings.ToUpper(sql)

	// FROM clause
	fromPattern := regexp.MustCompile(`(?i)FROM\s+["']?(\w+)["']?`)
	if matches := fromPattern.FindStringSubmatch(sql); matches != nil {
		return matches[1]
	}

	// INTO clause (for INSERT)
	intoPattern := regexp.MustCompile(`(?i)INTO\s+["']?(\w+)["']?`)
	if matches := intoPattern.FindStringSubmatch(sql); matches != nil {
		return matches[1]
	}

	// UPDATE clause
	updatePattern := regexp.MustCompile(`(?i)UPDATE\s+["']?(\w+)["']?`)
	if matches := updatePattern.FindStringSubmatch(sqlUpper); matches != nil {
		return matches[1]
	}

	return ""
}
