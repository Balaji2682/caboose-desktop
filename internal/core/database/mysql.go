package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// MySQLDriver implements the Driver interface for MySQL
type MySQLDriver struct {
	db       *sql.DB
	config   ConnectionConfig
	database string
}

// NewMySQLDriver creates a new MySQL driver
func NewMySQLDriver() *MySQLDriver {
	return &MySQLDriver{}
}

// Connect establishes a connection to MySQL
func (d *MySQLDriver) Connect(config ConnectionConfig) error {
	// Build DSN: user:password@tcp(host:port)/database?parseTime=true
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&timeout=10s",
		config.User,
		config.Password,
		config.Host,
		config.Port,
		config.Database,
	)

	// Add SSL mode if specified
	if config.SSLMode != "" && config.SSLMode != "disable" {
		dsn += "&tls=" + config.SSLMode
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open connection: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("failed to connect: %w", err)
	}

	d.db = db
	d.config = config
	d.database = config.Database

	return nil
}

// Disconnect closes the MySQL connection
func (d *MySQLDriver) Disconnect() error {
	if d.db != nil {
		err := d.db.Close()
		d.db = nil
		return err
	}
	return nil
}

// Ping tests the connection
func (d *MySQLDriver) Ping() error {
	if d.db == nil {
		return fmt.Errorf("not connected")
	}
	return d.db.Ping()
}

// GetTables returns all tables in the database
func (d *MySQLDriver) GetTables() ([]TableInfo, error) {
	if d.db == nil {
		return nil, fmt.Errorf("not connected")
	}

	query := `
		SELECT
			TABLE_NAME,
			TABLE_SCHEMA,
			TABLE_TYPE,
			IFNULL(TABLE_ROWS, 0) as TABLE_ROWS,
			IFNULL(TABLE_COMMENT, '') as TABLE_COMMENT
		FROM information_schema.TABLES
		WHERE TABLE_SCHEMA = ?
		ORDER BY TABLE_NAME
	`

	rows, err := d.db.Query(query, d.database)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var t TableInfo
		if err := rows.Scan(&t.Name, &t.Schema, &t.Type, &t.RowCount, &t.Comment); err != nil {
			return nil, fmt.Errorf("failed to scan table: %w", err)
		}
		tables = append(tables, t)
	}

	return tables, nil
}

// GetColumns returns columns for a specific table
func (d *MySQLDriver) GetColumns(tableName string) ([]ColumnInfo, error) {
	if d.db == nil {
		return nil, fmt.Errorf("not connected")
	}

	query := `
		SELECT
			c.COLUMN_NAME,
			c.DATA_TYPE,
			c.IS_NULLABLE = 'YES' as IS_NULLABLE,
			c.COLUMN_KEY = 'PRI' as IS_PRIMARY,
			IFNULL(c.COLUMN_DEFAULT, '') as COLUMN_DEFAULT,
			IFNULL(c.COLUMN_COMMENT, '') as COLUMN_COMMENT,
			IFNULL(c.CHARACTER_MAXIMUM_LENGTH, 0) as MAX_LENGTH
		FROM information_schema.COLUMNS c
		WHERE c.TABLE_SCHEMA = ? AND c.TABLE_NAME = ?
		ORDER BY c.ORDINAL_POSITION
	`

	rows, err := d.db.Query(query, d.database, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var c ColumnInfo
		if err := rows.Scan(&c.Name, &c.DataType, &c.IsNullable, &c.IsPrimaryKey, &c.Default, &c.Comment, &c.MaxLength); err != nil {
			return nil, fmt.Errorf("failed to scan column: %w", err)
		}
		columns = append(columns, c)
	}

	return columns, nil
}

