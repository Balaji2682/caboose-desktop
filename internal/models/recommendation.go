package models

// SmartRecommendation represents an intelligent query optimization recommendation
type SmartRecommendation struct {
	ID              string         `json:"id"`
	Type            string         `json:"type"`           // n+1, index, slow, select-star, duplicate, structure
	Severity        string         `json:"severity"`       // critical, high, medium, low
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	Impact          ImpactEstimate `json:"impact"`
	AffectedQueries []string       `json:"affectedQueries"` // Query IDs or fingerprints
	Fix             RecommendationFix `json:"fix"`
	EstimatedEffort string         `json:"estimatedEffort"` // trivial, easy, moderate, complex
}

// ImpactEstimate estimates the performance improvement from applying a recommendation
type ImpactEstimate struct {
	QueryTimeReduction  float64 `json:"queryTimeReduction"`  // Percentage (0-100)
	QueryCountReduction int     `json:"queryCountReduction"` // For N+1 queries
	TotalTimeSaved      float64 `json:"totalTimeSaved"`      // Milliseconds per request
	ConfidenceScore     int     `json:"confidenceScore"`     // 0-100
}

// RecommendationFix contains the suggested fix for a recommendation
type RecommendationFix struct {
	Type             string `json:"type"`             // rails-code, sql-index, query-rewrite, configuration
	Code             string `json:"code"`             // The actual code/SQL to apply
	Explanation      string `json:"explanation"`      // Why this fix helps
	RailsModel       string `json:"railsModel,omitempty"`
	RailsAssociation string `json:"railsAssociation,omitempty"`
}

// RequestQueryGroup represents queries grouped by HTTP request
type RequestQueryGroup struct {
	RequestID      string      `json:"requestId"`
	Endpoint       string      `json:"endpoint"`         // /api/users, etc.
	Method         string      `json:"method"`           // GET, POST, etc.
	Timestamp      string      `json:"timestamp"`
	TotalQueries   int         `json:"totalQueries"`
	TotalDuration  float64     `json:"totalDuration"`    // Total time in ms
	Queries        []QueryInfo `json:"queries"`
	N1Warnings     []N1Warning `json:"n1Warnings"`
	SlowQueries    []QueryInfo `json:"slowQueries"`
	DuplicateCount int         `json:"duplicateCount"`
	HealthScore    int         `json:"healthScore"`      // 0-100
}

// TableDistribution shows query distribution by table
type TableDistribution struct {
	Table      string  `json:"table"`
	QueryCount int     `json:"queryCount"`
	AvgTime    float64 `json:"avgTime"`
	TotalTime  float64 `json:"totalTime"`
	IssueCount int     `json:"issueCount"`
}

// OperationDistribution shows query distribution by operation type
type OperationDistribution struct {
	Operation  string  `json:"operation"`  // SELECT, INSERT, UPDATE, DELETE
	Count      int     `json:"count"`
	AvgTime    float64 `json:"avgTime"`
	Percentage float64 `json:"percentage"`
}

// QueryDistribution contains distribution analysis
type QueryDistribution struct {
	ByTable     []TableDistribution     `json:"byTable"`
	ByOperation []OperationDistribution `json:"byOperation"`
}

// QueryComparison represents before/after comparison of query optimization
type QueryComparison struct {
	Before      QueryExecution `json:"before"`
	After       QueryExecution `json:"after"`
	Improvement Improvement    `json:"improvement"`
}

// QueryExecution represents a query execution with EXPLAIN results
type QueryExecution struct {
	SQL              string  `json:"sql"`
	ExplainResult    interface{} `json:"explainResult"` // Can be ExplainResult from database package
	EstimatedTime    float64 `json:"estimatedTime"`
	RowsExamined     int64   `json:"rowsExamined"`
	PerformanceScore int     `json:"performanceScore"` // 0-100
}

// Improvement shows the improvement metrics between two query executions
type Improvement struct {
	TimeReduction  float64 `json:"timeReduction"`  // Percentage
	RowsReduction  float64 `json:"rowsReduction"`  // Percentage
	ScoreImprovement int   `json:"scoreImprovement"` // Absolute difference
}
