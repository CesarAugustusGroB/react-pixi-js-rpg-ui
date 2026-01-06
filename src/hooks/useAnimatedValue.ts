import { useMotionValue, useSpring, MotionValue } from 'framer-motion';
import { useEffect } from 'react';

interface UseAnimatedValueOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  restDelta?: number;
}

/**
 * Hook that creates a spring-animated motion value that follows a target value.
 * Useful for smooth number transitions like health bars, score counters, etc.
 */
export const useAnimatedValue = (
  value: number,
  options: UseAnimatedValueOptions = {}
): MotionValue<number> => {
  const {
    stiffness = 100,
    damping = 20,
    mass = 1,
    restDelta = 0.01,
  } = options;

  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, {
    stiffness,
    damping,
    mass,
    restDelta,
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return spring;
};

/**
 * Preset configurations for common animation types
 */
export const animatedValuePresets = {
  /** Snappy, responsive animations (buttons, small UI elements) */
  snappy: { stiffness: 400, damping: 30, mass: 1 },

  /** Bouncy animations (pickups, notifications) */
  bouncy: { stiffness: 300, damping: 10, mass: 1 },

  /** Smooth, gentle animations (health bars, progress) */
  smooth: { stiffness: 100, damping: 20, mass: 1 },

  /** Very gentle, slow animations (background elements) */
  gentle: { stiffness: 50, damping: 15, mass: 1 },

  /** Critically damped - no overshoot */
  critical: { stiffness: 200, damping: 28, mass: 1 },
};

/**
 * Hook variant with preset support
 */
export const useAnimatedValueWithPreset = (
  value: number,
  preset: keyof typeof animatedValuePresets = 'smooth'
): MotionValue<number> => {
  return useAnimatedValue(value, animatedValuePresets[preset]);
};