// ExecuteQuery executes a SQL query and returns results
func (d *MySQLDriver) ExecuteQuery(query string, limit int) (*QueryResult, error) {
	if d.db == nil {
		return nil, fmt.Errorf("not connected")
	}

	result := &QueryResult{
		Columns:     make([]string, 0),
		ColumnTypes: make([]string, 0),
		Rows:        make([]map[string]interface{}, 0),
	}

	start := time.Now()

	// Detect if this is a SELECT query
	trimmedQuery := strings.TrimSpace(strings.ToUpper(query))
	isSelect := strings.HasPrefix(trimmedQuery, "SELECT") ||
		strings.HasPrefix(trimmedQuery, "SHOW") ||
		strings.HasPrefix(trimmedQuery, "DESCRIBE") ||
		strings.HasPrefix(trimmedQuery, "EXPLAIN")

	if isSelect {
		result.IsSelect = true

		// Add LIMIT if not present and this is a SELECT
		if strings.HasPrefix(trimmedQuery, "SELECT") && !strings.Contains(trimmedQuery, "LIMIT") {
			query = query + fmt.Sprintf(" LIMIT %d", limit)
		}

		rows, err := d.db.Query(query)
		if err != nil {
			result.Error = err.Error()
			result.ExecutionTime = float64(time.Since(start).Microseconds()) / 1000
			return result, nil
		}
		defer rows.Close()

		// Get column info
		columns, err := rows.Columns()
		if err != nil {
			result.Error = err.Error()
			result.ExecutionTime = float64(time.Since(start).Microseconds()) / 1000
			return result, nil
		}
		result.Columns = columns

		// Get column types
		columnTypes, err := rows.ColumnTypes()
		if err == nil {
			for _, ct := range columnTypes {
				result.ColumnTypes = append(result.ColumnTypes, ct.DatabaseTypeName())
			}
		}

		// Scan rows
		for rows.Next() {
			// Create a slice of interface{} to hold values
			values := make([]interface{}, len(columns))
			valuePtrs := make([]interface{}, len(columns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			if err := rows.Scan(valuePtrs...); err != nil {
				continue
			}

			// Convert to map
			row := make(map[string]interface{})
			for i, col := range columns {
				val := values[i]
				// Convert []byte to string for readability
				if b, ok := val.([]byte); ok {
					row[col] = string(b)
				} else {
					row[col] = val
				}
			}
			result.Rows = append(result.Rows, row)
		}

		result.RowCount = len(result.Rows)
	} else {
		// Execute non-SELECT query
		res, err := d.db.Exec(query)
		if err != nil {
			result.Error = err.Error()
			result.ExecutionTime = float64(time.Since(start).Microseconds()) / 1000
			return result, nil
		}

		affected, _ := res.RowsAffected()
		result.AffectedRows = affected
	}

	result.ExecutionTime = float64(time.Since(start).Microseconds()) / 1000

	return result, nil
}

// ExplainQuery returns the execution plan for a query
func (d *MySQLDriver) ExplainQuery(query string) (*ExplainResult, error) {
	if d.db == nil {
		return nil, fmt.Errorf("not connected")
	}

	result := &ExplainResult{
		Query:           query,
		Columns:         make([]string, 0),
		Rows:            make([]map[string]interface{}, 0),
		Recommendations: make([]IndexRecommendation, 0),
	}

	start := time.Now()

	// Prepend EXPLAIN
	explainQuery := "EXPLAIN " + query

	rows, err := d.db.Query(explainQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to explain: %w", err)
	}
	defer rows.Close()

	// Get columns
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}
	result.Columns = columns

	// Scan rows
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		result.Rows = append(result.Rows, row)
	}

	result.ExecutionTime = float64(time.Since(start).Microseconds()) / 1000

	// Analyze EXPLAIN output and generate recommendations
	d.analyzeExplainResults(result)

	return result, nil
}

