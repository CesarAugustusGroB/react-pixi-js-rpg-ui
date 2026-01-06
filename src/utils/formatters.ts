// Number and text formatting utilities

/**
 * Format a number with thousand separators
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(Math.floor(value));
};

/**
 * Format a number as compact (1.2K, 3.5M, etc.)
 */
export const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value);
};

/**
 * Format percentage (0-100)
 */
export const formatPercent = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format time in seconds to MM:SS
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Map a value from one range to another
 */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Get rarity color from rarity type
 */
export const getRarityColor = (rarity: string): string => {
  const colors: Record<string, string> = {
    common: 'var(--color-rarity-common)',
    uncommon: 'var(--color-rarity-uncommon)',
    rare: 'var(--color-rarity-rare)',
    epic: 'var(--color-rarity-epic)',
    legendary: 'var(--color-rarity-legendary)',
  };
  return colors[rarity] || colors.common;
};

/**
 * Get health bar color based on percentage
 */
export const getHealthColor = (percent: number): string => {
  if (percent <= 25) return 'var(--color-health-low)';
  if (percent <= 50) return 'var(--color-health-mid)';
  return 'var(--color-health-full)';
};
