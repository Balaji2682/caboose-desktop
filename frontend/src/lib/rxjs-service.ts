import { BehaviorSubject, Observable, interval, distinctUntilChanged, shareReplay } from 'rxjs';
import { switchMap, catchError, map, tap, filter } from 'rxjs/operators';
import type { Exception } from '@/stores/exceptionStore';
import type { Metrics } from '@/stores/metricsStore';
import type { DatabaseHealth } from '@/lib/wails';

/**
 * RxJS-based service layer for reactive data streams
 * Provides observables for real-time data updates with automatic polling
 */

// Check if running in Wails environment
const isWailsEnv = () => typeof window !== 'undefined' && (window as any).go;

// Generic polling observable creator
function createPollingObservable<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number = 5000
): Observable<T> {
  return interval(intervalMs).pipe(
    switchMap(() => fetchFn()),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    shareReplay({ bufferSize: 1, refCount: true }),
    catchError((error) => {
      console.error('Polling error:', error);
      throw error;
    })
  );
}

// Exceptions Observable
export const exceptions$ = new BehaviorSubject<Exception[]>([]);

export function createExceptionsStream(): Observable<Exception[]> {
  if (!isWailsEnv()) {
    return new BehaviorSubject<Exception[]>([]).asObservable();
  }

  return createPollingObservable<Exception[]>(
    async () => {
      const data = await (window as any).go.main.App.GetExceptions();
      exceptions$.next(data || []);
      return data || [];
    },
    10000 // Poll every 10 seconds
  );
}

// Metrics Observable
export const metrics$ = new BehaviorSubject<Metrics | null>(null);

export function createMetricsStream(): Observable<Metrics | null> {
  if (!isWailsEnv()) {
    return new BehaviorSubject<Metrics | null>(null).asObservable();
  }

  return createPollingObservable<Metrics | null>(
    async () => {
      const data = await (window as any).go.main.App.GetMetrics();
      metrics$.next(data);
      return data;
    },
    5000 // Poll every 5 seconds
  );
}

// Database Health Observable
export const dbHealth$ = new BehaviorSubject<DatabaseHealth | null>(null);

export function createDatabaseHealthStream(): Observable<DatabaseHealth | null> {
  if (!isWailsEnv()) {
    return new BehaviorSubject<DatabaseHealth | null>(null).asObservable();
  }

  return createPollingObservable<DatabaseHealth | null>(
    async () => {
      try {
        const data = await (window as any).go.main.App.GetDatabaseHealth();
        dbHealth$.next(data);
        return data;
      } catch {
        return null;
      }
    },
    10000 // Poll every 10 seconds
  );
}

// Combined data stream for dashboard
export function createDashboardStream() {
  return {
    exceptions: createExceptionsStream(),
    metrics: createMetricsStream(),
    dbHealth: createDatabaseHealthStream(),
  };
}

// Utility: Create a suspense-ready observable hook
export function useObservable<T>(observable: Observable<T>, initialValue: T): T {
  const [value, setValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    const subscription = observable.subscribe(setValue);
    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}

// Export React namespace for the utility
import * as React from 'react';
