import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook that provides a throttled state update mechanism.
 * Perfect for high-frequency updates where you want to limit re-renders
 * while keeping an accurate ref value for immediate reads.
 *
 * @param initialValue - The initial state value
 * @param throttleMs - Minimum time between state updates (default: 100ms)
 * @returns [state, updateValue, valueRef] - The throttled state, update function, and immediate ref
 */
export const useThrottledState = <T>(
  initialValue: T,
  throttleMs: number = 100
): [T, (value: T) => void, React.MutableRefObject<T>] => {
  const [state, setState] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const lastUpdateRef = useRef(Date.now());
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateValue = useCallback(
    (newValue: T) => {
      valueRef.current = newValue;
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      // Clear any pending update
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }

      if (timeSinceLastUpdate >= throttleMs) {
        // Enough time has passed, update immediately
        setState(newValue);
        lastUpdateRef.current = now;
      } else {
        // Schedule update for when throttle period ends
        const remainingTime = throttleMs - timeSinceLastUpdate;
        pendingUpdateRef.current = setTimeout(() => {
          setState(valueRef.current);
          lastUpdateRef.current = Date.now();
          pendingUpdateRef.current = null;
        }, remainingTime);
      }
    },
    [throttleMs]
  );

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, []);

  return [state, updateValue, valueRef];
};

/**
 * Hook for debounced state updates.
 * Only updates state after the value has been stable for the specified time.
 */
export const useDebouncedState = <T>(
  initialValue: T,
  debounceMs: number = 100
): [T, (value: T) => void, React.MutableRefObject<T>] => {
  const [state, setState] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateValue = useCallback(
    (newValue: T) => {
      valueRef.current = newValue;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule new update
      timeoutRef.current = setTimeout(() => {
        setState(newValue);
        timeoutRef.current = null;
      }, debounceMs);
    },
    [debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, updateValue, valueRef];
};