// analyzeExplainResults analyzes EXPLAIN output and generates recommendations
func (d *MySQLDriver) analyzeExplainResults(result *ExplainResult) {
	analysis := ExplainAnalysis{
		PerformanceScore: 100,
	}

	var totalRows int64
	recommendations := make([]IndexRecommendation, 0)

	for _, row := range result.Rows {
		// Extract common EXPLAIN fields
		table := getStringValue(row, "table")
		accessType := getStringValue(row, "type")
		possibleKeys := getStringValue(row, "possible_keys")
		key := getStringValue(row, "key")
		extra := getStringValue(row, "Extra")
		rows := getInt64Value(row, "rows")

		totalRows += rows

		// Check for table scans
		if accessType == "ALL" {
			analysis.HasTableScan = true
			analysis.PerformanceScore -= 30

			// Generate recommendation for missing index
			whereColumns := extractWhereColumns(result.Query, table)
			if len(whereColumns) > 0 {
				rec := IndexRecommendation{
					Table:    table,
					Columns:  whereColumns,
					Reason:   fmt.Sprintf("Full table scan detected (%d rows examined). Query is not using any index.", rows),
					Severity: "high",
					SQL:      fmt.Sprintf("CREATE INDEX idx_%s_%s ON %s (%s);", table, strings.Join(whereColumns, "_"), table, strings.Join(whereColumns, ", ")),
					EstimatedImpact: fmt.Sprintf("Could reduce rows examined from %d to <100 with proper indexing", rows),
				}
				recommendations = append(recommendations, rec)
			}
		} else if accessType == "index" || accessType == "range" || accessType == "ref" {
			analysis.HasIndexScan = true
		}

		// Check for using filesort
		if strings.Contains(extra, "Using filesort") {
			analysis.UsingFilesort = true
			analysis.PerformanceScore -= 15

			orderByColumns := extractOrderByColumns(result.Query)
			if len(orderByColumns) > 0 && table != "" {
				rec := IndexRecommendation{
					Table:    table,
					Columns:  orderByColumns,
					Reason:   "Using filesort - query requires sorting without index support",
					Severity: "medium",
					SQL:      fmt.Sprintf("CREATE INDEX idx_%s_sort ON %s (%s);", table, table, strings.Join(orderByColumns, ", ")),
					EstimatedImpact: "Eliminate filesort operation, improving ORDER BY performance",
				}
				recommendations = append(recommendations, rec)
			}
		}

		// Check for using temporary
		if strings.Contains(extra, "Using temporary") {
			analysis.UsingTemporary = true
			analysis.PerformanceScore -= 10
		}

		// Check for missing index when possible_keys exists but not used
		if possibleKeys != "" && possibleKeys != "NULL" && (key == "" || key == "NULL") {
			analysis.PerformanceScore -= 20
		}
	}

	analysis.RowsExamined = totalRows

	// Generate summary
	if analysis.HasTableScan {
		analysis.Summary = fmt.Sprintf("⚠️ Full table scan detected - %d rows examined. Index optimization recommended.", totalRows)
	} else if analysis.UsingFilesort {
		analysis.Summary = "⚠️ Query uses filesort. Consider adding index for ORDER BY columns."
	} else if analysis.UsingTemporary {
		analysis.Summary = "⚠️ Query uses temporary table. Performance may be impacted."
	} else if analysis.HasIndexScan {
		analysis.Summary = fmt.Sprintf("✓ Query is using indexes efficiently (%d rows examined).", totalRows)
	} else {
		analysis.Summary = "Query execution plan looks reasonable."
	}

	// Ensure score is between 0 and 100
	if analysis.PerformanceScore < 0 {
		analysis.PerformanceScore = 0
	}

	result.Analysis = analysis
	result.Recommendations = recommendations
}

// Helper functions for parsing SQL
func extractWhereColumns(query, table string) []string {
	columns := make([]string, 0)
	query = strings.ToLower(query)

	// Simple WHERE clause extraction (this is basic - could be enhanced)
	whereIdx := strings.Index(query, "where")
	if whereIdx == -1 {
		return columns
	}

	whereClause := query[whereIdx+5:]
	// Extract column names between WHERE and common keywords
	endIdx := len(whereClause)
	for _, keyword := range []string{"order by", "group by", "limit", "having"} {
		if idx := strings.Index(whereClause, keyword); idx != -1 && idx < endIdx {
			endIdx = idx
		}
	}
	whereClause = whereClause[:endIdx]

	// Look for column = value patterns
	words := strings.Fields(whereClause)
	for i, word := range words {
		word = strings.Trim(word, "(),")
		if i+1 < len(words) && (words[i+1] == "=" || words[i+1] == ">" || words[i+1] == "<" || words[i+1] == "in") {
			// Remove table prefix if exists
			if idx := strings.LastIndex(word, "."); idx != -1 {
				word = word[idx+1:]
			}
			// Remove quotes
			word = strings.Trim(word, "\"'`")
			if word != "" && !strings.Contains(word, " ") {
				columns = append(columns, word)
			}
		}
	}

	return columns
}

func extractOrderByColumns(query string) []string {
	columns := make([]string, 0)
	query = strings.ToLower(query)

	orderByIdx := strings.Index(query, "order by")
	if orderByIdx == -1 {
		return columns
	}

	orderByClause := query[orderByIdx+8:]
	// Find end of ORDER BY clause
	endIdx := len(orderByClause)
	for _, keyword := range []string{"limit", "offset"} {
		if idx := strings.Index(orderByClause, keyword); idx != -1 && idx < endIdx {
			endIdx = idx
		}
	}
	orderByClause = orderByClause[:endIdx]

	// Split by comma and extract column names
	parts := strings.Split(orderByClause, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		// Remove ASC/DESC
		part = strings.Replace(part, "asc", "", -1)
		part = strings.Replace(part, "desc", "", -1)
		part = strings.TrimSpace(part)

		// Remove table prefix
		if idx := strings.LastIndex(part, "."); idx != -1 {
			part = part[idx+1:]
		}
		// Remove quotes
		part = strings.Trim(part, "\"'`")
		if part != "" {
			columns = append(columns, part)
		}
	}

	return columns
}

