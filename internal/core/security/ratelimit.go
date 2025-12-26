package security

import (
	"context"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RateLimiter manages rate limiting for API calls
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
	}
}

// GetLimiter gets or creates a limiter for an operation
func (rl *RateLimiter) GetLimiter(operation string, requestsPerSecond float64, burst int) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[operation]
	if !exists {
		limiter = rate.NewLimiter(rate.Limit(requestsPerSecond), burst)
		rl.limiters[operation] = limiter
	}

	return limiter
}

// Allow checks if an operation is allowed under rate limit
func (rl *RateLimiter) Allow(operation string) bool {
	// Default limits per operation type
	limits := map[string]struct {
		rps   float64
		burst int
	}{
		"query":   {rps: 10, burst: 20},   // 10 queries/sec, burst 20
		"process": {rps: 2, burst: 5},     // 2 process ops/sec, burst 5
		"pty":     {rps: 50, burst: 100},  // 50 PTY writes/sec, burst 100
		"default": {rps: 5, burst: 10},    // Default: 5/sec, burst 10
	}

	limit, exists := limits[operation]
	if !exists {
		limit = limits["default"]
	}

	limiter := rl.GetLimiter(operation, limit.rps, limit.burst)
	return limiter.Allow()
}

// Wait waits until the operation is allowed
func (rl *RateLimiter) Wait(operation string) error {
	limits := map[string]struct {
		rps   float64
		burst int
	}{
		"query":   {rps: 10, burst: 20},
		"process": {rps: 2, burst: 5},
		"pty":     {rps: 50, burst: 100},
		"default": {rps: 5, burst: 10},
	}

	limit, exists := limits[operation]
	if !exists {
		limit = limits["default"]
	}

	limiter := rl.GetLimiter(operation, limit.rps, limit.burst)

	// Wait with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return limiter.Wait(ctx)
}
