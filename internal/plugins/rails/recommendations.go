package rails

import (
	"fmt"
	"sort"
	"strings"

	"github.com/caboose-desktop/internal/core/database"
	"github.com/caboose-desktop/internal/models"
	"github.com/google/uuid"
)

// RecommendationEngine generates smart optimization recommendations
type RecommendationEngine struct {
	analyzer *QueryAnalyzer
}

// NewRecommendationEngine creates a new recommendation engine
func NewRecommendationEngine() *RecommendationEngine {
	return &RecommendationEngine{
		analyzer: NewQueryAnalyzer(),
	}
}

// GenerateRecommendations analyzes queries and generates prioritized recommendations
func (re *RecommendationEngine) GenerateRecommendations(
	stats []database.QueryStatistic,
	n1Warnings []models.N1Warning,
	explainResults map[string]*database.ExplainResult,
) []models.SmartRecommendation {
	recommendations := []models.SmartRecommendation{}

	// Generate N+1 recommendations
	for _, warning := range n1Warnings {
		rec := re.generateN1Recommendation(warning)
		recommendations = append(recommendations, rec)
	}

	// Generate index recommendations from EXPLAIN results
	for queryID, explainResult := range explainResults {
		if len(explainResult.Recommendations) > 0 {
			for _, indexRec := range explainResult.Recommendations {
				rec := re.generateIndexRecommendation(queryID, indexRec, explainResult)
				recommendations = append(recommendations, rec)
			}
		}
	}

	// Generate slow query recommendations
	for _, stat := range stats {
		if stat.AvgTime > 100 && stat.Issue != "n+1" {
			rec := re.generateSlowQueryRecommendation(stat)
			recommendations = append(recommendations, rec)
		}
	}

	// Generate SELECT * recommendations
	for _, stat := range stats {
		if strings.Contains(strings.ToUpper(stat.SQL), "SELECT *") {
			rec := re.generateSelectStarRecommendation(stat)
			recommendations = append(recommendations, rec)
		}
	}

	// Prioritize recommendations
	return re.PrioritizeRecommendations(recommendations)
}

// generateN1Recommendation creates a recommendation for N+1 query patterns
func (re *RecommendationEngine) generateN1Recommendation(warning models.N1Warning) models.SmartRecommendation {
	// Extract model name from table
	modelName := re.tableToModel(warning.Table)

	// Generate Rails code fixes
	railsFixes := []string{
		fmt.Sprintf("Model.includes(:%s)", modelName),
		fmt.Sprintf("Model.preload(:%s)", modelName),
		fmt.Sprintf("Model.eager_load(:%s)", modelName),
	}

	// Use the suggestion from the warning, or default to includes
	fix := warning.Suggestion
	if fix == "" {
		fix = railsFixes[0]
	}

	// Calculate impact
	impact := re.calculateN1Impact(warning)

	severity := "high"
	if warning.Count >= 10 {
		severity = "critical"
	} else if warning.Count >= 5 {
		severity = "high"
	} else {
		severity = "medium"
	}

	return models.SmartRecommendation{
		ID:          uuid.New().String(),
		Type:        "n+1",
		Severity:    severity,
		Title:       fmt.Sprintf("N+1 Query Pattern Detected on %s", warning.Table),
		Description: fmt.Sprintf("This query is being executed %d times in a loop, causing %d separate database calls. Use eager loading to reduce this to 1-2 queries.", warning.Count, warning.Count),
		Impact:      impact,
		AffectedQueries: []string{warning.Fingerprint},
		Fix: models.RecommendationFix{
			Type:             "rails-code",
			Code:             fix,
			Explanation:      "Use includes() to eager load the association in a single query, eliminating the N+1 pattern.",
			RailsModel:       re.fingerprintToModel(warning.Fingerprint),
			RailsAssociation: modelName,
		},
		EstimatedEffort: "easy",
	}
}

