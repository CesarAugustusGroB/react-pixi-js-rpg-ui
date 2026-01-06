import { useState, useEffect } from 'react';

/**
 * Returns true if the user prefers reduced motion.
 * Automatically updates when the preference changes.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check initial preference
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Returns animation config that respects reduced motion preference.
 * Use this to conditionally disable animations.
 */
export function useMotionConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    // Transition config that disables animations when reduced motion is preferred
    transition: prefersReducedMotion ? { duration: 0 } : undefined,
    // Whether to animate at all
    animate: !prefersReducedMotion,
  };
}
