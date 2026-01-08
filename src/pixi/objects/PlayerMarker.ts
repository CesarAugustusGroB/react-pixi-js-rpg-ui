// PlayerMarker - Visual representation of the player on the map
// Modern polished design with layered glow effects

import { Container, Graphics, BlurFilter } from 'pixi.js';
import type { Vector2 } from '@/types';
import { COLORS, adjustBrightness } from '../utils/colors';
import { Spring, SPRING_PRESETS, pulse, oscillate } from '../utils/easing';
import { subtract, angle } from '../utils/geometry';

// ============================================
// CONSTANTS
// ============================================

const MARKER_SIZE = 12;
const TRAIL_LENGTH = 10;

// Modern styling
const STYLE = {
  outerGlowRadius: 24,
  outerGlowAlpha: 0.2,
  innerGlowRadius: 16,
  innerGlowAlpha: 0.4,
  shadowOffset: 3,
  shadowAlpha: 0.3,
  trailFadeStart: 0.6,
} as const;

// ============================================
// PLAYER MARKER CLASS
// ============================================

export class PlayerMarker extends Container {
  // Graphics layers (back to front)
  private trail: Graphics;
  private shadow: Graphics;
  private outerGlow: Graphics;
  private innerGlow: Graphics;
  private markerBase: Graphics;
  private markerHighlight: Graphics;
  private markerBorder: Graphics;
  private directionIndicator: Graphics;

  // Animation
  private positionSpring: { x: Spring; y: Spring };
  private rotationSpring: Spring;
  private scaleSpring: Spring;

  // State
  private currentPosition: Vector2 = { x: 0, y: 0 };
  private isTraveling: boolean = false;
  private travelDirection: number = 0;
  private animationTime: number = 0;

  // Trail history
  private trailPositions: Vector2[] = [];

  constructor() {
    super();

    // Initialize springs
    this.positionSpring = {
      x: new Spring(0, SPRING_PRESETS.gentle),
      y: new Spring(0, SPRING_PRESETS.gentle),
    };
    this.rotationSpring = new Spring(0, SPRING_PRESETS.wobbly);
    this.scaleSpring = new Spring(1, SPRING_PRESETS.wobbly);

    // Create visual elements (order matters for layering)
    this.trail = new Graphics();
    this.shadow = new Graphics();
    this.outerGlow = new Graphics();
    this.innerGlow = new Graphics();
    this.markerBase = new Graphics();
    this.markerHighlight = new Graphics();
    this.markerBorder = new Graphics();
    this.directionIndicator = new Graphics();

    // Add in render order (back to front)
    this.addChild(this.trail);
    this.addChild(this.shadow);
    this.addChild(this.outerGlow);
    this.addChild(this.innerGlow);
    this.addChild(this.markerBase);
    this.addChild(this.markerHighlight);
    this.addChild(this.markerBorder);
    this.addChild(this.directionIndicator);

    // Apply blur to glows
    this.outerGlow.filters = [new BlurFilter({ strength: 6 })];
    this.innerGlow.filters = [new BlurFilter({ strength: 3 })];

    // Initial render
    this.renderMarker();
    this.renderGlow();
  }

  // ============================================
  // RENDERING
  // ============================================

