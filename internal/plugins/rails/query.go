package rails

import (
	"fmt"
	"strings"

	"github.com/caboose-desktop/internal/models"
)

// QueryAnalyzer analyzes SQL queries for performance issues
type QueryAnalyzer struct {
	slowThreshold float64 // in milliseconds
}

// NewQueryAnalyzer creates a new query analyzer
func NewQueryAnalyzer() *QueryAnalyzer {
	return &QueryAnalyzer{
		slowThreshold: 100.0, // 100ms default
	}
}

// SetSlowThreshold sets the slow query threshold in milliseconds
func (qa *QueryAnalyzer) SetSlowThreshold(threshold float64) {
	qa.slowThreshold = threshold
}

// Analyze analyzes a single SQL query
func (qa *QueryAnalyzer) Analyze(sql string, duration float64) *models.QueryAnalysis {
	fingerprint := fingerprintSQL(sql)
	operation := detectSQLOperation(sql)
	table := detectTable(sql)

	queryInfo := models.QueryInfo{
		SQL:           sql,
		Fingerprint:   fingerprint,
		Duration:      duration,
		Table:         table,
		Operation:     operation,
		Count:         1,
		IsSlow:        duration > qa.slowThreshold,
		HasSelectStar: strings.Contains(strings.ToUpper(sql), "SELECT *"),
	}

	analysis := &models.QueryAnalysis{
		Queries:       []models.QueryInfo{queryInfo},
		TotalQueries:  1,
		TotalDuration: duration,
	}

	if queryInfo.IsSlow {
		analysis.SlowQueries = []models.QueryInfo{queryInfo}
	}

	return analysis
}

// AnalyzeRequest analyzes all queries from a single request
func (qa *QueryAnalyzer) AnalyzeRequest(requestID string, queries []models.QueryInfo) *models.QueryAnalysis {
	analysis := &models.QueryAnalysis{
		RequestID:     requestID,
		Queries:       queries,
		TotalQueries:  len(queries),
		TotalDuration: 0,
	}

	// Track fingerprints for N+1 detection
	fingerprints := make(map[string][]models.QueryInfo)

	for _, q := range queries {
		analysis.TotalDuration += q.Duration

		if q.IsSlow {
			analysis.SlowQueries = append(analysis.SlowQueries, q)
		}

		fingerprints[q.Fingerprint] = append(fingerprints[q.Fingerprint], q)
	}

	// Detect N+1 patterns
	analysis.N1Warnings = qa.detectN1Patterns(fingerprints)
	analysis.DuplicateCount = qa.countDuplicates(fingerprints)

	return analysis
}

// detectN1Patterns identifies N+1 query patterns
func (qa *QueryAnalyzer) detectN1Patterns(fingerprints map[string][]models.QueryInfo) []models.N1Warning {
	var warnings []models.N1Warning

	for fingerprint, queries := range fingerprints {
		count := len(queries)

		// N+1 threshold: same query executed 3+ times
		if count < 3 {
			continue
		}

		// Calculate total duration
		var totalDuration float64
		var examples []string
		for i, q := range queries {
			totalDuration += q.Duration
			if i < 3 { // Keep first 3 as examples
				examples = append(examples, q.SQL)
			}
		}

		// Calculate confidence based on count and pattern
		confidence := qa.calculateN1Confidence(queries)

		if confidence < 50 {
			continue
		}

		table := ""
		if len(queries) > 0 {
			table = queries[0].Table
		}

		warning := models.N1Warning{
			Fingerprint:   fingerprint,
			Table:         table,
			Count:         count,
			TotalDuration: totalDuration,
			Confidence:    confidence,
			Suggestion:    qa.generateSuggestion(table, queries[0].Operation),
			Examples:      examples,
		}

		warnings = append(warnings, warning)
	}

	return warnings
}

// calculateN1Confidence calculates confidence that this is an N+1 pattern
func (qa *QueryAnalyzer) calculateN1Confidence(queries []models.QueryInfo) int {
	if len(queries) < 3 {
		return 0
	}

	confidence := 50 // Base confidence

	// More occurrences = higher confidence
	if len(queries) >= 5 {
		confidence += 10
	}
	if len(queries) >= 10 {
		confidence += 15
	}
	if len(queries) >= 20 {
		confidence += 10
	}

	// SELECT queries are more likely to be N+1
	if len(queries) > 0 && queries[0].Operation == "SELECT" {
		confidence += 10
	}

	// Similar durations suggest loop execution
	if qa.hasSimilarDurations(queries) {
		confidence += 5
	}

	if confidence > 100 {
		confidence = 100
	}

	return confidence
}

