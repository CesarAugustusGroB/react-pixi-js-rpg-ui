// LevelTransition - Visual effects for zoom level transitions
// Handles fade, zoom, and blur effects when changing map hierarchy levels

import { Container, Graphics } from 'pixi.js';
import type { ZoomLevel } from '../systems/ZoomLevelManager';

// ============================================
// TRANSITION TYPES
// ============================================

export type TransitionType =
  | 'fade'           // Simple fade in/out
  | 'zoom_fade'      // Zoom + fade combination
  | 'blur_fade'      // Blur + fade (premium feel)
  | 'iris'           // Circular reveal
  | 'wipe';          // Directional wipe

export interface TransitionConfig {
  /** Type of transition effect */
  type: TransitionType;
  /** Duration of the transition in seconds */
  duration: number;
  /** Easing function to use */
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  /** Color for fade overlay */
  fadeColor: number;
  /** Maximum blur amount (for blur transitions) */
  maxBlur: number;
  /** Zoom scale factor during transition */
  zoomScale: number;
}

const DEFAULT_CONFIG: TransitionConfig = {
  type: 'zoom_fade',
  duration: 0.4,
  easing: 'easeOut',
  fadeColor: 0x1e1e2e,
  maxBlur: 8,
  zoomScale: 1.2,
};

// ============================================
// EASING FUNCTIONS
// ============================================

