package models

// QueryAnalysis represents the analysis results for SQL queries
type QueryAnalysis struct {
	// RequestID groups queries from the same request
	RequestID string `json:"requestId"`

	// Queries is the list of all queries in this request
	Queries []QueryInfo `json:"queries"`

	// TotalQueries is the count of all queries
	TotalQueries int `json:"totalQueries"`

	// TotalDuration is the sum of all query durations in ms
	TotalDuration float64 `json:"totalDuration"`

	// DuplicateCount is the number of duplicate queries
	DuplicateCount int `json:"duplicateCount"`

	// N1Warnings contains detected N+1 query patterns
	N1Warnings []N1Warning `json:"n1Warnings,omitempty"`

	// SlowQueries contains queries exceeding the threshold
	SlowQueries []QueryInfo `json:"slowQueries,omitempty"`
}

// QueryInfo represents information about a single query
type QueryInfo struct {
	// SQL is the original query
	SQL string `json:"sql"`

	// Fingerprint is the normalized query for comparison
	Fingerprint string `json:"fingerprint"`

	// Duration in milliseconds
	Duration float64 `json:"duration"`

	// Table is the primary table being queried
	Table string `json:"table"`

	// Operation is SELECT, INSERT, UPDATE, DELETE, etc.
	Operation string `json:"operation"`

	// Count is how many times this fingerprint appeared
	Count int `json:"count"`

	// IsSlow indicates if this query exceeded the slow threshold
	IsSlow bool `json:"isSlow"`

	// HasSelectStar indicates if this uses SELECT *
	HasSelectStar bool `json:"hasSelectStar"`
}

// N1Warning represents a detected N+1 query pattern
type N1Warning struct {
	// Fingerprint is the repeated query pattern
	Fingerprint string `json:"fingerprint"`

	// Table is the table being queried repeatedly
	Table string `json:"table"`

	// Count is how many times this pattern was repeated
	Count int `json:"count"`

	// TotalDuration is the total time spent on these queries
	TotalDuration float64 `json:"totalDuration"`

	// Confidence is how confident we are this is an N+1 (0-100)
	Confidence int `json:"confidence"`

	// Suggestion is the recommended fix
	Suggestion string `json:"suggestion"`

	// Examples are sample queries from this pattern
	Examples []string `json:"examples,omitempty"`
}

// DatabaseHealth represents overall database health metrics
type DatabaseHealth struct {
	// Score is the overall health score (0-100)
	Score int `json:"score"`

	// TotalQueries is the total number of queries analyzed
	TotalQueries int `json:"totalQueries"`

	// SlowQueryCount is the number of slow queries
	SlowQueryCount int `json:"slowQueryCount"`

	// N1Count is the number of N+1 patterns detected
	N1Count int `json:"n1Count"`

	// SelectStarCount is the number of SELECT * queries
	SelectStarCount int `json:"selectStarCount"`

	// AverageDuration is the average query duration in ms
	AverageDuration float64 `json:"averageDuration"`

	// Recommendations are improvement suggestions
	Recommendations []string `json:"recommendations"`
}
