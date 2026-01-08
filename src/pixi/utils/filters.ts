// Modern Visual Filters and Effects
// Reusable filter presets for consistent visual styling

import { Graphics, Container, BlurFilter } from 'pixi.js';
import { COLORS } from './colors';

// ============================================
// FILTER CONFIGURATION TYPES
// ============================================

export interface GlowConfig {
  color: number;
  intensity: number;
  radius: number;
  alpha: number;
}

export interface ShadowConfig {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: number;
  alpha: number;
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const GLOW_PRESETS = {
  // Subtle hover glow
  hover: {
    color: COLORS.GLOW_COLOR,
    intensity: 1.5,
    radius: 8,
    alpha: 0.4,
  },
  // Selection highlight glow
  selected: {
    color: COLORS.LOCATION_SELECTED,
    intensity: 2,
    radius: 12,
    alpha: 0.6,
  },
  // Current location pulse glow
  current: {
    color: COLORS.LOCATION_CURRENT,
    intensity: 2.5,
    radius: 16,
    alpha: 0.7,
  },
  // Path travel active glow
  travel: {
    color: COLORS.PATH_TRAVEL_ACTIVE,
    intensity: 2,
    radius: 10,
    alpha: 0.5,
  },
  // Subtle accent glow
  accent: {
    color: COLORS.ACCENT_PRIMARY,
    intensity: 1.2,
    radius: 6,
    alpha: 0.3,
  },
  // Error/danger glow
  danger: {
    color: COLORS.DANGER_EXTREME,
    intensity: 2,
    radius: 10,
    alpha: 0.5,
  },
} as const;

export const SHADOW_PRESETS = {
  // Subtle drop shadow for elevation
  subtle: {
    offsetX: 0,
    offsetY: 2,
    blur: 4,
    color: 0x000000,
    alpha: 0.2,
  },
  // Medium shadow for floating elements
  medium: {
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    color: 0x000000,
    alpha: 0.3,
  },
  // Strong shadow for modals/overlays
  strong: {
    offsetX: 0,
    offsetY: 8,
    blur: 16,
    color: 0x000000,
    alpha: 0.4,
  },
  // Soft ambient shadow
  ambient: {
    offsetX: 0,
    offsetY: 0,
    blur: 12,
    color: 0x000000,
    alpha: 0.15,
  },
} as const;

// ============================================
// GLOW EFFECT HELPERS
// ============================================

/**
 * Creates a glow graphics object that can be added behind elements
 * Uses multiple concentric circles with decreasing alpha for soft glow
 */
export function createGlowGraphics(
  radius: number,
  config: GlowConfig = GLOW_PRESETS.hover
): Graphics {
  const glow = new Graphics();
  const { color, intensity, radius: glowRadius, alpha } = config;

  // Create layered glow effect with multiple circles
  const layers = 4;
  for (let i = layers; i >= 1; i--) {
    const layerRadius = radius + (glowRadius * i) / layers;
    const layerAlpha = (alpha / layers) * (intensity / 2);

    glow.circle(0, 0, layerRadius);
    glow.fill({ color, alpha: layerAlpha });
  }

  return glow;
}

/**
 * Updates an existing glow graphics with new configuration
 */
export function updateGlowGraphics(
  glow: Graphics,
  radius: number,
  config: GlowConfig
): void {
  glow.clear();

  const { color, intensity, radius: glowRadius, alpha } = config;
  const layers = 4;

  for (let i = layers; i >= 1; i--) {
    const layerRadius = radius + (glowRadius * i) / layers;
    const layerAlpha = (alpha / layers) * (intensity / 2);

    glow.circle(0, 0, layerRadius);
    glow.fill({ color, alpha: layerAlpha });
  }
}

/**
 * Creates an animated pulsing glow effect
 * Returns an update function to call each frame
 */
export function createPulsingGlow(
  glow: Graphics,
  baseRadius: number,
  config: GlowConfig,
  pulseSpeed: number = 2,
  pulseAmount: number = 0.3
): (time: number) => void {
  return (time: number) => {
    const pulse = 1 + Math.sin(time * pulseSpeed) * pulseAmount;
    const pulsedConfig = {
      ...config,
      intensity: config.intensity * pulse,
      alpha: config.alpha * pulse,
    };
    updateGlowGraphics(glow, baseRadius, pulsedConfig);
  };
}

// ============================================
// SHADOW EFFECT HELPERS
// ============================================

/**
 * Creates a shadow graphics object
 * Uses a blurred circle offset from center
 */
export function createShadowGraphics(
  radius: number,
  config: ShadowConfig = SHADOW_PRESETS.subtle
): Graphics {
  const shadow = new Graphics();
  const { offsetX, offsetY, color, alpha } = config;

  // Draw shadow circle at offset position
  shadow.circle(offsetX, offsetY, radius);
  shadow.fill({ color, alpha });

  return shadow;
}

/**
 * Creates a blur filter for shadow effects
 */
export function createBlurFilter(strength: number = 4): BlurFilter {
  const filter = new BlurFilter();
  filter.strength = strength;
  filter.quality = 2;
  return filter;
}

// ============================================
// GRADIENT HELPERS
// ============================================

/**
 * Creates a radial gradient-like effect using concentric circles
 * PixiJS doesn't have native gradients, so we simulate with layers
 */
export function createRadialGradient(
  radius: number,
  centerColor: number,
  edgeColor: number,
  centerAlpha: number = 1,
  edgeAlpha: number = 0.3
): Graphics {
  const gradient = new Graphics();
  const steps = 8;

  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const stepRadius = radius * (1 - t * 0.3); // Inner 70% of radius
    const color = lerpColorSimple(edgeColor, centerColor, t);
    const alpha = edgeAlpha + (centerAlpha - edgeAlpha) * t;

    gradient.circle(0, 0, stepRadius);
    gradient.fill({ color, alpha });
  }

