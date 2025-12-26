package exceptions

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"

	"github.com/caboose-desktop/internal/models"
)

// Exception represents an aggregated exception
type Exception struct {
	ID          string               `json:"id"`
	Type        string               `json:"type"`
	Message     string               `json:"message"`
	Severity    string               `json:"severity"` // error, warning
	Count       int                  `json:"count"`
	FirstSeen   string               `json:"firstSeen"`
	LastSeen    string               `json:"lastSeen"`
	File        string               `json:"file"`
	Line        int                  `json:"line"`
	StackTrace  []string             `json:"stackTrace"`
	Context     map[string]interface{} `json:"context,omitempty"`
	Resolved    bool                 `json:"resolved"`
	Ignored     bool                 `json:"ignored"`
	Fingerprint string               `json:"fingerprint"`
}

// Tracker tracks and aggregates exceptions
type Tracker struct {
	mu         sync.RWMutex
	exceptions map[string]*Exception
	maxCount   int
}

// NewTracker creates a new exception tracker
func NewTracker() *Tracker {
	return &Tracker{
		exceptions: make(map[string]*Exception),
		maxCount:   1000, // Keep last 1000 unique exceptions
	}
}

// TrackException records an exception from a log entry
func (t *Tracker) TrackException(logEntry *models.LogEntry) {
	if logEntry == nil || logEntry.Exception == nil {
		return
	}

	exc := logEntry.Exception
	fingerprint := exc.Fingerprint
	if fingerprint == "" {
		fingerprint = generateFingerprint(exc.Type, exc.Message)
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	existing, exists := t.exceptions[fingerprint]
	if exists {
		// Update existing exception
		existing.Count++
		existing.LastSeen = time.Now().Format(time.RFC3339)
		return
	}

	// Create new exception
	stackTrace := make([]string, 0, len(exc.Backtrace))
	var file string
	var line int

	for i, frame := range exc.Backtrace {
		stackLine := fmt.Sprintf("%s:%d", frame.File, frame.Line)
		if frame.Function != "" {
			stackLine += " in `" + frame.Function + "'"
		}
		stackTrace = append(stackTrace, stackLine)

		// Use first frame for file/line
		if i == 0 {
			file = frame.File
			line = frame.Line
		}
	}

	// Determine severity
	severity := "error"
	if logEntry.Level == models.LogLevelWarning {
		severity = "warning"
	}

	// Build context from log metadata
	context := make(map[string]interface{})
	if logEntry.Request != nil {
		context["method"] = logEntry.Request.Method
		context["path"] = logEntry.Request.Path
		if logEntry.Request.Controller != "" {
			context["controller"] = logEntry.Request.Controller
		}
		if logEntry.Request.Action != "" {
			context["action"] = logEntry.Request.Action
		}
	}
	if logEntry.RequestID != "" {
		context["request_id"] = logEntry.RequestID
	}

	newException := &Exception{
		ID:          fingerprint,
		Type:        exc.Type,
		Message:     exc.Message,
		Severity:    severity,
		Count:       1,
		FirstSeen:   time.Now().Format(time.RFC3339),
		LastSeen:    time.Now().Format(time.RFC3339),
		File:        file,
		Line:        line,
		StackTrace:  stackTrace,
		Context:     context,
		Resolved:    false,
		Ignored:     false,
		Fingerprint: fingerprint,
	}

	t.exceptions[fingerprint] = newException

	// Prune if too many exceptions
	if len(t.exceptions) > t.maxCount {
		t.pruneOldest()
	}
}

// GetExceptions returns all tracked exceptions
func (t *Tracker) GetExceptions() []*Exception {
	t.mu.RLock()
	defer t.mu.RUnlock()

	result := make([]*Exception, 0, len(t.exceptions))
	for _, exc := range t.exceptions {
		if !exc.Resolved && !exc.Ignored {
			result = append(result, exc)
		}
	}

	return result
}

// GetException returns a specific exception by ID
func (t *Tracker) GetException(id string) *Exception {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.exceptions[id]
}

// ResolveException marks an exception as resolved
func (t *Tracker) ResolveException(id string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	exc, exists := t.exceptions[id]
	if !exists {
		return fmt.Errorf("exception not found: %s", id)
	}

	exc.Resolved = true
	return nil
}

// IgnoreException marks an exception as ignored
func (t *Tracker) IgnoreException(id string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	exc, exists := t.exceptions[id]
	if !exists {
		return fmt.Errorf("exception not found: %s", id)
	}

	exc.Ignored = true
	return nil
}

// ClearExceptions clears all tracked exceptions
func (t *Tracker) ClearExceptions() {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.exceptions = make(map[string]*Exception)
}

// pruneOldest removes oldest exceptions to stay under maxCount
func (t *Tracker) pruneOldest() {
	// Simple pruning: remove resolved and ignored first
	for id, exc := range t.exceptions {
		if exc.Resolved || exc.Ignored {
			delete(t.exceptions, id)
			if len(t.exceptions) <= t.maxCount*9/10 { // Keep at 90%
				return
			}
		}
	}
}

// generateFingerprint creates a unique fingerprint for an exception
func generateFingerprint(excType, message string) string {
	data := []byte(excType + ":" + message)
	hash := md5.Sum(data)
	return fmt.Sprintf("%x", hash)
}
