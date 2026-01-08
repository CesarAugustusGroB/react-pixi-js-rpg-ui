// PathLine - Visual representation of a travel path between locations
// Modern design with gradient-like strokes and glow effects

import { Container, Graphics } from 'pixi.js';
import type { Path, MapLocation, DiscoveryState } from '@/types';
import { COLORS, getDangerColor, lerpColor, adjustBrightness } from '../utils/colors';
import {
  calculateControlPoints,
  sampleBezierPath,
  cubicBezier,
  distance,
} from '../utils/geometry';
import { pulse } from '../utils/easing';

// ============================================
// CONSTANTS
// ============================================

const PATH_WIDTH = {
  unknown: 1.5,
  rumored: 2,
  discovered: 3,
  visited: 3.5,
} as const;

// Modern styling constants
const STYLE = {
  glowWidth: 8,
  glowAlpha: 0.15,
  highlightGlowWidth: 12,
  highlightGlowAlpha: 0.25,
  travelGlowWidth: 14,
  travelGlowAlpha: 0.4,
  flashDuration: 300,
  depthVariation: 0.3, // Width variation for depth effect
} as const;

// ============================================
// PATH LINE CLASS
// ============================================

export class PathLine extends Container {
  private path: Path;
  private startLocation: MapLocation;
  private endLocation: MapLocation;

  // Graphics layers (back to front)
  private glowLine: Graphics;
  private mainLine: Graphics;
  private highlightLine: Graphics;
  private dangerOverlay: Graphics;
  private travelHighlight: Graphics;
  private travelGlow: Graphics;
  private flashOverlay: Graphics;

  // Cached bezier points
  private controlPoint1: { x: number; y: number };
  private controlPoint2: { x: number; y: number };
  private sampledPoints: { x: number; y: number }[];

  // State
  private discoveryState: DiscoveryState = 'unknown';
  private isHighlighted: boolean = false;
  private travelProgress: number = 0;
  private isTraveling: boolean = false;
  private animationTime: number = 0;
  private isFlashing: boolean = false;
  private flashProgress: number = 0;

  constructor(path: Path, startLocation: MapLocation, endLocation: MapLocation) {
    super();
    this.path = path;
    this.startLocation = startLocation;
    this.endLocation = endLocation;

    // Create graphics layers (order matters for layering)
    this.glowLine = new Graphics();
    this.mainLine = new Graphics();
    this.highlightLine = new Graphics();
    this.dangerOverlay = new Graphics();
    this.travelGlow = new Graphics();
    this.travelHighlight = new Graphics();
    this.flashOverlay = new Graphics();

    this.addChild(this.glowLine);
    this.addChild(this.mainLine);
    this.addChild(this.highlightLine);
    this.addChild(this.dangerOverlay);
    this.addChild(this.travelGlow);
    this.addChild(this.travelHighlight);
    this.addChild(this.flashOverlay);

    // Calculate control points
    const { cp1, cp2 } = calculateControlPoints(
      startLocation.position,
      endLocation.position,
      0.2
    );
    this.controlPoint1 = cp1;
    this.controlPoint2 = cp2;

    // Sample points for rendering
    this.sampledPoints = sampleBezierPath(
      startLocation.position,
      cp1,
      cp2,
      endLocation.position,
      30
    );

    // Determine initial discovery state
    this.updateDiscoveryState();
    this.render();
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    this.renderGlowLine();
    this.renderMainLine();
    this.renderHighlightLine();
    this.renderDangerOverlay();
    this.renderTravelHighlight();
  }

