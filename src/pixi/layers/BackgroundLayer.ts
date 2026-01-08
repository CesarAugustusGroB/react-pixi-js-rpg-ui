// BackgroundLayer - Base map background with biome coloring and grid
// Renders below all other layers

import { Container, Graphics } from 'pixi.js';
import type { MapZone, Bounds, TimeOfDay } from '@/types';
import { COLORS, getBiomeColor, getTimeOfDayTint } from '../utils/colors';

// ============================================
// CONSTANTS
// ============================================

const GRID_SIZE = 50;
const GRID_ALPHA = 0.1;

// ============================================
// BACKGROUND LAYER CLASS
// ============================================

export class BackgroundLayer extends Container {
  private backgroundFill: Graphics;
  private zoneOverlays: Map<string, Graphics> = new Map();
  private grid: Graphics;

  private bounds: Bounds;
  private currentTimeOfDay: TimeOfDay = 'morning';

  constructor(bounds: Bounds) {
    super();
    this.bounds = bounds;

    // Create layers
    this.backgroundFill = new Graphics();
    this.grid = new Graphics();

    this.addChild(this.backgroundFill);
    this.addChild(this.grid);

    // Initial render
    this.renderBackground();
    this.renderGrid();
  }

  // ============================================
  // RENDERING
  // ============================================

  private renderBackground(): void {
    this.backgroundFill.clear();

    // Base dark background
    this.backgroundFill.rect(
      this.bounds.x,
      this.bounds.y,
      this.bounds.width,
      this.bounds.height
    );
    this.backgroundFill.fill({ color: COLORS.BACKGROUND });
  }

  private renderGrid(): void {
    this.grid.clear();

    const { x, y, width, height } = this.bounds;

    // Vertical lines
    for (let gx = x; gx <= x + width; gx += GRID_SIZE) {
      this.grid.moveTo(gx, y);
      this.grid.lineTo(gx, y + height);
    }

    // Horizontal lines
    for (let gy = y; gy <= y + height; gy += GRID_SIZE) {
      this.grid.moveTo(x, gy);
      this.grid.lineTo(x + width, gy);
    }

    this.grid.stroke({
      width: 1,
      color: COLORS.UI_BORDER,
      alpha: GRID_ALPHA,
    });
  }

  // ============================================
  // ZONE RENDERING
  // ============================================

  public renderZones(zones: MapZone[]): void {
    // Clear existing zone overlays
    for (const overlay of this.zoneOverlays.values()) {
      this.removeChild(overlay);
      overlay.destroy();
    }
    this.zoneOverlays.clear();

    // Render each zone
    for (const zone of zones) {
      const overlay = new Graphics();
      const color = getBiomeColor(zone.biome);

      // Zone background
      overlay.rect(
        zone.bounds.x,
        zone.bounds.y,
        zone.bounds.width,
        zone.bounds.height
      );
      overlay.fill({ color, alpha: 0.15 });

      // Zone border
      overlay.rect(
        zone.bounds.x,
        zone.bounds.y,
        zone.bounds.width,
        zone.bounds.height
      );
      overlay.stroke({
        width: 2,
        color,
        alpha: 0.3,
      });

      this.addChildAt(overlay, 1); // After background, before grid
      this.zoneOverlays.set(zone.id, overlay);
    }
  }

  // ============================================
  // TIME OF DAY
  // ============================================

  public setTimeOfDay(timeOfDay: TimeOfDay): void {
    if (this.currentTimeOfDay === timeOfDay) return;
    this.currentTimeOfDay = timeOfDay;

    const tint = getTimeOfDayTint(timeOfDay);
    this.backgroundFill.tint = tint;

    // Adjust grid visibility based on time
    const isDark = timeOfDay === 'night' || timeOfDay === 'evening';
    this.grid.alpha = isDark ? GRID_ALPHA * 0.5 : GRID_ALPHA;
  }

  // ============================================
  // BOUNDS UPDATE
  // ============================================

  public updateBounds(bounds: Bounds): void {
    this.bounds = bounds;
    this.renderBackground();
    this.renderGrid();
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    for (const overlay of this.zoneOverlays.values()) {
      overlay.destroy();
    }
    this.zoneOverlays.clear();
    super.destroy({ children: true });
  }
}