// generateIndexRecommendation creates a recommendation for missing indexes
func (re *RecommendationEngine) generateIndexRecommendation(
	queryID string,
	indexRec database.IndexRecommendation,
	explainResult *database.ExplainResult,
) models.SmartRecommendation {
	// Calculate impact based on query performance
	impact := models.ImpactEstimate{
		QueryTimeReduction:  re.estimateIndexImpact(explainResult.Analysis.PerformanceScore),
		QueryCountReduction: 0,
		TotalTimeSaved:      explainResult.ExecutionTime * 0.7, // Estimate 70% reduction
		ConfidenceScore:     70,
	}

	// Adjust confidence based on severity
	switch indexRec.Severity {
	case "high":
		impact.ConfidenceScore = 85
	case "medium":
		impact.ConfidenceScore = 70
	case "low":
		impact.ConfidenceScore = 50
	}

	effort := "easy"
	if len(indexRec.Columns) > 2 {
		effort = "moderate" // Composite indexes are more complex
	}

	return models.SmartRecommendation{
		ID:              uuid.New().String(),
		Type:            "index",
		Severity:        indexRec.Severity,
		Title:           fmt.Sprintf("Add Index on %s.%s", indexRec.Table, strings.Join(indexRec.Columns, ", ")),
		Description:     indexRec.Reason,
		Impact:          impact,
		AffectedQueries: []string{queryID},
		Fix: models.RecommendationFix{
			Type:        "sql-index",
			Code:        indexRec.SQL,
			Explanation: indexRec.EstimatedImpact,
		},
		EstimatedEffort: effort,
	}
}

// generateSlowQueryRecommendation creates a recommendation for slow queries
func (re *RecommendationEngine) generateSlowQueryRecommendation(stat database.QueryStatistic) models.SmartRecommendation {
	impact := models.ImpactEstimate{
		QueryTimeReduction:  50, // Estimate 50% improvement
		QueryCountReduction: 0,
		TotalTimeSaved:      stat.AvgTime * float64(stat.Count) * 0.5,
		ConfidenceScore:     60,
	}

	severity := "medium"
	if stat.AvgTime > 500 {
		severity = "high"
	}
	if stat.AvgTime > 1000 {
		severity = "critical"
	}

	return models.SmartRecommendation{
		ID:              uuid.New().String(),
		Type:            "slow",
		Severity:        severity,
		Title:           fmt.Sprintf("Slow Query (%.1fms avg)", stat.AvgTime),
		Description:     fmt.Sprintf("This query is taking longer than expected. Executed %d times with an average time of %.1fms.", stat.Count, stat.AvgTime),
		Impact:          impact,
		AffectedQueries: []string{stat.ID},
		Fix: models.RecommendationFix{
			Type:        "query-rewrite",
			Code:        "Run EXPLAIN to identify bottlenecks and add appropriate indexes",
			Explanation: "Analyze the query execution plan and optimize based on findings. Consider adding indexes, rewriting the query, or denormalizing data.",
		},
		EstimatedEffort: "moderate",
	}
}

// generateSelectStarRecommendation creates a recommendation for SELECT * queries
func (re *RecommendationEngine) generateSelectStarRecommendation(stat database.QueryStatistic) models.SmartRecommendation {
	impact := models.ImpactEstimate{
		QueryTimeReduction:  15, // Modest improvement
		QueryCountReduction: 0,
		TotalTimeSaved:      stat.AvgTime * float64(stat.Count) * 0.15,
		ConfidenceScore:     70,
	}

	return models.SmartRecommendation{
		ID:              uuid.New().String(),
		Type:            "select-star",
		Severity:        "low",
		Title:           "Avoid SELECT * - Specify Required Columns",
		Description:     fmt.Sprintf("This query uses SELECT * which retrieves all columns. Executed %d times.", stat.Count),
		Impact:          impact,
		AffectedQueries: []string{stat.ID},
		Fix: models.RecommendationFix{
			Type:        "query-rewrite",
			Code:        "SELECT id, name, email, created_at FROM table WHERE ...",
			Explanation: "Specify only the columns you need to reduce data transfer and improve performance.",
		},
		EstimatedEffort: "trivial",
	}
}

