// TimeVisualizer - Manages day/night cycle visual effects
// Applies lighting tints and ambient effects based on time of day

import { Graphics, ColorMatrixFilter } from 'pixi.js';
import type { Bounds, TimeOfDay, GameTime } from '@/types';
import { getTimeOfDay } from '@/types/time';
import { lerpColor } from '../utils/colors';
import { Spring, SPRING_PRESETS } from '../utils/easing';

// ============================================
// TYPES
// ============================================

export interface TimeVisualizerConfig {
  // Enable ambient overlay
  enableAmbientOverlay: boolean;

  // Enable vignette effect at night
  enableVignette: boolean;

  // Transition duration in seconds
  transitionDuration: number;

  // Update smoothing (0-1)
  smoothing: number;
}

interface TimeVisualState {
  tint: number;
  ambientAlpha: number;
  vignetteIntensity: number;
  saturation: number;
  brightness: number;
}

// ============================================
// TIME OF DAY VISUAL PRESETS
// ============================================

const TIME_VISUAL_PRESETS: Record<TimeOfDay, TimeVisualState> = {
  dawn: {
    tint: 0xffccaa,
    ambientAlpha: 0.1,
    vignetteIntensity: 0.1,
    saturation: 0.9,
    brightness: 0.85,
  },
  morning: {
    tint: 0xfffef0,
    ambientAlpha: 0.0,
    vignetteIntensity: 0.0,
    saturation: 1.0,
    brightness: 1.0,
  },
  afternoon: {
    tint: 0xffffff,
    ambientAlpha: 0.0,
    vignetteIntensity: 0.0,
    saturation: 1.0,
    brightness: 1.0,
  },
  dusk: {
    tint: 0xffaa88,
    ambientAlpha: 0.15,
    vignetteIntensity: 0.15,
    saturation: 0.85,
    brightness: 0.9,
  },
  evening: {
    tint: 0x8888cc,
    ambientAlpha: 0.25,
    vignetteIntensity: 0.25,
    saturation: 0.7,
    brightness: 0.7,
  },
  night: {
    tint: 0x4444aa,
    ambientAlpha: 0.4,
    vignetteIntensity: 0.4,
    saturation: 0.5,
    brightness: 0.5,
  },
};

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: TimeVisualizerConfig = {
  enableAmbientOverlay: true,
  enableVignette: true,
  transitionDuration: 2.0,
  smoothing: 0.05,
};

// ============================================
// TIME VISUALIZER CLASS
// ============================================

export class TimeVisualizer {
  private config: TimeVisualizerConfig;

  // Visual containers
  private ambientOverlay: Graphics;
  private vignetteOverlay: Graphics;

  // Filters
  private colorFilter: ColorMatrixFilter;

  // State
  private currentTimeOfDay: TimeOfDay = 'morning';
  private targetState: TimeVisualState;
  private currentState: TimeVisualState;

  // Animation
  private tintSpring: Spring;
  private transitionProgress: number = 1;

  // Bounds
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  constructor(_bounds: Bounds, config: Partial<TimeVisualizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize state
    this.targetState = { ...TIME_VISUAL_PRESETS.morning };
    this.currentState = { ...TIME_VISUAL_PRESETS.morning };

    // Create spring for smooth transitions
    this.tintSpring = new Spring(1, SPRING_PRESETS.gentle);

    // Create visual layers
    this.ambientOverlay = new Graphics();
    this.vignetteOverlay = new Graphics();

    // Create color filter
    this.colorFilter = new ColorMatrixFilter();

    // Initial render
    this.renderAmbientOverlay();
    this.renderVignette();
  }

  // ============================================
  // VISUAL LAYERS
  // ============================================

  public getAmbientOverlay(): Graphics {
    return this.ambientOverlay;
  }

  public getVignetteOverlay(): Graphics {
    return this.vignetteOverlay;
  }

  public getColorFilter(): ColorMatrixFilter {
    return this.colorFilter;
  }

  // ============================================
  // TIME UPDATES
  // ============================================

  public setTimeOfDay(timeOfDay: TimeOfDay): void {
    if (this.currentTimeOfDay === timeOfDay) return;

    this.currentTimeOfDay = timeOfDay;
    this.targetState = { ...TIME_VISUAL_PRESETS[timeOfDay] };
    this.transitionProgress = 0;
    this.tintSpring.setTarget(0);
  }

  public setGameTime(gameTime: GameTime): void {
    const timeOfDay = getTimeOfDay(gameTime.hour);
    this.setTimeOfDay(timeOfDay);
  }

  // ============================================
  // RENDERING
  // ============================================

  private renderAmbientOverlay(): void {
    if (!this.config.enableAmbientOverlay) return;

    this.ambientOverlay.clear();

    // Full screen color overlay
    this.ambientOverlay.rect(
      0,
      0,
      this.screenWidth,
      this.screenHeight
    );

    this.ambientOverlay.fill({
      color: this.currentState.tint,
      alpha: this.currentState.ambientAlpha,
    });
  }