func getStringValue(row map[string]interface{}, key string) string {
	val, ok := row[key]
	if !ok {
		return ""
	}
	if val == nil {
		return ""
	}
	if s, ok := val.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", val)
}

func getInt64Value(row map[string]interface{}, key string) int64 {
	val, ok := row[key]
	if !ok {
		return 0
	}
	if val == nil {
		return 0
	}

	switch v := val.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case int32:
		return int64(v)
	case float64:
		return int64(v)
	case string:
		// Try to parse string as int
		var n int64
		fmt.Sscanf(v, "%d", &n)
		return n
	}
	return 0
}

// GetVersion returns the MySQL version
func (d *MySQLDriver) GetVersion() (string, error) {
	if d.db == nil {
		return "", fmt.Errorf("not connected")
	}

	var version string
	err := d.db.QueryRow("SELECT VERSION()").Scan(&version)
	if err != nil {
		return "", err
	}

	return version, nil
}

// GetDB returns the underlying sql.DB connection
func (d *MySQLDriver) GetDB() *sql.DB {
	return d.db
}

// GetHealthMetrics returns database health metrics
func (d *MySQLDriver) GetHealthMetrics() (*DatabaseHealth, error) {
	if d.db == nil {
		return nil, fmt.Errorf("not connected")
	}

	health := &DatabaseHealth{
		Score:       100,
		Status:      "healthy",
		Issues:      make([]HealthIssue, 0),
		SlowQueries: make([]SlowQuery, 0),
		TableStats:  make([]TableStatistic, 0),
		LastChecked: time.Now().Format(time.RFC3339),
	}

	// Get connection metrics
	connMetrics, err := d.getConnectionMetrics()
	if err == nil {
		health.Connections = connMetrics
	}

	// Get performance metrics
	perfMetrics, err := d.getPerformanceMetrics()
	if err == nil {
		health.Performance = perfMetrics
	}

	// Get table statistics
	tableStats, err := d.getTableStatistics()
	if err == nil {
		health.TableStats = tableStats
	}

	// Analyze issues
	health.analyzeIssues()

	return health, nil
}

// getConnectionMetrics gets connection pool metrics
func (d *MySQLDriver) getConnectionMetrics() (ConnectionMetrics, error) {
	var metrics ConnectionMetrics

	// Get max connections
	var maxConns int
	err := d.db.QueryRow("SHOW VARIABLES LIKE 'max_connections'").Scan(new(string), &maxConns)
	if err == nil {
		metrics.Max = maxConns
	} else {
		metrics.Max = 151 // MySQL default
	}

	// Get active connections
	var active int
	err = d.db.QueryRow("SHOW STATUS LIKE 'Threads_connected'").Scan(new(string), &active)
	if err == nil {
		metrics.Active = active
	}

	// Get running connections
	var running int
	err = d.db.QueryRow("SHOW STATUS LIKE 'Threads_running'").Scan(new(string), &running)
	if err == nil {
		metrics.Idle = metrics.Active - running
		if metrics.Idle < 0 {
			metrics.Idle = 0
		}
	}

	// Calculate utilization
	if metrics.Max > 0 {
		metrics.Utilization = float64(metrics.Active) / float64(metrics.Max) * 100
	}

	return metrics, nil
}

// getPerformanceMetrics gets database performance metrics
func (d *MySQLDriver) getPerformanceMetrics() (PerformanceMetrics, error) {
	var metrics PerformanceMetrics

	// Get cache hit rate (InnoDB buffer pool)
	var reads, readRequests float64
	err := d.db.QueryRow("SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_reads'").Scan(new(string), &reads)
	if err == nil {
		d.db.QueryRow("SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests'").Scan(new(string), &readRequests)
		if readRequests > 0 {
			metrics.CacheHitRate = ((readRequests - reads) / readRequests) * 100
		}
	}

	// Get queries per second (approximate)
	var questions, uptime float64
	err = d.db.QueryRow("SHOW GLOBAL STATUS LIKE 'Questions'").Scan(new(string), &questions)
	if err == nil {
		d.db.QueryRow("SHOW GLOBAL STATUS LIKE 'Uptime'").Scan(new(string), &uptime)
		if uptime > 0 {
			metrics.TransactionsPerSecond = questions / uptime
		}
	}

	return metrics, nil
}