  private renderGlowLine(): void {
    this.glowLine.clear();

    // Only show glow for visible paths
    if (this.discoveryState === 'unknown') return;
    if (this.sampledPoints.length < 2) return;

    const color = this.getPathColor();
    const glowWidth = this.isHighlighted ? STYLE.highlightGlowWidth : STYLE.glowWidth;
    const glowAlpha = this.isHighlighted ? STYLE.highlightGlowAlpha : STYLE.glowAlpha;

    // Draw multiple glow layers for soft effect
    const layers = 3;
    for (let layer = layers; layer >= 1; layer--) {
      const layerWidth = glowWidth * (layer / layers);
      const layerAlpha = glowAlpha / layer;

      this.glowLine.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);

      for (let i = 1; i < this.sampledPoints.length; i++) {
        this.glowLine.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
      }

      this.glowLine.stroke({
        width: layerWidth,
        color,
        alpha: layerAlpha,
        cap: 'round',
        join: 'round',
      });
    }
  }

  private renderMainLine(): void {
    this.mainLine.clear();

    const baseWidth = PATH_WIDTH[this.discoveryState];
    const color = this.getPathColor();
    const alpha = this.discoveryState === 'unknown' ? 0.25 : 0.85;

    if (this.sampledPoints.length < 2) return;

    // Draw with varying width for depth effect (thicker in middle)
    for (let i = 1; i < this.sampledPoints.length; i++) {
      const progress = i / (this.sampledPoints.length - 1);
      // Width varies: thinner at ends, thicker in middle
      const depthFactor = 1 + Math.sin(progress * Math.PI) * STYLE.depthVariation;
      const width = baseWidth * depthFactor;

      this.mainLine.moveTo(this.sampledPoints[i - 1].x, this.sampledPoints[i - 1].y);
      this.mainLine.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);

      this.mainLine.stroke({
        width,
        color,
        alpha,
        cap: 'round',
        join: 'round',
      });
    }

    // Draw highlight edge on top for depth
    if (this.discoveryState !== 'unknown') {
      const highlightColor = adjustBrightness(color, 1.3);

      this.mainLine.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);
      for (let i = 1; i < this.sampledPoints.length; i++) {
        this.mainLine.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
      }

      this.mainLine.stroke({
        width: baseWidth * 0.4,
        color: highlightColor,
        alpha: 0.4,
        cap: 'round',
        join: 'round',
      });
    }
  }

  private renderHighlightLine(): void {
    this.highlightLine.clear();

    if (!this.isHighlighted || this.isTraveling) return;
    if (this.sampledPoints.length < 2) return;

    // Bright highlight when path is selected
    this.highlightLine.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);

    for (let i = 1; i < this.sampledPoints.length; i++) {
      this.highlightLine.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
    }

    this.highlightLine.stroke({
      width: PATH_WIDTH[this.discoveryState] + 2,
      color: COLORS.PATH_TRAVEL_ACTIVE,
      alpha: 0.6,
      cap: 'round',
      join: 'round',
    });
  }

  private renderDangerOverlay(): void {
    this.dangerOverlay.clear();

    // Only show danger for discovered/visited paths
    if (this.discoveryState !== 'discovered' && this.discoveryState !== 'visited') {
      return;
    }

    // Path type determines danger visual
    const isDangerous = this.path.pathType === 'wilderness' || this.path.pathType === 'hidden';
    if (!isDangerous) return;

    const dangerLevel = 0.6;
    const dangerColor = getDangerColor(dangerLevel);
    const segmentCount = this.sampledPoints.length - 1;

    // Draw modern danger indicators along path
    for (let i = 0; i < segmentCount; i += 4) {
      const point = this.sampledPoints[i];

      // Outer glow
      this.dangerOverlay.circle(point.x, point.y, 5);
      this.dangerOverlay.fill({ color: dangerColor, alpha: 0.15 });

      // Inner dot
      this.dangerOverlay.circle(point.x, point.y, 2.5);
      this.dangerOverlay.fill({ color: dangerColor, alpha: 0.4 });
    }
  }

  private renderTravelHighlight(): void {
    this.travelHighlight.clear();
    this.travelGlow.clear();

    if (!this.isTraveling || !this.isHighlighted) return;

    // Draw progress along path
    const progressIndex = Math.floor(this.travelProgress * (this.sampledPoints.length - 1));

    if (progressIndex < 1) return;

    // Calculate exact end point
    let endPoint = this.sampledPoints[progressIndex];
    if (progressIndex < this.sampledPoints.length - 1) {
      const segmentProgress = (this.travelProgress * (this.sampledPoints.length - 1)) % 1;
      const current = this.sampledPoints[progressIndex];
      const next = this.sampledPoints[progressIndex + 1];
      endPoint = {
        x: current.x + (next.x - current.x) * segmentProgress,
        y: current.y + (next.y - current.y) * segmentProgress,
      };
    }

    // Draw travel glow (behind main line)
    this.travelGlow.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);
    for (let i = 1; i <= progressIndex; i++) {
      this.travelGlow.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
    }
    this.travelGlow.lineTo(endPoint.x, endPoint.y);

    this.travelGlow.stroke({
      width: STYLE.travelGlowWidth,
      color: COLORS.PATH_TRAVEL_ACTIVE,
      alpha: STYLE.travelGlowAlpha,
      cap: 'round',
      join: 'round',
    });

    // Draw main travel line
    this.travelHighlight.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);
    for (let i = 1; i <= progressIndex; i++) {
      this.travelHighlight.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
    }
    this.travelHighlight.lineTo(endPoint.x, endPoint.y);

    this.travelHighlight.stroke({
      width: 4,
      color: COLORS.PATH_TRAVEL_ACTIVE,
      alpha: 0.95,
      cap: 'round',
      join: 'round',
    });

    // Bright center line
    this.travelHighlight.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);
    for (let i = 1; i <= progressIndex; i++) {
      this.travelHighlight.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
    }
    this.travelHighlight.lineTo(endPoint.x, endPoint.y);

    this.travelHighlight.stroke({
      width: 1.5,
      color: adjustBrightness(COLORS.PATH_TRAVEL_ACTIVE, 1.4),
      alpha: 0.8,
      cap: 'round',
      join: 'round',
    });
  }

  private renderFlashOverlay(): void {
    this.flashOverlay.clear();

    if (!this.isFlashing || this.flashProgress <= 0) return;
    if (this.sampledPoints.length < 2) return;

    // Flash effect fades out
    const alpha = this.flashProgress * 0.8;
    const width = 6 + (1 - this.flashProgress) * 4;

    // Outer glow
    this.flashOverlay.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);
    for (let i = 1; i < this.sampledPoints.length; i++) {
      this.flashOverlay.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
    }
    this.flashOverlay.stroke({
      width: width + 6,
      color: COLORS.PATH_TRAVEL_ACTIVE,
      alpha: alpha * 0.3,
      cap: 'round',
      join: 'round',
    });

    // Main flash
    this.flashOverlay.moveTo(this.sampledPoints[0].x, this.sampledPoints[0].y);
    for (let i = 1; i < this.sampledPoints.length; i++) {
      this.flashOverlay.lineTo(this.sampledPoints[i].x, this.sampledPoints[i].y);
    }
    this.flashOverlay.stroke({
      width,
      color: COLORS.PATH_TRAVEL_ACTIVE,
      alpha,
      cap: 'round',
      join: 'round',
    });
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  public updateLocations(start: MapLocation, end: MapLocation): void {
    this.startLocation = start;
    this.endLocation = end;
    this.updateDiscoveryState();
    this.render();
  }

  private updateDiscoveryState(): void {
    const startState = this.startLocation.discoveryState;
    const endState = this.endLocation.discoveryState;

    // Path discovery is the minimum of both endpoints
    const stateOrder: DiscoveryState[] = ['unknown', 'rumored', 'discovered', 'visited'];
    const startIndex = stateOrder.indexOf(startState);
    const endIndex = stateOrder.indexOf(endState);

    this.discoveryState = stateOrder[Math.min(startIndex, endIndex)];
  }

  public setHighlighted(highlighted: boolean): void {
    if (this.isHighlighted === highlighted) return;
    this.isHighlighted = highlighted;
    this.render();
  }

  public setTraveling(traveling: boolean, progress: number = 0): void {
    this.isTraveling = traveling;
    this.travelProgress = progress;
    this.renderTravelHighlight();
  }

  public updateTravelProgress(progress: number): void {
    this.travelProgress = Math.max(0, Math.min(1, progress));
    this.renderTravelHighlight();
  }

  // ============================================
  // FLASH ANIMATION (for click-to-move preview)
  // ============================================

  /**
   * Play a flash animation on the path to indicate it will be traveled
   * Used by click-to-move system for visual feedback
   */
  public flash(duration: number = STYLE.flashDuration): Promise<void> {
    return new Promise((resolve) => {
      this.isFlashing = true;
      this.flashProgress = 1;

      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out quad for smooth fade
        this.flashProgress = 1 - progress * progress;
        this.renderFlashOverlay();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isFlashing = false;
          this.flashProgress = 0;
          this.renderFlashOverlay();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  // ============================================
  // ANIMATION
  // ============================================

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate travel highlight with pulse
    if (this.isTraveling && this.isHighlighted) {
      const pulseAlpha = pulse(this.animationTime, 2, 0.7, 1);
      this.travelHighlight.alpha = pulseAlpha;
      this.travelGlow.alpha = pulseAlpha * 0.8;
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private getPathColor(): number {
    if (this.isHighlighted) return COLORS.PATH_TRAVEL_ACTIVE;

    switch (this.discoveryState) {
      case 'unknown':
        return COLORS.PATH_UNKNOWN;
      case 'rumored':
        return lerpColor(COLORS.PATH_UNKNOWN, COLORS.PATH_SAFE, 0.5);
      case 'discovered':
      case 'visited':
        // Path type determines color
        return this.path.pathType === 'wilderness' || this.path.pathType === 'hidden'
          ? COLORS.PATH_DANGEROUS
          : COLORS.PATH_SAFE;
      default:
        return COLORS.PATH_UNKNOWN;
    }
  }

  public getPath(): Path {
    return this.path;
  }

  public getPathId(): string {
    return this.path.id;
  }

  public getPointAtProgress(progress: number): { x: number; y: number } {
    return cubicBezier(
      this.startLocation.position,
      this.controlPoint1,
      this.controlPoint2,
      this.endLocation.position,
      progress
    );
  }

  public getTotalLength(): number {
    let total = 0;
    for (let i = 1; i < this.sampledPoints.length; i++) {
      total += distance(this.sampledPoints[i - 1], this.sampledPoints[i]);
    }
    return total;
  }

  public isVisible(): boolean {
    return this.discoveryState !== 'unknown';
  }

  public connectsLocation(locationId: string): boolean {
    return (
      this.startLocation.id === locationId ||
      this.endLocation.id === locationId
    );
  }
}