  private renderVignette(): void {
    if (!this.config.enableVignette) return;

    this.vignetteOverlay.clear();

    const intensity = this.currentState.vignetteIntensity;
    if (intensity <= 0) return;

    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    // Draw radial gradient using concentric circles
    const steps = 20;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const radius = maxRadius * (0.5 + t * 0.5);
      const alpha = intensity * t * t; // Quadratic falloff

      this.vignetteOverlay.circle(centerX, centerY, radius);
      this.vignetteOverlay.fill({ color: 0x000000, alpha });
    }
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    // Update transition
    if (this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / this.config.transitionDuration;
      this.transitionProgress = Math.min(1, this.transitionProgress);

      // Interpolate state
      this.interpolateState(this.transitionProgress);

      // Re-render visuals
      this.renderAmbientOverlay();
      this.renderVignette();
      this.updateColorFilter();
    }
  }

  private interpolateState(t: number): void {
    // Smooth easing
    const easedT = t * t * (3 - 2 * t); // Smoothstep

    // Interpolate each property
    this.currentState.tint = lerpColor(
      TIME_VISUAL_PRESETS[this.getPreviousTimeOfDay()].tint,
      this.targetState.tint,
      easedT
    );

    this.currentState.ambientAlpha = this.lerp(
      TIME_VISUAL_PRESETS[this.getPreviousTimeOfDay()].ambientAlpha,
      this.targetState.ambientAlpha,
      easedT
    );

    this.currentState.vignetteIntensity = this.lerp(
      TIME_VISUAL_PRESETS[this.getPreviousTimeOfDay()].vignetteIntensity,
      this.targetState.vignetteIntensity,
      easedT
    );

    this.currentState.saturation = this.lerp(
      TIME_VISUAL_PRESETS[this.getPreviousTimeOfDay()].saturation,
      this.targetState.saturation,
      easedT
    );

    this.currentState.brightness = this.lerp(
      TIME_VISUAL_PRESETS[this.getPreviousTimeOfDay()].brightness,
      this.targetState.brightness,
      easedT
    );
  }

  private getPreviousTimeOfDay(): TimeOfDay {
    const order: TimeOfDay[] = ['dawn', 'morning', 'afternoon', 'dusk', 'evening', 'night'];
    const currentIndex = order.indexOf(this.currentTimeOfDay);
    const prevIndex = (currentIndex - 1 + order.length) % order.length;
    return order[prevIndex];
  }

  private updateColorFilter(): void {
    // Reset filter
    this.colorFilter.reset();

    // Apply saturation
    this.colorFilter.saturate(this.currentState.saturation - 1, false);

    // Apply brightness
    this.colorFilter.brightness(this.currentState.brightness, false);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  // ============================================
  // SCREEN SIZE
  // ============================================

  public setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.renderAmbientOverlay();
    this.renderVignette();
  }

  public updateBounds(_bounds: Bounds): void {
    // Reserved for future bounds-based calculations
  }

  // ============================================
  // QUERIES
  // ============================================

  public getCurrentTimeOfDay(): TimeOfDay {
    return this.currentTimeOfDay;
  }

  public getCurrentTint(): number {
    return this.currentState.tint;
  }

  public getAmbientIntensity(): number {
    return this.currentState.ambientAlpha;
  }

  public isNightTime(): boolean {
    return this.currentTimeOfDay === 'night' || this.currentTimeOfDay === 'evening';
  }

  public isDayTime(): boolean {
    return this.currentTimeOfDay === 'morning' || this.currentTimeOfDay === 'afternoon';
  }

  // ============================================
  // SPECIAL EFFECTS
  // ============================================

  /**
   * Flash effect (for lightning during storms)
   */
  public flashLightning(): void {
    // Temporarily brighten everything
    const originalBrightness = this.currentState.brightness;
    this.colorFilter.brightness(2.0, true);

    // Restore after short delay
    setTimeout(() => {
      this.colorFilter.brightness(originalBrightness, true);
    }, 100);
  }

  /**
   * Apply weather overlay tint
   */
  public setWeatherTint(weatherTint: number, intensity: number): void {
    // Blend weather tint with current time tint
    const blendedTint = lerpColor(this.currentState.tint, weatherTint, intensity);
    this.ambientOverlay.tint = blendedTint;
  }

  /**
   * Clear weather effects
   */
  public clearWeatherEffects(): void {
    this.ambientOverlay.tint = 0xffffff;
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.ambientOverlay.destroy();
    this.vignetteOverlay.destroy();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createTimeVisualizer(
  bounds: Bounds,
  config?: Partial<TimeVisualizerConfig>
): TimeVisualizer {
  return new TimeVisualizer(bounds, config);
}
