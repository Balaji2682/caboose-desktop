import { useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * Performance optimization utilities
 */

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  ) as T;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): IntersectionObserverEntry | null {
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return entry;
}

// Memoized selector hook
export function useShallowMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const prevDeps = useRef<React.DependencyList>();
  const prevResult = useRef<T>();

  const hasChanged = !prevDeps.current || deps.some((dep, i) => !Object.is(dep, prevDeps.current![i]));

  if (hasChanged) {
    prevResult.current = factory();
    prevDeps.current = deps;
  }

  return prevResult.current!;
}

// Event listener with cleanup
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement = window
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[K]);
    element.addEventListener(eventName, eventListener);
    return () => element.removeEventListener(eventName, eventListener);
  }, [eventName, element]);
}

// RAF-based animation hook
export function useAnimationFrame(callback: (deltaTime: number) => void, deps: React.DependencyList) {
  const frame = useRef<number>();
  const last = useRef(performance.now());
  const init = useRef(performance.now());

  const animate = useCallback(() => {
    const now = performance.now();
    const time = (now - init.current) / 1000;
    const delta = (now - last.current) / 1000;

    callback(delta);
    last.current = now;
    frame.current = requestAnimationFrame(animate);
  }, deps);

  useEffect(() => {
    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [animate]);
}

// Measure component render time
export function useMeasureRender(name: string) {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[Render] ${name}: ${(end - start).toFixed(2)}ms`);
    };
  });
}

// Import React
import * as React from 'react';
