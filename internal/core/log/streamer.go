package log

import (
	"sync"
	"time"

	"github.com/caboose-desktop/internal/models"
	"github.com/google/uuid"
)

// Streamer handles log collection and streaming with a ring buffer
type Streamer struct {
	mu         sync.RWMutex
	buffer     []*models.LogEntry
	bufferSize int
	head       int
	count      int

	// Subscribers for real-time updates
	subscribers map[string]chan *models.LogEntry
	subMu       sync.RWMutex

	// Callback for new log entries
	OnNewLog func(entry *models.LogEntry)
}

// NewStreamer creates a new log streamer with the specified buffer size
func NewStreamer(bufferSize int) *Streamer {
	if bufferSize <= 0 {
		bufferSize = 10000
	}

	return &Streamer{
		buffer:      make([]*models.LogEntry, bufferSize),
		bufferSize:  bufferSize,
		subscribers: make(map[string]chan *models.LogEntry),
	}
}

// Add adds a new log entry to the buffer
func (s *Streamer) Add(entry *models.LogEntry) {
	s.mu.Lock()

	// Assign ID and timestamp if not set
	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}

	// Add to ring buffer
	s.buffer[s.head] = entry
	s.head = (s.head + 1) % s.bufferSize
	if s.count < s.bufferSize {
		s.count++
	}

	s.mu.Unlock()

	// Notify subscribers
	s.notifySubscribers(entry)

	// Call callback if set
	if s.OnNewLog != nil {
		s.OnNewLog(entry)
	}
}

// AddRaw adds a raw log line with optional process name
func (s *Streamer) AddRaw(processName, line string, level models.LogLevel) {
	entry := &models.LogEntry{
		Raw:         line,
		Message:     line,
		ProcessName: processName,
		Level:       level,
	}
	s.Add(entry)
}

// GetAll returns all log entries in the buffer
func (s *Streamer) GetAll() []*models.LogEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.LogEntry, 0, s.count)

	// Calculate starting position for oldest entry
	start := 0
	if s.count == s.bufferSize {
		start = s.head
	}

	// Iterate through the ring buffer
	for i := 0; i < s.count; i++ {
		idx := (start + i) % s.bufferSize
		if s.buffer[idx] != nil {
			result = append(result, s.buffer[idx])
		}
	}

	return result
}

// Filter represents log filtering options
type Filter struct {
	ProcessName string
	Level       models.LogLevel
	Search      string
	Since       *time.Time
	Until       *time.Time
	RequestID   string
	Limit       int
	Offset      int
}

// GetFiltered returns log entries matching the filter
func (s *Streamer) GetFiltered(filter Filter) []*models.LogEntry {
	all := s.GetAll()
	result := make([]*models.LogEntry, 0)

	for _, entry := range all {
		if !s.matchesFilter(entry, filter) {
			continue
		}
		result = append(result, entry)
	}

	// Apply offset and limit
	if filter.Offset > 0 {
		if filter.Offset >= len(result) {
			return []*models.LogEntry{}
		}
		result = result[filter.Offset:]
	}

	if filter.Limit > 0 && filter.Limit < len(result) {
		result = result[:filter.Limit]
	}

	return result
}

// matchesFilter checks if an entry matches the filter criteria
func (s *Streamer) matchesFilter(entry *models.LogEntry, filter Filter) bool {
	if filter.ProcessName != "" && entry.ProcessName != filter.ProcessName {
		return false
	}

	if filter.Level != "" && entry.Level != filter.Level {
		return false
	}

	if filter.RequestID != "" && entry.RequestID != filter.RequestID {
		return false
	}

	if filter.Since != nil && entry.Timestamp.Before(*filter.Since) {
		return false
	}

	if filter.Until != nil && entry.Timestamp.After(*filter.Until) {
		return false
	}

	// Simple substring search
	if filter.Search != "" {
		if !containsIgnoreCase(entry.Raw, filter.Search) &&
			!containsIgnoreCase(entry.Message, filter.Search) {
			return false
		}
	}

	return true
}

// containsIgnoreCase performs case-insensitive substring search
func containsIgnoreCase(s, substr string) bool {
	// Simple implementation - could be optimized
	return len(s) >= len(substr) &&
		(s == substr || len(substr) == 0 ||
		 findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			sc := s[i+j]
			pc := substr[j]
			// Simple case-insensitive comparison
			if sc != pc && sc != pc+32 && sc != pc-32 {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

// Clear clears all log entries
func (s *Streamer) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.buffer = make([]*models.LogEntry, s.bufferSize)
	s.head = 0
	s.count = 0
}

// Subscribe creates a subscription for real-time log updates
func (s *Streamer) Subscribe() (string, <-chan *models.LogEntry) {
	s.subMu.Lock()
	defer s.subMu.Unlock()

	id := uuid.New().String()
	ch := make(chan *models.LogEntry, 100)
	s.subscribers[id] = ch

	return id, ch
}

// Unsubscribe removes a subscription
func (s *Streamer) Unsubscribe(id string) {
	s.subMu.Lock()
	defer s.subMu.Unlock()

	if ch, exists := s.subscribers[id]; exists {
		close(ch)
		delete(s.subscribers, id)
	}
}

// notifySubscribers sends the entry to all subscribers
func (s *Streamer) notifySubscribers(entry *models.LogEntry) {
	s.subMu.RLock()
	defer s.subMu.RUnlock()

	for _, ch := range s.subscribers {
		select {
		case ch <- entry:
		default:
			// Channel full, skip to avoid blocking
		}
	}
}

// Count returns the number of log entries in the buffer
func (s *Streamer) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.count
}

// Export exports all logs to a slice (for file export)
func (s *Streamer) Export() []string {
	entries := s.GetAll()
	lines := make([]string, len(entries))

	for i, entry := range entries {
		lines[i] = entry.Raw
	}

	return lines
}
