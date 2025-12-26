package database

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"
)

// Driver is the interface that database drivers must implement
type Driver interface {
	// Connect establishes a database connection
	Connect(config ConnectionConfig) error

	// Disconnect closes the database connection
	Disconnect() error

	// Ping tests the connection
	Ping() error

	// GetTables returns all tables in the database
	GetTables() ([]TableInfo, error)

	// GetColumns returns columns for a specific table
	GetColumns(tableName string) ([]ColumnInfo, error)

	// ExecuteQuery executes a SQL query and returns results
	ExecuteQuery(query string, limit int) (*QueryResult, error)

	// ExplainQuery returns the execution plan for a query
	ExplainQuery(query string) (*ExplainResult, error)

	// GetVersion returns the database version
	GetVersion() (string, error)

	// GetDB returns the underlying sql.DB connection
	GetDB() *sql.DB
}

// Manager manages database connections and queries
type Manager struct {
	mu                 sync.RWMutex
	driver             Driver
	config             ConnectionConfig
	connected          bool
	queryHistory       []SavedQuery
	maxHistory         int
	queryStats         map[string]*QueryStatistic
	slowQueryThreshold float64 // in milliseconds
}

// NewManager creates a new database manager
func NewManager() *Manager {
	return &Manager{
		queryHistory:       make([]SavedQuery, 0),
		maxHistory:         100,
		queryStats:         make(map[string]*QueryStatistic),
		slowQueryThreshold: 100.0, // 100ms default
	}
}

// Connect connects to a database
func (m *Manager) Connect(config ConnectionConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Disconnect existing connection if any
	if m.driver != nil {
		m.driver.Disconnect()
	}

	// Create appropriate driver based on config
	var driver Driver
	switch strings.ToLower(config.Driver) {
	case "mysql":
		driver = NewMySQLDriver()
	// Future: add postgres, sqlite, etc.
	default:
		return fmt.Errorf("unsupported database driver: %s", config.Driver)
	}

	// Connect
	if err := driver.Connect(config); err != nil {
		return err
	}

	m.driver = driver
	m.config = config
	m.connected = true

	return nil
}

// Disconnect closes the database connection
func (m *Manager) Disconnect() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.driver != nil {
		err := m.driver.Disconnect()
		m.driver = nil
		m.connected = false
		return err
	}

	return nil
}

// GetStatus returns the current connection status
func (m *Manager) GetStatus() DatabaseStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	status := DatabaseStatus{
		Connected: m.connected,
	}

	if m.connected && m.driver != nil {
		status.Driver = m.config.Driver
		status.Database = m.config.Database
		status.Host = m.config.Host

		if version, err := m.driver.GetVersion(); err == nil {
			status.Version = version
		}
	}

	return status
}

// GetTables returns all tables
func (m *Manager) GetTables() ([]TableInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.connected || m.driver == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	return m.driver.GetTables()
}

// GetColumns returns columns for a table
func (m *Manager) GetColumns(tableName string) ([]ColumnInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.connected || m.driver == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	return m.driver.GetColumns(tableName)
}

// ExecuteQuery executes a SQL query
func (m *Manager) ExecuteQuery(query string, limit int) (*QueryResult, error) {
	m.mu.RLock()
	connected := m.connected
	driver := m.driver
	m.mu.RUnlock()

	if !connected || driver == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	if limit <= 0 {
		limit = 1000 // Default limit
	}

	result, err := driver.ExecuteQuery(query, limit)
	if err != nil {
		return result, err
	}

	// Record query statistics
	m.RecordQueryExecution(query, result.ExecutionTime)

	return result, nil
}

// ExplainQuery returns the execution plan
func (m *Manager) ExplainQuery(query string) (*ExplainResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.connected || m.driver == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	return m.driver.ExplainQuery(query)
}

// SaveQuery saves a query to history
func (m *Manager) SaveQuery(name, sql string) *SavedQuery {
	m.mu.Lock()
	defer m.mu.Unlock()

	query := SavedQuery{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Name:      name,
		SQL:       sql,
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	// Check if query with same name exists, update it
	for i, q := range m.queryHistory {
		if q.Name == name {
			m.queryHistory[i] = query
			return &query
		}
	}

	// Add to history
	m.queryHistory = append(m.queryHistory, query)

	// Trim if exceeds max
	if len(m.queryHistory) > m.maxHistory {
		m.queryHistory = m.queryHistory[len(m.queryHistory)-m.maxHistory:]
	}

	return &query
}

// GetQueryHistory returns saved queries
func (m *Manager) GetQueryHistory() []SavedQuery {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy
	result := make([]SavedQuery, len(m.queryHistory))
	copy(result, m.queryHistory)
	return result
}

// DeleteQuery deletes a saved query
func (m *Manager) DeleteQuery(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, q := range m.queryHistory {
		if q.ID == id {
			m.queryHistory = append(m.queryHistory[:i], m.queryHistory[i+1:]...)
			return nil
		}
	}

	return fmt.Errorf("query not found: %s", id)
}

// SetQueryHistory sets the query history (for loading from config)
func (m *Manager) SetQueryHistory(history []SavedQuery) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.queryHistory = history
}

