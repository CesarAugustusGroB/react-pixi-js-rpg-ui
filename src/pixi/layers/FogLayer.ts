// FogLayer - Fog of war overlay that reveals based on discovery state
// Uses alpha masking for smooth reveal effects

import { Container, Graphics } from 'pixi.js';
import type { MapLocation, Bounds, Vector2 } from '@/types';
import { COLORS } from '../utils/colors';
import { Easing, Tween } from '../utils/easing';

// ============================================
// CONSTANTS
// ============================================

const FOG_REVEAL_RADIUS = {
  unknown: 0,
  rumored: 30,
  discovered: 60,
  visited: 80,
} as const;

const REVEAL_ANIMATION_DURATION = 500; // ms

// ============================================
// FOG LAYER CLASS
// ============================================

export class FogLayer extends Container {
  private fogGraphics: Graphics;
  private revealMask: Graphics;
  private bounds: Bounds;

  // Track revealed locations
  private revealedLocations: Map<string, { position: Vector2; radius: number }> = new Map();
  private pendingReveals: Map<string, Tween> = new Map();

  constructor(bounds: Bounds) {
    super();
    this.bounds = bounds;

    // Create fog overlay
    this.fogGraphics = new Graphics();
    this.revealMask = new Graphics();

    this.addChild(this.fogGraphics);

    // Set up masking
    this.fogGraphics.mask = this.revealMask;
    this.addChild(this.revealMask);

    // Initial render
    this.renderFog();
  }

  // ============================================
  // RENDERING
  // ============================================

  private renderFog(): void {
    this.fogGraphics.clear();

    // Full fog coverage
    this.fogGraphics.rect(
      this.bounds.x - 100,
      this.bounds.y - 100,
      this.bounds.width + 200,
      this.bounds.height + 200
    );
    this.fogGraphics.fill({ color: COLORS.FOG_HIDDEN, alpha: 0.9 });
  }

  private renderRevealMask(): void {
    this.revealMask.clear();

    // Draw full bounds first (everything hidden)
    this.revealMask.rect(
      this.bounds.x - 100,
      this.bounds.y - 100,
      this.bounds.width + 200,
      this.bounds.height + 200
    );
    this.revealMask.fill({ color: 0xffffff });

    // Cut out revealed areas
    for (const [_, reveal] of this.revealedLocations) {
      this.revealMask.circle(reveal.position.x, reveal.position.y, reveal.radius);
      this.revealMask.cut();
    }
  }

  // ============================================
  // REVEAL MANAGEMENT
  // ============================================

  public updateLocations(locations: MapLocation[]): void {
    for (const location of locations) {
      const targetRadius = FOG_REVEAL_RADIUS[location.discoveryState];
      const current = this.revealedLocations.get(location.id);

      if (targetRadius === 0) {
        // Remove reveal for unknown locations
        if (current) {
          this.revealedLocations.delete(location.id);
        }
        continue;
      }

      if (!current) {
        // New reveal - animate in
        this.animateReveal(location.id, location.position, 0, targetRadius);
      } else if (current.radius !== targetRadius) {
        // State changed - animate to new radius
        this.animateReveal(location.id, location.position, current.radius, targetRadius);
      }
    }

    this.renderRevealMask();
  }

  private animateReveal(
    locationId: string,
    position: Vector2,
    fromRadius: number,
    toRadius: number
  ): void {
    // Cancel existing animation
    const existing = this.pendingReveals.get(locationId);
    if (existing) {
      existing.stop();
    }

    // Set initial state
    this.revealedLocations.set(locationId, { position, radius: fromRadius });

    // Create tween
    const tween = new Tween(fromRadius, toRadius, {
      duration: REVEAL_ANIMATION_DURATION,
      easing: Easing.easeOutCubic,
      onUpdate: (value) => {
        const reveal = this.revealedLocations.get(locationId);
        if (reveal) {
          reveal.radius = value;
          this.renderRevealMask();
        }
      },
      onComplete: () => {
        this.pendingReveals.delete(locationId);
      },
    });

    this.pendingReveals.set(locationId, tween);
  }

  // ============================================
  // MANUAL REVEAL
  // ============================================

  public revealArea(position: Vector2, radius: number): void {
    const id = `manual_${position.x}_${position.y}`;
    this.revealedLocations.set(id, { position, radius });
    this.renderRevealMask();
  }

  public clearManualReveals(): void {
    const manualKeys = Array.from(this.revealedLocations.keys()).filter(k => k.startsWith('manual_'));
    for (const key of manualKeys) {
      this.revealedLocations.delete(key);
    }
    this.renderRevealMask();
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    // Update pending animations
    const deltaMs = deltaTime * 1000;
    for (const [id, tween] of this.pendingReveals) {
      tween.update(deltaMs);
      if (tween.isComplete()) {
        this.pendingReveals.delete(id);
      }
    }
  }

  // ============================================
  // BOUNDS UPDATE
  // ============================================

  public updateBounds(bounds: Bounds): void {
    this.bounds = bounds;
    this.renderFog();
    this.renderRevealMask();
  }

  // ============================================
  // VISIBILITY
  // ============================================

  public setFogEnabled(enabled: boolean): void {
    this.visible = enabled;
  }

  public setFogOpacity(opacity: number): void {
    this.fogGraphics.alpha = opacity;
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    for (const tween of this.pendingReveals.values()) {
      tween.stop();
    }
    this.pendingReveals.clear();
    this.revealedLocations.clear();
    super.destroy({ children: true });
  }
}