  private renderMarker(): void {
    this.markerBase.clear();
    this.markerHighlight.clear();
    this.markerBorder.clear();
    this.shadow.clear();

    // Shadow (offset and darker)
    this.shadow.moveTo(MARKER_SIZE, STYLE.shadowOffset);
    this.shadow.lineTo(-MARKER_SIZE * 0.6, -MARKER_SIZE * 0.5 + STYLE.shadowOffset);
    this.shadow.lineTo(-MARKER_SIZE * 0.3, STYLE.shadowOffset);
    this.shadow.lineTo(-MARKER_SIZE * 0.6, MARKER_SIZE * 0.5 + STYLE.shadowOffset);
    this.shadow.closePath();
    this.shadow.fill({ color: 0x000000, alpha: STYLE.shadowAlpha });

    // Base marker body - arrow pointing in direction
    const baseColor = adjustBrightness(COLORS.PLAYER_MARKER, 0.7);
    this.markerBase.moveTo(MARKER_SIZE, 0);
    this.markerBase.lineTo(-MARKER_SIZE * 0.6, -MARKER_SIZE * 0.5);
    this.markerBase.lineTo(-MARKER_SIZE * 0.3, 0);
    this.markerBase.lineTo(-MARKER_SIZE * 0.6, MARKER_SIZE * 0.5);
    this.markerBase.closePath();
    this.markerBase.fill({ color: baseColor });

    // Highlight layer (lighter, offset up-left for 3D effect)
    this.markerHighlight.moveTo(MARKER_SIZE * 0.8, -MARKER_SIZE * 0.15);
    this.markerHighlight.lineTo(-MARKER_SIZE * 0.4, -MARKER_SIZE * 0.45);
    this.markerHighlight.lineTo(-MARKER_SIZE * 0.2, -MARKER_SIZE * 0.1);
    this.markerHighlight.closePath();
    this.markerHighlight.fill({
      color: adjustBrightness(COLORS.PLAYER_MARKER, 1.5),
      alpha: 0.5,
    });

    // Border stroke
    this.markerBorder.moveTo(MARKER_SIZE, 0);
    this.markerBorder.lineTo(-MARKER_SIZE * 0.6, -MARKER_SIZE * 0.5);
    this.markerBorder.lineTo(-MARKER_SIZE * 0.3, 0);
    this.markerBorder.lineTo(-MARKER_SIZE * 0.6, MARKER_SIZE * 0.5);
    this.markerBorder.closePath();
    this.markerBorder.stroke({
      width: 2,
      color: adjustBrightness(COLORS.PLAYER_MARKER, 1.3),
      alpha: 0.9,
    });

    // Center dot with glow
    this.markerBase.circle(0, 0, 4);
    this.markerBase.fill({ color: 0xffffff, alpha: 0.3 });
    this.markerBase.circle(0, 0, 2.5);
    this.markerBase.fill({ color: 0xffffff, alpha: 0.9 });
  }

  private renderGlow(): void {
    this.outerGlow.clear();
    this.innerGlow.clear();

    // Outer diffuse glow
    this.outerGlow.circle(0, 0, STYLE.outerGlowRadius);
    this.outerGlow.fill({ color: COLORS.PLAYER_MARKER, alpha: STYLE.outerGlowAlpha });

    // Inner concentrated glow
    this.innerGlow.circle(0, 0, STYLE.innerGlowRadius);
    this.innerGlow.fill({ color: COLORS.PLAYER_GLOW, alpha: STYLE.innerGlowAlpha });
  }

  private renderDirectionIndicator(): void {
    this.directionIndicator.clear();

    if (!this.isTraveling) return;

    // Draw modern direction indicator ahead of player
    const indicatorDistance = MARKER_SIZE + 12;
    const arrowLength = 10;

    // Glow behind arrow
    this.directionIndicator.circle(indicatorDistance + arrowLength * 0.5, 0, 6);
    this.directionIndicator.fill({ color: COLORS.PLAYER_TRAIL, alpha: 0.2 });

    // Main line
    this.directionIndicator.moveTo(indicatorDistance, 0);
    this.directionIndicator.lineTo(indicatorDistance + arrowLength, 0);
    this.directionIndicator.stroke({
      width: 3,
      color: COLORS.PLAYER_TRAIL,
      alpha: 0.7,
      cap: 'round',
    });

    // Bright center line
    this.directionIndicator.moveTo(indicatorDistance, 0);
    this.directionIndicator.lineTo(indicatorDistance + arrowLength, 0);
    this.directionIndicator.stroke({
      width: 1.5,
      color: adjustBrightness(COLORS.PLAYER_TRAIL, 1.4),
      alpha: 0.9,
      cap: 'round',
    });

    // Arrow head
    this.directionIndicator.moveTo(indicatorDistance + arrowLength, 0);
    this.directionIndicator.lineTo(indicatorDistance + arrowLength - 5, -4);
    this.directionIndicator.moveTo(indicatorDistance + arrowLength, 0);
    this.directionIndicator.lineTo(indicatorDistance + arrowLength - 5, 4);
    this.directionIndicator.stroke({
      width: 2.5,
      color: COLORS.PLAYER_TRAIL,
      alpha: 0.8,
      cap: 'round',
    });
  }

  private renderTrail(): void {
    this.trail.clear();

    if (this.trailPositions.length < 2) return;

    for (let i = 1; i < this.trailPositions.length; i++) {
      const t = i / this.trailPositions.length;
      const alpha = (1 - t) * STYLE.trailFadeStart;
      const size = (1 - t) * 5 + 2;

      const relX = this.trailPositions[i].x - this.currentPosition.x;
      const relY = this.trailPositions[i].y - this.currentPosition.y;

      // Outer glow for each trail point
      this.trail.circle(relX, relY, size + 2);
      this.trail.fill({ color: COLORS.PLAYER_TRAIL, alpha: alpha * 0.3 });

      // Inner solid trail point
      this.trail.circle(relX, relY, size);
      this.trail.fill({ color: COLORS.PLAYER_TRAIL, alpha });
    }
  }

