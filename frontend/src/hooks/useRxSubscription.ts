import { useEffect, useState, useRef } from 'react';
import { Observable, Subscription } from 'rxjs';

/**
 * Custom hook to subscribe to RxJS observables with automatic cleanup
 * @param observable$ - The observable to subscribe to
 * @param initialValue - Initial value before first emission
 * @returns Current value from the observable
 */
export function useRxSubscription<T>(
  observable$: Observable<T>,
  initialValue: T
): [T, boolean, Error | null] {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    setLoading(true);

    subscriptionRef.current = observable$.subscribe({
      next: (val) => {
        setValue(val);
        setLoading(false);
        setError(null);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [observable$]);

  return [value, loading, error];
}

/**
 * Hook to subscribe with custom selector
 */
export function useRxSelector<T, R>(
  observable$: Observable<T>,
  selector: (value: T) => R,
  initialValue: R
): R {
  const [value, setValue] = useState<R>(initialValue);

  useEffect(() => {
    const subscription = observable$.subscribe({
      next: (val) => setValue(selector(val)),
    });

    return () => subscription.unsubscribe();
  }, [observable$, selector]);

  return value;
}

/**
 * Hook for imperative observable actions
 */
export function useRxAction<T, R>(
  action: (payload: T) => Observable<R>
): [(payload: T) => void, boolean, R | null, Error | null] {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = (payload: T) => {
    setLoading(true);
    const subscription = action(payload).subscribe({
      next: (result) => {
        setData(result);
        setLoading(false);
        setError(null);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  };

  return [execute, loading, data, error];
}
