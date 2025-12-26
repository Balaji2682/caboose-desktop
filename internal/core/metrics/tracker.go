package metrics

import (
	"runtime"
	"sync"
	"time"
)

// SystemMetrics represents system-level metrics
type SystemMetrics struct {
	CPU              float64 `json:"cpu"`
	Memory           float64 `json:"memory"`
	Goroutines       int     `json:"goroutines"`
	Timestamp        string  `json:"timestamp"`
	MemoryAllocMB    float64 `json:"memoryAllocMB"`
	MemorySysMB      float64 `json:"memorySysMB"`
	NumGC            uint32  `json:"numGC"`
}

// RequestMetrics represents HTTP request metrics
type RequestMetrics struct {
	TotalRequests    int64   `json:"totalRequests"`
	RequestRate      float64 `json:"requestRate"` // requests per minute
	AvgResponseTime  float64 `json:"avgResponseTime"`
	ErrorRate        float64 `json:"errorRate"`
	ActiveConnections int    `json:"activeConnections"`
}

// TimeSeriesPoint represents a single point in time series data
type TimeSeriesPoint struct {
	Time         string  `json:"time"`
	CPU          float64 `json:"cpu"`
	Memory       float64 `json:"memory"`
	Requests     int     `json:"requests"`
	ResponseTime float64 `json:"responseTime"`
	Errors       int     `json:"errors"`
}

// EndpointMetric represents metrics for a single endpoint
type EndpointMetric struct {
	Endpoint string  `json:"endpoint"`
	Requests int64   `json:"requests"`
	AvgTime  float64 `json:"avgTime"`
	P95      float64 `json:"p95"`
	Errors   int64   `json:"errors"`
}

// Metrics aggregates all application metrics
type Metrics struct {
	System         SystemMetrics    `json:"system"`
	Requests       RequestMetrics   `json:"requests"`
	TimeSeries     []TimeSeriesPoint `json:"timeSeries"`
	TopEndpoints   []EndpointMetric `json:"topEndpoints"`
	LastUpdated    string           `json:"lastUpdated"`
}

// Tracker tracks and aggregates application metrics
type Tracker struct {
	mu                sync.RWMutex
	startTime         time.Time
	requestCount      int64
	errorCount        int64
	responseTimes     []float64
	maxResponseTimes  int
	timeSeries        []TimeSeriesPoint
	maxTimeSeriesSize int
	endpointMetrics   map[string]*EndpointMetric
	lastCPUTime       time.Time
	lastNumRequests   int64
}

// NewTracker creates a new metrics tracker
func NewTracker() *Tracker {
	return &Tracker{
		startTime:         time.Now(),
		responseTimes:     make([]float64, 0),
		maxResponseTimes:  1000,
		timeSeries:        make([]TimeSeriesPoint, 0),
		maxTimeSeriesSize: 24,
		endpointMetrics:   make(map[string]*EndpointMetric),
		lastCPUTime:       time.Now(),
	}
}

// RecordRequest records a request metric
func (t *Tracker) RecordRequest(endpoint string, duration time.Duration, isError bool) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.requestCount++
	if isError {
		t.errorCount++
	}

	// Record response time
	ms := float64(duration.Milliseconds())
	t.responseTimes = append(t.responseTimes, ms)
	if len(t.responseTimes) > t.maxResponseTimes {
		t.responseTimes = t.responseTimes[1:]
	}

	// Update endpoint metrics
	if _, exists := t.endpointMetrics[endpoint]; !exists {
		t.endpointMetrics[endpoint] = &EndpointMetric{
			Endpoint: endpoint,
		}
	}
	metric := t.endpointMetrics[endpoint]
	metric.Requests++
	if isError {
		metric.Errors++
	}

	// Update average (running average)
	if metric.Requests == 1 {
		metric.AvgTime = ms
	} else {
		metric.AvgTime = (metric.AvgTime*float64(metric.Requests-1) + ms) / float64(metric.Requests)
	}

	// Simple P95 approximation (would need proper percentile calculation in production)
	if ms > metric.P95 {
		metric.P95 = ms
	}
}

