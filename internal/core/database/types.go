package database

// ConnectionConfig holds database connection parameters
type ConnectionConfig struct {
	// Driver is the database type (mysql, postgres, sqlite)
	Driver string `json:"driver" toml:"driver"`

	// Host is the database host
	Host string `json:"host" toml:"host"`

	// Port is the database port
	Port int `json:"port" toml:"port"`

	// User is the database username
	User string `json:"user" toml:"user"`

	// Password is the database password (not persisted in config)
	Password string `json:"password" toml:"-"`

	// Database is the database name
	Database string `json:"database" toml:"database"`

	// SSLMode is the SSL mode (disable, require, verify-ca, verify-full)
	SSLMode string `json:"sslMode,omitempty" toml:"ssl_mode,omitempty"`

	// Name is a friendly name for this connection
	Name string `json:"name,omitempty" toml:"name,omitempty"`
}

// TableInfo represents information about a database table
type TableInfo struct {
	// Name is the table name
	Name string `json:"name"`

	// Schema is the schema/database name
	Schema string `json:"schema,omitempty"`

	// Type is the table type (BASE TABLE, VIEW, etc.)
	Type string `json:"type"`

	// RowCount is the approximate row count
	RowCount int64 `json:"rowCount,omitempty"`

	// Comment is the table comment
	Comment string `json:"comment,omitempty"`
}

// ColumnInfo represents information about a table column
type ColumnInfo struct {
	// Name is the column name
	Name string `json:"name"`

	// DataType is the column data type
	DataType string `json:"dataType"`

	// IsNullable indicates if the column allows NULL
	IsNullable bool `json:"isNullable"`

	// IsPrimaryKey indicates if this is a primary key column
	IsPrimaryKey bool `json:"isPrimaryKey"`

	// Default is the default value
	Default string `json:"default,omitempty"`

	// Comment is the column comment
	Comment string `json:"comment,omitempty"`

	// MaxLength is the maximum length for string types
	MaxLength int64 `json:"maxLength,omitempty"`
}

// QueryResult represents the result of a SQL query
type QueryResult struct {
	// Columns are the column names
	Columns []string `json:"columns"`

	// ColumnTypes are the column data types
	ColumnTypes []string `json:"columnTypes"`

	// Rows are the result rows (each row is a map of column name to value)
	Rows []map[string]interface{} `json:"rows"`

	// RowCount is the number of rows returned
	RowCount int `json:"rowCount"`

	// AffectedRows is the number of rows affected (for INSERT/UPDATE/DELETE)
	AffectedRows int64 `json:"affectedRows"`

	// ExecutionTime is the query execution time in milliseconds
	ExecutionTime float64 `json:"executionTime"`

	// Error is any error message
	Error string `json:"error,omitempty"`

	// IsSelect indicates if this was a SELECT query
	IsSelect bool `json:"isSelect"`
}

// ExplainResult represents the result of an EXPLAIN query
type ExplainResult struct {
	// Rows are the explain output rows
	Rows []map[string]interface{} `json:"rows"`

	// Columns are the column names in the explain output
	Columns []string `json:"columns"`

	// Query is the original query
	Query string `json:"query"`

	// ExecutionTime is the explain execution time in milliseconds
	ExecutionTime float64 `json:"executionTime"`

	// Recommendations are index and optimization recommendations
	Recommendations []IndexRecommendation `json:"recommendations"`

	// Analysis provides human-readable insights
	Analysis ExplainAnalysis `json:"analysis"`
}

// IndexRecommendation represents a suggested index
type IndexRecommendation struct {
	// Table is the table name
	Table string `json:"table"`

	// Columns are the suggested index columns
	Columns []string `json:"columns"`

	// Reason explains why this index is recommended
	Reason string `json:"reason"`

	// Severity indicates importance (high, medium, low)
	Severity string `json:"severity"`

	// SQL is the CREATE INDEX statement
	SQL string `json:"sql"`

	// EstimatedImpact describes expected performance improvement
	EstimatedImpact string `json:"estimatedImpact"`
}

// ExplainAnalysis provides insights from EXPLAIN output
type ExplainAnalysis struct {
	// HasTableScan indicates if a full table scan is present
	HasTableScan bool `json:"hasTableScan"`

	// HasIndexScan indicates if indexes are used
	HasIndexScan bool `json:"hasIndexScan"`

	// RowsExamined is the estimated rows examined
	RowsExamined int64 `json:"rowsExamined"`

	// UsingTemporary indicates if temporary table is used
	UsingTemporary bool `json:"usingTemporary"`

	// UsingFilesort indicates if filesort is used
	UsingFilesort bool `json:"usingFilesort"`

	// Summary is a human-readable summary
	Summary string `json:"summary"`

	// PerformanceScore is 0-100 (100 = best)
	PerformanceScore int `json:"performanceScore"`
}