// calculateN1Impact estimates the performance impact of fixing an N+1 query
func (re *RecommendationEngine) calculateN1Impact(warning models.N1Warning) models.ImpactEstimate {
	// N+1 queries are typically reduced from N queries to 1-2 queries
	queryReduction := warning.Count - 2
	if queryReduction < 0 {
		queryReduction = 0
	}

	// Calculate percentage reduction in query count
	percentReduction := float64(queryReduction) / float64(warning.Count) * 100

	// Estimate time saved (assuming 2 queries remain after fix)
	timeSaved := warning.TotalDuration * (float64(queryReduction) / float64(warning.Count))

	return models.ImpactEstimate{
		QueryTimeReduction:  percentReduction,
		QueryCountReduction: queryReduction,
		TotalTimeSaved:      timeSaved,
		ConfidenceScore:     warning.Confidence,
	}
}

// estimateIndexImpact estimates performance improvement from adding an index
func (re *RecommendationEngine) estimateIndexImpact(performanceScore int) float64 {
	// Lower performance scores mean more potential for improvement
	if performanceScore < 40 {
		return 80.0 // Can improve by 80%
	} else if performanceScore < 60 {
		return 60.0
	} else if performanceScore < 80 {
		return 40.0
	}
	return 20.0
}

// PrioritizeRecommendations sorts recommendations by priority score
func (re *RecommendationEngine) PrioritizeRecommendations(
	recommendations []models.SmartRecommendation,
) []models.SmartRecommendation {
	// Calculate priority score for each recommendation
	type scoredRec struct {
		rec   models.SmartRecommendation
		score float64
	}

	scored := make([]scoredRec, len(recommendations))
	for i, rec := range recommendations {
		score := re.calculatePriorityScore(rec)
		scored[i] = scoredRec{rec: rec, score: score}
	}

	// Sort by score descending
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	// Extract sorted recommendations
	result := make([]models.SmartRecommendation, len(scored))
	for i, s := range scored {
		result[i] = s.rec
	}

	return result
}

// calculatePriorityScore calculates a priority score for a recommendation
func (re *RecommendationEngine) calculatePriorityScore(rec models.SmartRecommendation) float64 {
	score := 0.0

	// Severity weight (40% of score)
	severityWeight := map[string]float64{
		"critical": 100,
		"high":     75,
		"medium":   50,
		"low":      25,
	}
	score += severityWeight[rec.Severity] * 0.4

	// Impact weight (40% of score)
	impactScore := float64(rec.Impact.ConfidenceScore) * (rec.Impact.QueryTimeReduction / 100)
	score += impactScore * 0.4

	// Effort weight (20% of score) - easier fixes rank higher
	effortWeight := map[string]float64{
		"trivial":  1.0,
		"easy":     0.8,
		"moderate": 0.6,
		"complex":  0.4,
	}
	score += effortWeight[rec.EstimatedEffort] * 20

	return score
}

// Helper functions

// tableToModel converts a table name to a Rails model name
func (re *RecommendationEngine) tableToModel(tableName string) string {
	// Simple singularization and capitalization
	// Remove trailing 's' for basic pluralization
	if len(tableName) > 0 && tableName[len(tableName)-1] == 's' {
		tableName = tableName[:len(tableName)-1]
	}
	// Capitalize first letter
	if len(tableName) > 0 {
		tableName = strings.ToUpper(string(tableName[0])) + tableName[1:]
	}
	return tableName
}

// fingerprintToModel extracts model name from query fingerprint
func (re *RecommendationEngine) fingerprintToModel(fingerprint string) string {
	// Extract table name from fingerprint (simplified)
	// Look for "FROM table_name" pattern
	upper := strings.ToUpper(fingerprint)
	if idx := strings.Index(upper, "FROM "); idx != -1 {
		rest := fingerprint[idx+5:]
		words := strings.Fields(rest)
		if len(words) > 0 {
			return re.tableToModel(words[0])
		}
	}
	return ""
}