// GetMetrics returns current metrics
func (t *Tracker) GetMetrics() *Metrics {
	t.mu.RLock()
	defer t.mu.RUnlock()

	// Get system metrics
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	cpu := t.calculateCPU()
	memPercent := float64(mem.Alloc) / float64(mem.Sys) * 100

	system := SystemMetrics{
		CPU:           cpu,
		Memory:        memPercent,
		Goroutines:    runtime.NumGoroutine(),
		Timestamp:     time.Now().Format(time.RFC3339),
		MemoryAllocMB: float64(mem.Alloc) / 1024 / 1024,
		MemorySysMB:   float64(mem.Sys) / 1024 / 1024,
		NumGC:         mem.NumGC,
	}

	// Calculate request metrics
	var avgResponseTime float64
	if len(t.responseTimes) > 0 {
		sum := 0.0
		for _, rt := range t.responseTimes {
			sum += rt
		}
		avgResponseTime = sum / float64(len(t.responseTimes))
	}

	// Calculate request rate (requests per minute)
	duration := time.Since(t.startTime).Minutes()
	requestRate := 0.0
	if duration > 0 {
		requestRate = float64(t.requestCount) / duration
	}

	errorRate := 0.0
	if t.requestCount > 0 {
		errorRate = float64(t.errorCount) / float64(t.requestCount) * 100
	}

	requests := RequestMetrics{
		TotalRequests:     t.requestCount,
		RequestRate:       requestRate,
		AvgResponseTime:   avgResponseTime,
		ErrorRate:         errorRate,
		ActiveConnections: runtime.NumGoroutine(), // Approximation
	}

	// Get top endpoints
	topEndpoints := make([]EndpointMetric, 0, len(t.endpointMetrics))
	for _, metric := range t.endpointMetrics {
		topEndpoints = append(topEndpoints, *metric)
	}

	// Sort by requests (simple bubble sort for small datasets)
	for i := 0; i < len(topEndpoints)-1; i++ {
		for j := i + 1; j < len(topEndpoints); j++ {
			if topEndpoints[j].Requests > topEndpoints[i].Requests {
				topEndpoints[i], topEndpoints[j] = topEndpoints[j], topEndpoints[i]
			}
		}
	}

	// Limit to top 10
	if len(topEndpoints) > 10 {
		topEndpoints = topEndpoints[:10]
	}

	return &Metrics{
		System:       system,
		Requests:     requests,
		TimeSeries:   t.timeSeries,
		TopEndpoints: topEndpoints,
		LastUpdated:  time.Now().Format(time.RFC3339),
	}
}

// RecordTimeSeriesPoint adds a point to the time series
func (t *Tracker) RecordTimeSeriesPoint() {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := time.Now()
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	// Calculate requests in last minute
	requestsLastMin := t.requestCount - t.lastNumRequests
	t.lastNumRequests = t.requestCount

	// Calculate avg response time for last minute
	avgRT := 0.0
	if len(t.responseTimes) > 0 {
		sum := 0.0
		count := 0
		// Get last 60 response times (approximation)
		start := 0
		if len(t.responseTimes) > 60 {
			start = len(t.responseTimes) - 60
		}
		for i := start; i < len(t.responseTimes); i++ {
			sum += t.responseTimes[i]
			count++
		}
		if count > 0 {
			avgRT = sum / float64(count)
		}
	}

	point := TimeSeriesPoint{
		Time:         now.Format("15:04"),
		CPU:          t.calculateCPU(),
		Memory:       float64(mem.Alloc) / float64(mem.Sys) * 100,
		Requests:     int(requestsLastMin),
		ResponseTime: avgRT,
		Errors:       0, // Would need to track errors per minute
	}

	t.timeSeries = append(t.timeSeries, point)
	if len(t.timeSeries) > t.maxTimeSeriesSize {
		t.timeSeries = t.timeSeries[1:]
	}
}

// calculateCPU estimates CPU usage (simplified)
func (t *Tracker) calculateCPU() float64 {
	// This is a simplified CPU calculation
	// In production, you'd use system-specific APIs
	numCPU := runtime.NumCPU()
	numGoroutine := runtime.NumGoroutine()

	// Rough estimation: more goroutines = more CPU usage
	cpu := float64(numGoroutine) / float64(numCPU) / 10.0
	if cpu > 100 {
		cpu = 100
	}

	t.lastCPUTime = time.Now()
	return cpu
}

// Reset resets all metrics
func (t *Tracker) Reset() {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.startTime = time.Now()
	t.requestCount = 0
	t.errorCount = 0
	t.responseTimes = make([]float64, 0)
	t.timeSeries = make([]TimeSeriesPoint, 0)
	t.endpointMetrics = make(map[string]*EndpointMetric)
}