  return gradient;
}

/**
 * Simple color lerp without importing from colors.ts to avoid circular deps
 */
function lerpColorSimple(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}

// ============================================
// HIGHLIGHT RING HELPERS
// ============================================

/**
 * Creates a highlight ring for selected/hovered states
 */
export function createHighlightRing(
  radius: number,
  color: number = COLORS.LOCATION_HOVER,
  width: number = 2,
  alpha: number = 0.8
): Graphics {
  const ring = new Graphics();

  ring.circle(0, 0, radius);
  ring.stroke({ width, color, alpha });

  return ring;
}

/**
 * Creates an animated dashed ring effect
 * Returns graphics and an update function
 */
export function createAnimatedRing(
  radius: number,
  color: number = COLORS.ACCENT_PRIMARY,
  dashLength: number = 8,
  gapLength: number = 4
): { graphics: Graphics; update: (time: number) => void } {
  const ring = new Graphics();

  const update = (time: number) => {
    ring.clear();

    const circumference = 2 * Math.PI * radius;
    const totalLength = dashLength + gapLength;
    const segments = Math.floor(circumference / totalLength);
    const offset = (time * 0.5) % totalLength;

    for (let i = 0; i < segments; i++) {
      const startAngle = (i * totalLength + offset) / radius;
      const endAngle = startAngle + dashLength / radius;

      ring.arc(0, 0, radius, startAngle, endAngle);
      ring.stroke({ width: 2, color, alpha: 0.6 });
    }
  };

  return { graphics: ring, update };
}

// ============================================
// FLASH EFFECT HELPERS
// ============================================

/**
 * Creates a flash effect that fades out
 * Useful for click feedback, travel start, etc.
 */
export function createFlashEffect(
  radius: number,
  color: number = COLORS.HIGHLIGHT_COLOR,
  duration: number = 300
): { container: Container; play: () => Promise<void> } {
  const container = new Container();
  const flash = new Graphics();

  flash.circle(0, 0, radius);
  flash.fill({ color, alpha: 0.6 });

  container.addChild(flash);
  container.alpha = 0;

  const play = (): Promise<void> => {
    return new Promise((resolve) => {
      container.alpha = 1;
      container.scale.set(0.5);

      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out quad
        const eased = 1 - (1 - progress) * (1 - progress);

        container.alpha = 1 - eased;
        container.scale.set(0.5 + eased * 0.8);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          container.alpha = 0;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  return { container, play };
}

/**
 * Creates a ripple effect expanding outward
 */
export function createRippleEffect(
  maxRadius: number,
  color: number = COLORS.ACCENT_PRIMARY,
  duration: number = 500,
  ringCount: number = 2
): { container: Container; play: () => Promise<void> } {
  const container = new Container();
  const rings: Graphics[] = [];

  for (let i = 0; i < ringCount; i++) {
    const ring = new Graphics();
    rings.push(ring);
    container.addChild(ring);
  }

  container.alpha = 0;

  const play = (): Promise<void> => {
    return new Promise((resolve) => {
      container.alpha = 1;

      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        rings.forEach((ring, index) => {
          ring.clear();

          // Stagger each ring
          const ringProgress = Math.max(0, progress - index * 0.2) / (1 - index * 0.2);
          if (ringProgress <= 0 || ringProgress > 1) return;

          const eased = 1 - Math.pow(1 - ringProgress, 3);
          const radius = maxRadius * eased;
          const alpha = 0.6 * (1 - eased);

          ring.circle(0, 0, radius);
          ring.stroke({ width: 2, color, alpha });
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          container.alpha = 0;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  return { container, play };
}