// hasSimilarDurations checks if queries have similar execution times
func (qa *QueryAnalyzer) hasSimilarDurations(queries []models.QueryInfo) bool {
	if len(queries) < 2 {
		return false
	}

	var sum float64
	for _, q := range queries {
		sum += q.Duration
	}
	avg := sum / float64(len(queries))

	// Check if all durations are within 50% of average
	for _, q := range queries {
		if q.Duration < avg*0.5 || q.Duration > avg*1.5 {
			return false
		}
	}

	return true
}

// generateSuggestion generates a fix suggestion for N+1 patterns
func (qa *QueryAnalyzer) generateSuggestion(table, operation string) string {
	if operation != "SELECT" {
		return "Consider batching these queries"
	}

	suggestions := []string{
		fmt.Sprintf("Use `includes(:%s)` to eager load associations", toSingular(table)),
		fmt.Sprintf("Use `preload(:%s)` for separate queries", toSingular(table)),
		fmt.Sprintf("Use `eager_load(:%s)` for LEFT OUTER JOIN", toSingular(table)),
	}

	return strings.Join(suggestions, " OR ")
}

// countDuplicates counts the total number of duplicate queries
func (qa *QueryAnalyzer) countDuplicates(fingerprints map[string][]models.QueryInfo) int {
	count := 0
	for _, queries := range fingerprints {
		if len(queries) > 1 {
			count += len(queries) - 1
		}
	}
	return count
}

// toSingular is a simple pluralization helper
func toSingular(word string) string {
	if strings.HasSuffix(word, "ies") {
		return word[:len(word)-3] + "y"
	}
	if strings.HasSuffix(word, "es") {
		return word[:len(word)-2]
	}
	if strings.HasSuffix(word, "s") {
		return word[:len(word)-1]
	}
	return word
}

// CalculateHealth calculates database health metrics
func (qa *QueryAnalyzer) CalculateHealth(analyses []*models.QueryAnalysis) *models.DatabaseHealth {
	health := &models.DatabaseHealth{
		Score: 100,
	}

	var totalQueries, slowCount, n1Count, selectStarCount int
	var totalDuration float64

	for _, a := range analyses {
		totalQueries += a.TotalQueries
		totalDuration += a.TotalDuration
		slowCount += len(a.SlowQueries)
		n1Count += len(a.N1Warnings)

		for _, q := range a.Queries {
			if q.HasSelectStar {
				selectStarCount++
			}
		}
	}

	health.TotalQueries = totalQueries
	health.SlowQueryCount = slowCount
	health.N1Count = n1Count
	health.SelectStarCount = selectStarCount

	if totalQueries > 0 {
		health.AverageDuration = totalDuration / float64(totalQueries)
	}

	// Calculate score (start at 100, subtract for issues)
	// Slow queries: -2 points each (max -30)
	slowPenalty := slowCount * 2
	if slowPenalty > 30 {
		slowPenalty = 30
	}
	health.Score -= slowPenalty

	// N+1 patterns: -10 points each (max -40)
	n1Penalty := n1Count * 10
	if n1Penalty > 40 {
		n1Penalty = 40
	}
	health.Score -= n1Penalty

	// SELECT *: -1 point each (max -20)
	selectStarPenalty := selectStarCount
	if selectStarPenalty > 20 {
		selectStarPenalty = 20
	}
	health.Score -= selectStarPenalty

	// High query count: -10 points if avg queries > 20 per request
	if len(analyses) > 0 && totalQueries/len(analyses) > 20 {
		health.Score -= 10
	}

	if health.Score < 0 {
		health.Score = 0
	}

	// Generate recommendations
	health.Recommendations = qa.generateRecommendations(health)

	return health
}

// generateRecommendations generates improvement suggestions
func (qa *QueryAnalyzer) generateRecommendations(health *models.DatabaseHealth) []string {
	var recs []string

	if health.N1Count > 0 {
		recs = append(recs, fmt.Sprintf("Fix %d N+1 query pattern(s) using eager loading", health.N1Count))
	}

	if health.SlowQueryCount > 0 {
		recs = append(recs, fmt.Sprintf("Optimize %d slow query(ies) - consider adding indexes", health.SlowQueryCount))
	}

	if health.SelectStarCount > 0 {
		recs = append(recs, fmt.Sprintf("Replace %d SELECT * with specific columns", health.SelectStarCount))
	}

	if health.AverageDuration > 50 {
		recs = append(recs, "Average query duration is high - review query plans")
	}

	if len(recs) == 0 {
		recs = append(recs, "Database performance looks good!")
	}

	return recs
}