// SavedQuery represents a saved SQL query
type SavedQuery struct {
	// ID is the unique identifier
	ID string `json:"id" toml:"id"`

	// Name is the friendly name
	Name string `json:"name" toml:"name"`

	// SQL is the query text
	SQL string `json:"sql" toml:"sql"`

	// CreatedAt is when the query was saved
	CreatedAt string `json:"createdAt" toml:"created_at"`

	// LastUsedAt is when the query was last executed
	LastUsedAt string `json:"lastUsedAt,omitempty" toml:"last_used_at,omitempty"`
}

// DatabaseStatus represents the current database connection status
type DatabaseStatus struct {
	// Connected indicates if we're connected
	Connected bool `json:"connected"`

	// Driver is the database driver type
	Driver string `json:"driver,omitempty"`

	// Database is the current database name
	Database string `json:"database,omitempty"`

	// Host is the connected host
	Host string `json:"host,omitempty"`

	// Version is the database server version
	Version string `json:"version,omitempty"`

	// Error is any connection error
	Error string `json:"error,omitempty"`
}

// QueryStatistic represents statistics for a tracked query
type QueryStatistic struct {
	// ID is a unique identifier
	ID string `json:"id"`

	// Fingerprint is a normalized version of the query for grouping
	Fingerprint string `json:"fingerprint"`

	// SQL is a sample of the actual SQL query
	SQL string `json:"sql"`

	// Count is the number of times this query was executed
	Count int `json:"count"`

	// AvgTime is the average execution time in milliseconds
	AvgTime float64 `json:"avgTime"`

	// TotalTime is the cumulative execution time in milliseconds
	TotalTime float64 `json:"totalTime"`

	// LastExecuted is when this query was last run
	LastExecuted string `json:"lastExecuted"`

	// Issue indicates a detected problem (n+1, slow, or empty)
	Issue string `json:"issue,omitempty"`
}

// DatabaseHealth represents overall database health metrics
type DatabaseHealth struct {
	// Score is the overall health score (0-100)
	Score int `json:"score"`

	// Status is the connection status
	Status string `json:"status"`

	// Connections shows active connections
	Connections ConnectionMetrics `json:"connections"`

	// Performance shows performance metrics
	Performance PerformanceMetrics `json:"performance"`

	// Issues are detected problems
	Issues []HealthIssue `json:"issues"`

	// SlowQueries are the slowest queries
	SlowQueries []SlowQuery `json:"slowQueries"`

	// TableStats are table statistics
	TableStats []TableStatistic `json:"tableStats"`

	// LastChecked is when health was last checked
	LastChecked string `json:"lastChecked"`
}

// ConnectionMetrics represents database connection metrics
type ConnectionMetrics struct {
	// Active is the number of active connections
	Active int `json:"active"`

	// Max is the maximum allowed connections
	Max int `json:"max"`

	// Idle is the number of idle connections
	Idle int `json:"idle"`

	// Utilization is the percentage of connections in use
	Utilization float64 `json:"utilization"`
}

// PerformanceMetrics represents database performance metrics
type PerformanceMetrics struct {
	// CacheHitRate is the cache hit percentage
	CacheHitRate float64 `json:"cacheHitRate"`

	// TransactionsPerSecond shows TPS
	TransactionsPerSecond float64 `json:"transactionsPerSecond"`

	// AvgQueryTime is average query execution time in ms
	AvgQueryTime float64 `json:"avgQueryTime"`

	// SlowQueryCount is number of slow queries
	SlowQueryCount int `json:"slowQueryCount"`
}

// HealthIssue represents a detected database issue
type HealthIssue struct {
	// ID is unique identifier
	ID string `json:"id"`

	// Type is the issue type
	Type string `json:"type"`

	// Severity is critical, warning, or info
	Severity string `json:"severity"`

	// Title is the issue title
	Title string `json:"title"`

	// Description explains the issue
	Description string `json:"description"`

	// Table is the affected table (if applicable)
	Table string `json:"table,omitempty"`

	// Impact describes the impact
	Impact string `json:"impact"`

	// Recommendation suggests how to fix
	Recommendation string `json:"recommendation,omitempty"`
}

// SlowQuery represents a slow query
type SlowQuery struct {
	// Query is the SQL query
	Query string `json:"query"`

	// Time is execution time in ms
	Time float64 `json:"time"`

	// Count is how many times executed
	Count int `json:"count"`

	// Fingerprint is normalized query
	Fingerprint string `json:"fingerprint"`
}

// TableStatistic represents table statistics
type TableStatistic struct {
	// Name is the table name
	Name string `json:"name"`

	// Rows is the row count
	Rows int64 `json:"rows"`

	// Size is the table size in bytes
	Size int64 `json:"size"`

	// IndexCount is number of indexes
	IndexCount int `json:"indexCount"`

	// Bloat is the bloat percentage
	Bloat float64 `json:"bloat"`

	// SizeFormatted is human-readable size
	SizeFormatted string `json:"sizeFormatted"`
}