  // ============================================
  // POSITION UPDATES
  // ============================================

  public setPosition(pos: Vector2, immediate: boolean = false): void {
    if (immediate) {
      this.currentPosition = { ...pos };
      this.positionSpring.x.setPosition(pos.x);
      this.positionSpring.y.setPosition(pos.y);
      this.position.set(pos.x, pos.y);
      this.trailPositions = [];
    } else {
      this.positionSpring.x.setTarget(pos.x);
      this.positionSpring.y.setTarget(pos.y);
    }
  }

  public setTraveling(traveling: boolean): void {
    if (this.isTraveling === traveling) return;
    this.isTraveling = traveling;

    if (traveling) {
      this.scaleSpring.setTarget(1.1);
    } else {
      this.scaleSpring.setTarget(1);
      this.trailPositions = [];
    }

    this.renderDirectionIndicator();
  }

  public setTravelTarget(target: Vector2): void {
    const direction = subtract(target, this.currentPosition);
    this.travelDirection = angle(direction);
    this.rotationSpring.setTarget(this.travelDirection);
    this.renderDirectionIndicator();
  }

  // ============================================
  // ANIMATION
  // ============================================

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update position springs
    const newX = this.positionSpring.x.update(deltaTime);
    const newY = this.positionSpring.y.update(deltaTime);

    // Store trail position before updating
    if (this.isTraveling) {
      const dist = Math.sqrt(
        Math.pow(newX - this.currentPosition.x, 2) +
        Math.pow(newY - this.currentPosition.y, 2)
      );
      if (dist > 5) {
        this.trailPositions.unshift({ ...this.currentPosition });
        if (this.trailPositions.length > TRAIL_LENGTH) {
          this.trailPositions.pop();
        }
      }
    }

    this.currentPosition = { x: newX, y: newY };
    this.position.set(newX, newY);

    // Update rotation for all marker layers
    const rotation = this.rotationSpring.update(deltaTime);
    this.shadow.rotation = rotation;
    this.markerBase.rotation = rotation;
    this.markerHighlight.rotation = rotation;
    this.markerBorder.rotation = rotation;
    this.directionIndicator.rotation = rotation;

    // Update scale with breathing effect
    const baseScale = this.scaleSpring.update(deltaTime);
    const breathe = pulse(this.animationTime, 0.8, 0.97, 1.03);
    const finalScale = baseScale * breathe;

    this.shadow.scale.set(finalScale);
    this.markerBase.scale.set(finalScale);
    this.markerHighlight.scale.set(finalScale);
    this.markerBorder.scale.set(finalScale);

    // Glow pulse (dual layer)
    const outerGlowPulse = pulse(this.animationTime, 1.2, 0.15, 0.3);
    const innerGlowPulse = pulse(this.animationTime, 1.5, 0.3, 0.5);
    this.outerGlow.alpha = outerGlowPulse;
    this.innerGlow.alpha = innerGlowPulse;

    // Bobbing effect when traveling
    if (this.isTraveling) {
      const bob = oscillate(this.animationTime, 2, 1.5);
      this.shadow.position.y = STYLE.shadowOffset + bob * 0.5;
      this.markerBase.position.y = bob;
      this.markerHighlight.position.y = bob;
      this.markerBorder.position.y = bob;
    } else {
      this.shadow.position.y = STYLE.shadowOffset;
      this.markerBase.position.y = 0;
      this.markerHighlight.position.y = 0;
      this.markerBorder.position.y = 0;
    }

    // Update trail rendering
    this.renderTrail();
  }

  // ============================================
  // HELPERS
  // ============================================

  public getCurrentPosition(): Vector2 {
    return { ...this.currentPosition };
  }

  public isAtTarget(): boolean {
    return (
      this.positionSpring.x.isSettled() &&
      this.positionSpring.y.isSettled()
    );
  }

  public playArrivalEffect(): void {
    this.scaleSpring.setPosition(1.5);
    this.scaleSpring.setTarget(1);
  }

  public playDepartureEffect(): void {
    this.scaleSpring.setPosition(0.8);
    this.scaleSpring.setTarget(1.1);
  }
}
