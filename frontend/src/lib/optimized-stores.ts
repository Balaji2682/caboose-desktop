/**
 * Optimized store utilities using shallow comparison and selector optimization
 */

import { useEffect } from 'react';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';

/**
 * Create an optimized store with automatic shallow comparison
 */
export function createOptimizedStore<T extends object>(
  initializer: (set: any, get: any) => T
) {
  return create(
    subscribeWithSelector(
      immer(initializer)
    )
  );
}

/**
 * Optimized selector hook with shallow comparison
 */
export function useShallowStore<T, R>(
  store: any,
  selector: (state: T) => R
): R {
  return store(selector, shallow);
}

/**
 * Subscribe to store changes with cleanup
 */
export function useStoreSubscription<T>(
  store: any,
  listener: (state: T, prevState: T) => void
) {
  useEffect(() => {
    const unsubscribe = store.subscribe(listener);
    return unsubscribe;
  }, [store, listener]);
}

/**
 * Debounced store setter
 */
export function createDebouncedSetter<T>(
  set: (partial: Partial<T>) => void,
  delay: number = 300
) {
  let timeout: ReturnType<typeof setTimeout>;

  return (partial: Partial<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => set(partial), delay);
  };
}

/**
 * Memoized selector factory
 */
export function createSelector<T, R>(
  selector: (state: T) => R,
  equalityFn: (a: R, b: R) => boolean = shallow
) {
  let cachedResult: R;
  let cachedState: T;

  return (state: T): R => {
    if (state !== cachedState) {
      const result = selector(state);
      if (!equalityFn(result, cachedResult)) {
        cachedResult = result;
      }
      cachedState = state;
    }
    return cachedResult;
  };
}