const EASINGS = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 2),
  easeInOut: (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

// ============================================
// LEVEL TRANSITION CLASS
// ============================================

export class LevelTransition extends Container {
  private config: TransitionConfig;

  // Graphics layers
  private fadeOverlay: Graphics;
  private irisCircle: Graphics;
  private wipeMask: Graphics;

  // State
  private isActive: boolean = false;
  private progress: number = 0;
  private direction: 'in' | 'out' = 'out';
  private transitionFromLevel: ZoomLevel | null = null;
  private transitionToLevel: ZoomLevel | null = null;

  // Screen dimensions
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  // Callbacks
  private onMidpoint: (() => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor(config: Partial<TransitionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create graphics layers
    this.fadeOverlay = new Graphics();
    this.irisCircle = new Graphics();
    this.wipeMask = new Graphics();

    this.addChild(this.fadeOverlay);
    this.addChild(this.irisCircle);
    this.addChild(this.wipeMask);

    // Start hidden
    this.visible = false;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Start a transition between levels
   */
  public start(
    from: ZoomLevel,
    to: ZoomLevel,
    onMidpoint?: () => void,
    onComplete?: () => void
  ): void {
    this.transitionFromLevel = from;
    this.transitionToLevel = to;
    this.onMidpoint = onMidpoint ?? null;
    this.onComplete = onComplete ?? null;

    this.isActive = true;
    this.progress = 0;
    this.direction = 'out';
    this.visible = true;

    this.render();
  }

  /**
   * Update the transition
   */
  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;

    const speed = 1 / (this.config.duration / 2); // Half duration for each direction
    this.progress += deltaTime * speed;

    // Check for midpoint
    if (this.direction === 'out' && this.progress >= 1) {
      this.progress = 1;
      this.onMidpoint?.();
      this.direction = 'in';
      this.progress = 0;
    }

    // Check for completion
    if (this.direction === 'in' && this.progress >= 1) {
      this.complete();
      return false;
    }

    this.render();
    return true;
  }

  /**
   * Set screen dimensions
   */
  public setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * Force complete the transition
   */
  public forceComplete(): void {
    if (this.isActive) {
      this.complete();
    }
  }

  /**
   * Check if transition is active
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get the levels being transitioned between
   */
  public getTransitionLevels(): { from: ZoomLevel | null; to: ZoomLevel | null } {
    return {
      from: this.transitionFromLevel,
      to: this.transitionToLevel,
    };
  }

  /**
   * Get current progress (0-1, with midpoint at 0.5)
   */
  public getProgress(): number {
    if (this.direction === 'out') {
      return this.progress * 0.5;
    }
    return 0.5 + this.progress * 0.5;
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    const easedProgress = EASINGS[this.config.easing](this.progress);

    switch (this.config.type) {
      case 'fade':
        this.renderFade(easedProgress);
        break;
      case 'zoom_fade':
        this.renderZoomFade(easedProgress);
        break;
      case 'blur_fade':
        this.renderBlurFade(easedProgress);
        break;
      case 'iris':
        this.renderIris(easedProgress);
        break;
      case 'wipe':
        this.renderWipe(easedProgress);
        break;
    }
  }

  private renderFade(progress: number): void {
    this.fadeOverlay.clear();

    // Calculate alpha based on direction
    const alpha = this.direction === 'out' ? progress : 1 - progress;

    this.fadeOverlay.rect(0, 0, this.screenWidth, this.screenHeight);
    this.fadeOverlay.fill({ color: this.config.fadeColor, alpha });
  }

  private renderZoomFade(progress: number): void {
    this.fadeOverlay.clear();

    // Calculate alpha and scale based on direction
    const alpha = this.direction === 'out' ? progress * 0.7 : (1 - progress) * 0.7;

    // Subtle scale effect on parent (would need to be applied externally)
    // This just renders the fade overlay
    this.fadeOverlay.rect(0, 0, this.screenWidth, this.screenHeight);
    this.fadeOverlay.fill({ color: this.config.fadeColor, alpha });

    // Add a subtle vignette effect
    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    const maxRadius = Math.max(this.screenWidth, this.screenHeight);

    // Radial gradient simulation with multiple circles
    const steps = 5;
    for (let i = steps; i > 0; i--) {
      const radius = maxRadius * (i / steps);
      const stepAlpha = alpha * (1 - i / steps) * 0.3;

      this.fadeOverlay.circle(centerX, centerY, radius);
      this.fadeOverlay.fill({ color: this.config.fadeColor, alpha: stepAlpha });
    }
  }

  private renderBlurFade(progress: number): void {
    // Blur effect would need to be applied via a filter on the parent container
    // Here we just render the fade
    this.renderFade(progress);
  }

  private renderIris(progress: number): void {
    this.irisCircle.clear();
    this.fadeOverlay.clear();

    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    const maxRadius = Math.sqrt(
      Math.pow(this.screenWidth / 2, 2) + Math.pow(this.screenHeight / 2, 2)
    );

    // Calculate radius based on direction
    let radius: number;
    if (this.direction === 'out') {
      // Circle shrinks to reveal
      radius = maxRadius * (1 - progress);
    } else {
      // Circle grows from center
      radius = maxRadius * progress;
    }

    // Draw the mask (visible area)
    this.irisCircle.circle(centerX, centerY, radius);
    this.irisCircle.fill({ color: 0xffffff });

    // Draw the surrounding overlay
    this.fadeOverlay.rect(0, 0, this.screenWidth, this.screenHeight);
    this.fadeOverlay.fill({ color: this.config.fadeColor });

    // Cut out the circle
    this.fadeOverlay.circle(centerX, centerY, Math.max(0, radius));
    this.fadeOverlay.cut();
  }

  private renderWipe(progress: number): void {
    this.fadeOverlay.clear();

    // Horizontal wipe from left to right (out) or right to left (in)
    let x: number;
    if (this.direction === 'out') {
      x = this.screenWidth * progress;
      this.fadeOverlay.rect(0, 0, x, this.screenHeight);
    } else {
      x = this.screenWidth * (1 - progress);
      this.fadeOverlay.rect(x, 0, this.screenWidth - x, this.screenHeight);
    }

    this.fadeOverlay.fill({ color: this.config.fadeColor });
  }

  // ============================================
  // STATE
  // ============================================

  private complete(): void {
    this.isActive = false;
    this.visible = false;
    this.progress = 0;
    this.direction = 'out';

    this.fadeOverlay.clear();
    this.irisCircle.clear();
    this.wipeMask.clear();

    this.onComplete?.();

    this.transitionFromLevel = null;
    this.transitionToLevel = null;
    this.onMidpoint = null;
    this.onComplete = null;
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  public setConfig(config: Partial<TransitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): TransitionConfig {
    return { ...this.config };
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.fadeOverlay.destroy();
    this.irisCircle.destroy();
    this.wipeMask.destroy();
    super.destroy({ children: true });
  }
}

// ============================================
// FACTORY
// ============================================

export function createLevelTransition(
  config?: Partial<TransitionConfig>
): LevelTransition {
  return new LevelTransition(config);
}
