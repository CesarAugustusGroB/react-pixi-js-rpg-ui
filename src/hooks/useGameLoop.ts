import { useEffect, useRef, useCallback } from 'react';

interface GameLoopOptions {
  /** Whether the loop is active */
  active?: boolean;
  /** Target FPS (frames per second). Default: 60 */
  targetFps?: number;
  /** Maximum delta time to prevent spiral of death. Default: 0.1 (100ms) */
  maxDeltaTime?: number;
}

/**
 * Hook that provides a game loop using requestAnimationFrame.
 * Calls the callback with delta time in seconds.
 *
 * @param callback - Function called each frame with (deltaTime: number)
 * @param options - Loop configuration options
 */
export const useGameLoop = (
  callback: (deltaTime: number) => void,
  options: GameLoopOptions = {}
): void => {
  const { active = true, maxDeltaTime = 0.1 } = options;

  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== null) {
        // Calculate delta time in seconds
        const rawDeltaTime = (time - previousTimeRef.current) / 1000;
        // Clamp to prevent spiral of death
        const deltaTime = Math.min(rawDeltaTime, maxDeltaTime);

        callbackRef.current(deltaTime);
      }

      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [maxDeltaTime]
  );

  useEffect(() => {
    if (active) {
      previousTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);

      return () => {
        if (requestRef.current !== null) {
          cancelAnimationFrame(requestRef.current);
        }
      };
    }
  }, [active, animate]);
};

/**
 * Hook for fixed timestep game loop.
 * Useful when you need deterministic physics or logic updates.
 */
export const useFixedGameLoop = (
  callback: (fixedDeltaTime: number) => void,
  options: GameLoopOptions & { fixedTimestep?: number } = {}
): void => {
  const { active = true, maxDeltaTime = 0.1, fixedTimestep = 1 / 60 } = options;

  const accumulatorRef = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useGameLoop(
    (deltaTime) => {
      accumulatorRef.current += Math.min(deltaTime, maxDeltaTime);

      // Process fixed timestep updates
      while (accumulatorRef.current >= fixedTimestep) {
        callbackRef.current(fixedTimestep);
        accumulatorRef.current -= fixedTimestep;
      }
    },
    { active, maxDeltaTime }
  );
};