// RecordQueryExecution records statistics for an executed query
func (m *Manager) RecordQueryExecution(sql string, executionTime float64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	fingerprint := normalizeQuery(sql)

	if stat, exists := m.queryStats[fingerprint]; exists {
		// Update existing stats
		stat.Count++
		stat.TotalTime += executionTime
		stat.AvgTime = stat.TotalTime / float64(stat.Count)
		stat.LastExecuted = time.Now().Format(time.RFC3339)
		stat.SQL = sql // Keep most recent query

		// Check for slow query
		if stat.AvgTime > m.slowQueryThreshold {
			stat.Issue = "slow"
		}
	} else {
		// Create new stat entry
		issue := ""
		if executionTime > m.slowQueryThreshold {
			issue = "slow"
		}

		m.queryStats[fingerprint] = &QueryStatistic{
			ID:           fmt.Sprintf("%d", time.Now().UnixNano()),
			Fingerprint:  fingerprint,
			SQL:          sql,
			Count:        1,
			AvgTime:      executionTime,
			TotalTime:    executionTime,
			LastExecuted: time.Now().Format(time.RFC3339),
			Issue:        issue,
		}
	}
}

// GetQueryStatistics returns all collected query statistics
func (m *Manager) GetQueryStatistics() []QueryStatistic {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]QueryStatistic, 0, len(m.queryStats))
	for _, stat := range m.queryStats {
		result = append(result, *stat)
	}
	return result
}

// ClearQueryStatistics clears all query statistics
func (m *Manager) ClearQueryStatistics() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.queryStats = make(map[string]*QueryStatistic)
}

// GetDatabaseHealth returns database health metrics
func (m *Manager) GetDatabaseHealth() (*DatabaseHealth, error) {
	m.mu.RLock()
	driver := m.driver
	connected := m.connected
	m.mu.RUnlock()

	if !connected || driver == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	// Check if driver supports health metrics (MySQL)
	if mysqlDriver, ok := driver.(*MySQLDriver); ok {
		health, err := mysqlDriver.GetHealthMetrics()
		if err != nil {
			return nil, err
		}

		// Add slow queries from our query stats
		m.mu.RLock()
		slowQueries := make([]SlowQuery, 0)
		for _, stat := range m.queryStats {
			if stat.AvgTime > m.slowQueryThreshold {
				slowQueries = append(slowQueries, SlowQuery{
					Query:       stat.SQL,
					Fingerprint: stat.Fingerprint,
					Time:        stat.AvgTime,
					Count:       stat.Count,
				})
			}
		}
		m.mu.RUnlock()

		// Sort by time and limit to top 10
		if len(slowQueries) > 10 {
			// Simple sort by time (descending)
			for i := 0; i < len(slowQueries)-1; i++ {
				for j := i + 1; j < len(slowQueries); j++ {
					if slowQueries[j].Time > slowQueries[i].Time {
						slowQueries[i], slowQueries[j] = slowQueries[j], slowQueries[i]
					}
				}
			}
			slowQueries = slowQueries[:10]
		}

		health.SlowQueries = slowQueries
		health.Performance.SlowQueryCount = len(slowQueries)
		health.Performance.AvgQueryTime = calculateAvgQueryTime(m.queryStats)

		return health, nil
	}

	return nil, fmt.Errorf("database driver does not support health metrics")
}

func calculateAvgQueryTime(stats map[string]*QueryStatistic) float64 {
	if len(stats) == 0 {
		return 0
	}

	var total float64
	var count int
	for _, stat := range stats {
		total += stat.AvgTime
		count++
	}

	if count == 0 {
		return 0
	}

	return total / float64(count)
}

// normalizeQuery creates a fingerprint from a SQL query by removing literals
func normalizeQuery(sql string) string {
	// Simple normalization: trim whitespace and convert to uppercase for grouping
	// A more sophisticated approach would replace literals with placeholders
	normalized := strings.TrimSpace(sql)
	normalized = strings.ToUpper(normalized)

	// Remove multiple spaces
	for strings.Contains(normalized, "  ") {
		normalized = strings.ReplaceAll(normalized, "  ", " ")
	}

	// Truncate to reasonable length for fingerprint
	if len(normalized) > 100 {
		normalized = normalized[:100] + "..."
	}

	return normalized
}
