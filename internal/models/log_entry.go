package models

import "time"

// LogLevel represents the severity of a log entry
type LogLevel string

const (
	LogLevelDebug   LogLevel = "debug"
	LogLevelInfo    LogLevel = "info"
	LogLevelWarning LogLevel = "warn"
	LogLevelError   LogLevel = "error"
	LogLevelFatal   LogLevel = "fatal"
)

// LogEntry represents a parsed log line
type LogEntry struct {
	// ID is the unique identifier for this log entry
	ID string `json:"id"`

	// Timestamp is when this log was generated
	Timestamp time.Time `json:"timestamp"`

	// Raw is the original unparsed log line
	Raw string `json:"raw"`

	// Level is the log severity
	Level LogLevel `json:"level"`

	// Message is the parsed message content
	Message string `json:"message"`

	// ProcessName is the name of the process that generated this log
	ProcessName string `json:"processName"`

	// RequestID groups logs from the same request (framework-specific)
	RequestID string `json:"requestId,omitempty"`

	// Metadata holds framework-specific parsed data
	Metadata map[string]interface{} `json:"metadata,omitempty"`

	// SQL holds SQL query information if this is a query log
	SQL *SQLLog `json:"sql,omitempty"`

	// Request holds HTTP request information if this is a request log
	Request *RequestLog `json:"request,omitempty"`

	// Exception holds exception information if this is an error log
	Exception *ExceptionLog `json:"exception,omitempty"`
}

// SQLLog represents SQL query information extracted from logs
type SQLLog struct {
	Query       string  `json:"query"`
	Duration    float64 `json:"duration"` // in milliseconds
	Fingerprint string  `json:"fingerprint"`
	Table       string  `json:"table,omitempty"`
	Operation   string  `json:"operation,omitempty"` // SELECT, INSERT, UPDATE, DELETE
}

// RequestLog represents HTTP request information
type RequestLog struct {
	Method     string        `json:"method"`
	Path       string        `json:"path"`
	Controller string        `json:"controller,omitempty"`
	Action     string        `json:"action,omitempty"`
	Status     int           `json:"status,omitempty"`
	Duration   float64       `json:"duration,omitempty"` // in milliseconds
	IP         string        `json:"ip,omitempty"`
	Params     []interface{} `json:"params,omitempty"`
}

// ExceptionLog represents exception/error information
type ExceptionLog struct {
	Type       string       `json:"type"`
	Message    string       `json:"message"`
	Backtrace  []StackFrame `json:"backtrace,omitempty"`
	FirstSeen  time.Time    `json:"firstSeen"`
	LastSeen   time.Time    `json:"lastSeen"`
	Count      int          `json:"count"`
	Fingerprint string      `json:"fingerprint"`
}

// StackFrame represents a single frame in a stack trace
type StackFrame struct {
	File     string `json:"file"`
	Line     int    `json:"line"`
	Function string `json:"function"`
	Context  string `json:"context,omitempty"`
}
