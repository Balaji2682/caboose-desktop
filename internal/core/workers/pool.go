package workers

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"time"
)

// Task represents a unit of work to be executed by the worker pool
type Task struct {
	ID      string
	Execute func(ctx context.Context) (interface{}, error)
	Result  chan TaskResult
}

// TaskResult contains the result of task execution
type TaskResult struct {
	ID     string
	Data   interface{}
	Error  error
	Duration time.Duration
}

// Pool manages a pool of worker goroutines
type Pool struct {
	workers    int
	tasks      chan Task
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	mu         sync.RWMutex
	stats      PoolStats
	closed     bool
}

// PoolStats tracks pool performance metrics
type PoolStats struct {
	TasksSubmitted   int64
	TasksCompleted   int64
	TasksFailed      int64
	TotalDuration    time.Duration
	AverageDuration  time.Duration
	ActiveWorkers    int32
}

// NewPool creates a new worker pool with the specified number of workers
// If workers <= 0, it defaults to the number of CPU cores
func NewPool(workers int) *Pool {
	if workers <= 0 {
		workers = runtime.NumCPU()
	}

	ctx, cancel := context.WithCancel(context.Background())

	p := &Pool{
		workers: workers,
		tasks:   make(chan Task, workers*10), // Buffer size = workers * 10
		ctx:     ctx,
		cancel:  cancel,
		stats: PoolStats{
			ActiveWorkers: int32(workers),
		},
	}

	p.start()
	return p
}

// start initializes the worker goroutines
func (p *Pool) start() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// worker is the goroutine that processes tasks
func (p *Pool) worker(id int) {
	defer p.wg.Done()

	for {
		select {
		case <-p.ctx.Done():
			return

		case task, ok := <-p.tasks:
			if !ok {
				return
			}

			p.processTask(task)
		}
	}
}

// processTask executes a task and sends the result
func (p *Pool) processTask(task Task) {
	startTime := time.Now()

	// Execute task with context and timeout
	taskCtx, cancel := context.WithTimeout(p.ctx, 30*time.Second)
	defer cancel()

	// SECURITY: Enforce timeout with monitoring channel
	done := make(chan struct {
		data interface{}
		err  error
	}, 1)

	go func() {
		taskData, taskErr := task.Execute(taskCtx)
		done <- struct {
			data interface{}
			err  error
		}{taskData, taskErr}
	}()

	var data interface{}
	var err error

	select {
	case result := <-done:
		// Task completed normally
		data = result.data
		err = result.err
	case <-taskCtx.Done():
		// Task timed out
		err = fmt.Errorf("task timeout after 30s: %w", taskCtx.Err())
	}

	duration := time.Since(startTime)

	// Update stats
	p.mu.Lock()
	p.stats.TasksCompleted++
	p.stats.TotalDuration += duration
	p.stats.AverageDuration = time.Duration(int64(p.stats.TotalDuration) / p.stats.TasksCompleted)
	if err != nil {
		p.stats.TasksFailed++
	}
	p.mu.Unlock()

	// Send result
	result := TaskResult{
		ID:       task.ID,
		Data:     data,
		Error:    err,
		Duration: duration,
	}

	select {
	case task.Result <- result:
	case <-p.ctx.Done():
	}
}

// Submit submits a task to the pool for execution
func (p *Pool) Submit(task Task) error {
	p.mu.RLock()
	if p.closed {
		p.mu.RUnlock()
		return fmt.Errorf("pool is closed")
	}
	p.mu.RUnlock()

	p.mu.Lock()
	p.stats.TasksSubmitted++
	p.mu.Unlock()

	select {
	case p.tasks <- task:
		return nil
	case <-p.ctx.Done():
		return fmt.Errorf("pool is shutting down")
	}
}

// SubmitWithCallback submits a task with a callback function
func (p *Pool) SubmitWithCallback(id string, fn func(ctx context.Context) (interface{}, error), callback func(TaskResult)) error {
	resultChan := make(chan TaskResult, 1)

	task := Task{
		ID:      id,
		Execute: fn,
		Result:  resultChan,
	}

	if err := p.Submit(task); err != nil {
		return err
	}

	// Handle result in separate goroutine
	go func() {
		result := <-resultChan
		callback(result)
	}()

	return nil
}

// SubmitAndWait submits a task and waits for the result
func (p *Pool) SubmitAndWait(id string, fn func(ctx context.Context) (interface{}, error)) TaskResult {
	resultChan := make(chan TaskResult, 1)

	task := Task{
		ID:      id,
		Execute: fn,
		Result:  resultChan,
	}

	if err := p.Submit(task); err != nil {
		return TaskResult{
			ID:    id,
			Error: err,
		}
	}

	return <-resultChan
}

// Stats returns current pool statistics
func (p *Pool) Stats() PoolStats {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.stats
}

// Close gracefully shuts down the pool
func (p *Pool) Close() {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return
	}
	p.closed = true
	p.mu.Unlock()

	close(p.tasks)
	p.wg.Wait()
	p.cancel()
}

// CloseWithTimeout shuts down the pool with a timeout
func (p *Pool) CloseWithTimeout(timeout time.Duration) error {
	done := make(chan struct{})

	go func() {
		p.Close()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-time.After(timeout):
		return fmt.Errorf("pool shutdown timeout exceeded")
	}
}

// Batch processes multiple tasks concurrently and returns results
func (p *Pool) Batch(tasks []Task) []TaskResult {
	results := make([]TaskResult, len(tasks))
	var wg sync.WaitGroup

	for i, task := range tasks {
		wg.Add(1)
		go func(index int, t Task) {
			defer wg.Done()

			if err := p.Submit(t); err != nil {
				results[index] = TaskResult{
					ID:    t.ID,
					Error: err,
				}
				return
			}

			results[index] = <-t.Result
		}(i, task)
	}

	wg.Wait()
	return results
}

// ResizePool dynamically adjusts the number of workers
func (p *Pool) ResizePool(newSize int) {
	if newSize <= 0 {
		newSize = runtime.NumCPU()
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	currentSize := p.workers
	if newSize == currentSize {
		return
	}

	if newSize > currentSize {
		// Add workers
		for i := currentSize; i < newSize; i++ {
			p.wg.Add(1)
			go p.worker(i)
		}
	}
	// Note: Reducing workers is handled naturally as they finish current tasks

	p.workers = newSize
	p.stats.ActiveWorkers = int32(newSize)
}

// Global pool instance
var globalPool *Pool
var poolOnce sync.Once

// GetGlobalPool returns the singleton global worker pool
func GetGlobalPool() *Pool {
	poolOnce.Do(func() {
		globalPool = NewPool(runtime.NumCPU() * 2)
	})
	return globalPool
}

// Helper function to create a simple task
func NewSimpleTask(id string, fn func() (interface{}, error)) Task {
	return Task{
		ID: id,
		Execute: func(ctx context.Context) (interface{}, error) {
			return fn()
		},
		Result: make(chan TaskResult, 1),
	}
}