// getTableStatistics gets table size and statistics
func (d *MySQLDriver) getTableStatistics() ([]TableStatistic, error) {
	query := `
		SELECT
			TABLE_NAME,
			IFNULL(TABLE_ROWS, 0) as row_count,
			IFNULL(DATA_LENGTH + INDEX_LENGTH, 0) as total_size,
			(SELECT COUNT(*) FROM information_schema.STATISTICS s
			 WHERE s.TABLE_SCHEMA = t.TABLE_SCHEMA AND s.TABLE_NAME = t.TABLE_NAME) as index_count
		FROM information_schema.TABLES t
		WHERE TABLE_SCHEMA = ?
		ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
		LIMIT 20
	`

	rows, err := d.db.Query(query, d.database)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := make([]TableStatistic, 0)
	for rows.Next() {
		var stat TableStatistic
		err := rows.Scan(&stat.Name, &stat.Rows, &stat.Size, &stat.IndexCount)
		if err != nil {
			continue
		}

		// Format size
		stat.SizeFormatted = formatBytes(stat.Size)

		// Estimate bloat (simplified - real bloat calculation is complex)
		if stat.Rows > 0 {
			avgRowSize := float64(stat.Size) / float64(stat.Rows)
			if avgRowSize > 1000 { // If avg row > 1KB, might have bloat
				stat.Bloat = 5.0 // Simplified estimate
			} else {
				stat.Bloat = 2.0
			}
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// analyzeIssues analyzes database and adds detected issues
func (h *DatabaseHealth) analyzeIssues() {
	issueID := 0

	// Check connection utilization
	if h.Connections.Utilization > 80 {
		issueID++
		h.Issues = append(h.Issues, HealthIssue{
			ID:          fmt.Sprintf("issue-%d", issueID),
			Type:        "High Connection Usage",
			Severity:    "warning",
			Title:       "Connection pool utilization is high",
			Description: fmt.Sprintf("%.1f%% of connections are in use", h.Connections.Utilization),
			Impact:      "May lead to connection exhaustion",
			Recommendation: "Consider increasing max_connections or optimizing connection usage",
		})
		h.Score -= 10
	}

	// Check cache hit rate
	if h.Performance.CacheHitRate < 90 && h.Performance.CacheHitRate > 0 {
		issueID++
		h.Issues = append(h.Issues, HealthIssue{
			ID:          fmt.Sprintf("issue-%d", issueID),
			Type:        "Low Cache Hit Rate",
			Severity:    "warning",
			Title:       "Buffer pool cache hit rate is low",
			Description: fmt.Sprintf("Cache hit rate is %.1f%%", h.Performance.CacheHitRate),
			Impact:      "Increased disk I/O and slower queries",
			Recommendation: "Consider increasing innodb_buffer_pool_size",
		})
		h.Score -= 10
	}

	// Check for large tables
	for _, table := range h.TableStats {
		if table.Rows > 1000000 {
			issueID++
			h.Issues = append(h.Issues, HealthIssue{
				ID:          fmt.Sprintf("issue-%d", issueID),
				Type:        "Large Table",
				Severity:    "info",
				Title:       fmt.Sprintf("Table %s has many rows", table.Name),
				Description: fmt.Sprintf("Table has %s rows (%s)", formatNumber(table.Rows), table.SizeFormatted),
				Table:       table.Name,
				Impact:      "Queries may be slower without proper indexes",
				Recommendation: "Ensure proper indexing and consider partitioning",
			})
		}

		if table.Bloat > 10 {
			issueID++
			h.Issues = append(h.Issues, HealthIssue{
				ID:          fmt.Sprintf("issue-%d", issueID),
				Type:        "Table Bloat",
				Severity:    "warning",
				Title:       fmt.Sprintf("Table %s has significant bloat", table.Name),
				Description: fmt.Sprintf("Estimated bloat: %.1f%%", table.Bloat),
				Table:       table.Name,
				Impact:      "Wasted disk space and slower queries",
				Recommendation: "Run OPTIMIZE TABLE to reclaim space",
			})
			h.Score -= 5
		}
	}

	// Ensure score is between 0 and 100
	if h.Score < 0 {
		h.Score = 0
	}
	if h.Score > 100 {
		h.Score = 100
	}

	// Set status based on score
	if h.Score >= 90 {
		h.Status = "excellent"
	} else if h.Score >= 70 {
		h.Status = "good"
	} else if h.Score >= 50 {
		h.Status = "fair"
	} else {
		h.Status = "poor"
	}
}

// Helper functions
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func formatNumber(n int64) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	if n < 1000000 {
		return fmt.Sprintf("%.1fk", float64(n)/1000)
	}
	return fmt.Sprintf("%.1fM", float64(n)/1000000)
}
