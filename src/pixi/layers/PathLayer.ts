// PathLayer - Renders all travel paths between locations
// Manages PathLine objects and travel highlighting

import { Container } from 'pixi.js';
import type { Path, MapLocation } from '@/types';
import { PathLine } from '../objects/PathLine';

// ============================================
// PATH LAYER CLASS
// ============================================

export class PathLayer extends Container {
  private pathLines: Map<string, PathLine> = new Map();
  private locations: Map<string, MapLocation> = new Map();
  private highlightedPathIds: Set<string> = new Set();

  constructor() {
    super();
  }

  // ============================================
  // PATH MANAGEMENT
  // ============================================

  public initializePaths(
    paths: Path[],
    locations: MapLocation[]
  ): void {
    // Store locations for reference
    this.locations.clear();
    for (const location of locations) {
      this.locations.set(location.id, location);
    }

    // Clear existing paths
    this.clearPaths();

    // Create path lines
    for (const path of paths) {
      this.addPath(path);
    }
  }

  public addPath(path: Path): void {
    // Get connected locations from path's sourceId and targetId
    const startLocation = this.locations.get(path.sourceId);
    const endLocation = this.locations.get(path.targetId);

    if (!startLocation || !endLocation) return;

    // Create path line
    const pathLine = new PathLine(path, startLocation, endLocation);
    this.pathLines.set(path.id, pathLine);
    this.addChild(pathLine);
  }

  public removePath(pathId: string): void {
    const pathLine = this.pathLines.get(pathId);
    if (pathLine) {
      this.removeChild(pathLine);
      pathLine.destroy();
      this.pathLines.delete(pathId);
    }
  }

  public clearPaths(): void {
    for (const pathLine of this.pathLines.values()) {
      this.removeChild(pathLine);
      pathLine.destroy();
    }
    this.pathLines.clear();
  }

  // ============================================
  // LOCATION UPDATES
  // ============================================

  public updateLocations(locations: MapLocation[]): void {
    // Update location map
    for (const location of locations) {
      this.locations.set(location.id, location);
    }

    // Update path lines with new location states
    for (const pathLine of this.pathLines.values()) {
      const path = pathLine.getPath();

      const startLocation = this.locations.get(path.sourceId);
      const endLocation = this.locations.get(path.targetId);

      if (startLocation && endLocation) {
        pathLine.updateLocations(startLocation, endLocation);
      }
    }
  }

  // ============================================
  // HIGHLIGHTING
  // ============================================

  public highlightPath(pathId: string): void {
    const pathLine = this.pathLines.get(pathId);
    if (pathLine) {
      pathLine.setHighlighted(true);
      this.highlightedPathIds.add(pathId);
    }
  }

  public unhighlightPath(pathId: string): void {
    const pathLine = this.pathLines.get(pathId);
    if (pathLine) {
      pathLine.setHighlighted(false);
      this.highlightedPathIds.delete(pathId);
    }
  }

  public highlightRoute(pathIds: string[]): void {
    // Unhighlight all first
    this.clearHighlights();

    // Highlight route paths
    for (const pathId of pathIds) {
      this.highlightPath(pathId);
    }
  }

  public clearHighlights(): void {
    for (const pathId of this.highlightedPathIds) {
      const pathLine = this.pathLines.get(pathId);
      if (pathLine) {
        pathLine.setHighlighted(false);
      }
    }
    this.highlightedPathIds.clear();
  }

  // ============================================
  // FLASH ANIMATION (for click-to-move preview)
  // ============================================

  /**
   * Flash a route to provide visual feedback before travel starts
   * Used by click-to-move system
   */
  public async flashRoute(pathIds: string[], duration: number = 300): Promise<void> {
    // Get all valid path lines
    const pathLines: PathLine[] = [];
    for (const pathId of pathIds) {
      const pathLine = this.pathLines.get(pathId);
      if (pathLine) {
        pathLines.push(pathLine);
      }
    }

    if (pathLines.length === 0) return;

    // Flash all paths simultaneously
    await Promise.all(pathLines.map((pathLine) => pathLine.flash(duration)));
  }

  /**
   * Flash a single path
   */
  public async flashPath(pathId: string, duration: number = 300): Promise<void> {
    const pathLine = this.pathLines.get(pathId);
    if (pathLine) {
      await pathLine.flash(duration);
    }
  }

  // ============================================
  // TRAVEL ANIMATION
  // ============================================

  public setPathTraveling(pathId: string, traveling: boolean, progress: number = 0): void {
    const pathLine = this.pathLines.get(pathId);
    if (pathLine) {
      pathLine.setTraveling(traveling, progress);
    }
  }

  public updateTravelProgress(pathId: string, progress: number): void {
    const pathLine = this.pathLines.get(pathId);
    if (pathLine) {
      pathLine.updateTravelProgress(progress);
    }
  }

  // ============================================
  // QUERIES
  // ============================================

  public getPathLine(pathId: string): PathLine | undefined {
    return this.pathLines.get(pathId);
  }

  public getPathsConnectingLocation(locationId: string): PathLine[] {
    const result: PathLine[] = [];
    for (const pathLine of this.pathLines.values()) {
      if (pathLine.connectsLocation(locationId)) {
        result.push(pathLine);
      }
    }
    return result;
  }

  public getVisiblePaths(): PathLine[] {
    return Array.from(this.pathLines.values()).filter(p => p.isVisible());
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    for (const pathLine of this.pathLines.values()) {
      pathLine.update(deltaTime);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.clearPaths();
    this.locations.clear();
    super.destroy({ children: true });
  }
}
