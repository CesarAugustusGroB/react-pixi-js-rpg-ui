// NPCMovementSystem - Manages NPC movement along paths
// Handles smooth bezier interpolation, pausing at locations, and route completion

import type { Vector2, Path, MapLocation } from '@/types';
import type {
  NPCEntity,
  NPCSpawnConfig,
  NPCPositionUpdate,
  NPCState,
} from '@/types/npc';
import {
  cubicBezier,
  bezierTangent,
  normalize,
  calculateControlPoints,
} from '../utils/geometry';

// ============================================
// CONFIGURATION
// ============================================

export interface NPCMovementConfig {
  /** Default speed for NPCs (progress per game minute) */
  defaultSpeed: number;

  /** Default pause duration at locations (game minutes) */
  defaultPauseDuration: number;

  /** Fade in/out duration for spawning/despawning (seconds) */
  fadeDuration: number;

  /** Maximum NPCs to track at once */
  maxNPCs: number;
}

const DEFAULT_CONFIG: NPCMovementConfig = {
  defaultSpeed: 0.02,        // ~50 minutes per path segment
  defaultPauseDuration: 5,   // 5 game minutes at each location
  fadeDuration: 0.5,         // Half second fade
  maxNPCs: 50,
};

// ============================================
// NPC MOVEMENT SYSTEM
// ============================================

export class NPCMovementSystem {
  private config: NPCMovementConfig;
  private npcs: Map<string, NPCEntity> = new Map();
  private locations: Map<string, MapLocation> = new Map();
  private paths: Map<string, Path> = new Map();
  private pathLookup: Map<string, string> = new Map(); // "locA:locB" -> pathId
  private nextId: number = 1;

  // Callbacks
  private onPositionUpdate: ((updates: NPCPositionUpdate[]) => void) | null = null;
  private onNPCSpawned: ((npc: NPCEntity) => void) | null = null;
  private onNPCDespawned: ((npcId: string) => void) | null = null;
  private onNPCStateChange: ((npcId: string, oldState: NPCState, newState: NPCState) => void) | null = null;

  constructor(config: Partial<NPCMovementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Update map data for pathfinding
   */
  public updateMapData(
    locations: Record<string, MapLocation>,
    paths: Record<string, Path>
  ): void {
    this.locations = new Map(Object.entries(locations));
    this.paths = new Map(Object.entries(paths));

    // Build path lookup for quick access
    this.pathLookup.clear();
    for (const [pathId, path] of this.paths) {
      const key1 = `${path.sourceId}:${path.targetId}`;
      const key2 = `${path.targetId}:${path.sourceId}`;
      this.pathLookup.set(key1, pathId);
      this.pathLookup.set(key2, pathId);
    }
  }

  // ============================================
  // CALLBACKS
  // ============================================

  public setPositionUpdateCallback(callback: (updates: NPCPositionUpdate[]) => void): void {
    this.onPositionUpdate = callback;
  }

  public setSpawnCallback(callback: (npc: NPCEntity) => void): void {
    this.onNPCSpawned = callback;
  }

  public setDespawnCallback(callback: (npcId: string) => void): void {
    this.onNPCDespawned = callback;
  }

  public setStateChangeCallback(
    callback: (npcId: string, oldState: NPCState, newState: NPCState) => void
  ): void {
    this.onNPCStateChange = callback;
  }

  // ============================================
  // NPC MANAGEMENT
  // ============================================

  /**
   * Spawn a new NPC on the map
   */
  public spawnNPC(spawnConfig: NPCSpawnConfig, gameTime: number): NPCEntity | null {
    if (this.npcs.size >= this.config.maxNPCs) {
      console.warn('NPCMovementSystem: Max NPC limit reached');
      return null;
    }

    // Validate route
    if (spawnConfig.route.length < 2) {
      console.warn('NPCMovementSystem: Route must have at least 2 locations');
      return null;
    }

    // Get starting location
    const startLocation = this.locations.get(spawnConfig.route[0]);
    if (!startLocation) {
      console.warn(`NPCMovementSystem: Start location ${spawnConfig.route[0]} not found`);
      return null;
    }

    // Build route path IDs
    const routePathIds = this.buildRoutePathIds(spawnConfig.route);
    if (routePathIds.length !== spawnConfig.route.length - 1) {
      console.warn('NPCMovementSystem: Could not build complete path for route');
      return null;
    }

    const id = `npc_${this.nextId++}`;

    const npc: NPCEntity = {
      id,
      type: spawnConfig.type,
      name: spawnConfig.name,
      spriteKey: spawnConfig.spriteKey,
      tint: spawnConfig.tint,
      scale: spawnConfig.scale ?? 1,

      route: spawnConfig.route,
      routePathIds,
      behavior: spawnConfig.behavior,

      state: 'idle',
      currentRouteIndex: 0,
      currentPathId: null,
      pathProgress: 0,
      isReversing: false,

      speed: spawnConfig.speed ?? this.config.defaultSpeed,
      baseSpeed: spawnConfig.speed ?? this.config.defaultSpeed,

      position: { ...startLocation.position },
      direction: { x: 1, y: 0 },

      pauseDuration: spawnConfig.pauseDuration ?? this.config.defaultPauseDuration,
      pauseRemaining: 0,
      spawnedAt: gameTime,
      despawnAt: spawnConfig.despawnAfter
        ? gameTime + spawnConfig.despawnAfter
        : undefined,

      isInteractable: spawnConfig.isInteractable ?? false,
      interactionRadius: spawnConfig.interactionRadius ?? 30,

      isVisible: true,
      alpha: 0, // Start faded out
    };

    this.npcs.set(id, npc);
    this.onNPCSpawned?.(npc);

    // Start moving after a brief pause
    this.setState(npc, 'paused');
    npc.pauseRemaining = 1; // 1 minute initial pause

    return npc;
  }

  /**
   * Remove an NPC from the map
   */
  public despawnNPC(npcId: string): void {
    const npc = this.npcs.get(npcId);
    if (npc) {
      this.setState(npc, 'despawned');
      this.npcs.delete(npcId);
      this.onNPCDespawned?.(npcId);
    }
  }

  /**
   * Get an NPC by ID
   */
  public getNPC(npcId: string): NPCEntity | undefined {
    return this.npcs.get(npcId);
  }

  /**
   * Get all active NPCs
   */
  public getAllNPCs(): NPCEntity[] {
    return Array.from(this.npcs.values());
  }

  /**
   * Get NPCs near a position
   */
  public getNPCsNearPosition(position: Vector2, radius: number): NPCEntity[] {
    const result: NPCEntity[] = [];
    for (const npc of this.npcs.values()) {
      const dx = npc.position.x - position.x;
      const dy = npc.position.y - position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        result.push(npc);
      }
    }
    return result;
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  /**
   * Update all NPC positions based on elapsed game time
   */
  public update(deltaGameMinutes: number, realDeltaSeconds: number): void {
    const updates: NPCPositionUpdate[] = [];

    for (const npc of this.npcs.values()) {
      // Update fade alpha
      this.updateFade(npc, realDeltaSeconds);

      // Check despawn time
      if (npc.despawnAt !== undefined) {
        // Note: We'd need current game time passed in to check this properly
        // For now, this is handled externally
      }

      switch (npc.state) {
        case 'paused':
          this.updatePaused(npc, deltaGameMinutes);
          break;

        case 'moving':
          this.updateMoving(npc, deltaGameMinutes);
          break;

        case 'idle':
          // Start moving if we have a route
          if (npc.route.length > 1) {
            this.startNextSegment(npc);
          }
          break;

        case 'interacting':
          // Don't move while interacting
          break;

        case 'fleeing':
          // Move at double speed
          this.updateMoving(npc, deltaGameMinutes * 2);
          break;
      }

      // Collect position update
      updates.push({
        id: npc.id,
        position: { ...npc.position },
        direction: { ...npc.direction },
        pathProgress: npc.pathProgress,
        state: npc.state,
      });
    }

    // Notify listeners
    if (updates.length > 0 && this.onPositionUpdate) {
      this.onPositionUpdate(updates);
    }
  }

  private updateFade(npc: NPCEntity, deltaSeconds: number): void {
    const fadeSpeed = 1 / this.config.fadeDuration;

    if (npc.state === 'despawned') {
      npc.alpha = Math.max(0, npc.alpha - fadeSpeed * deltaSeconds);
    } else {
      npc.alpha = Math.min(1, npc.alpha + fadeSpeed * deltaSeconds);
    }
  }

  private updatePaused(npc: NPCEntity, deltaMinutes: number): void {
    npc.pauseRemaining -= deltaMinutes;

    if (npc.pauseRemaining <= 0) {
      npc.pauseRemaining = 0;

      // Check if at end of route
      if (this.isAtRouteEnd(npc)) {
        this.handleRouteEnd(npc);
      } else {
        this.startNextSegment(npc);
      }
    }
  }

  private updateMoving(npc: NPCEntity, deltaMinutes: number): void {
    // Progress along current path
    npc.pathProgress += npc.speed * deltaMinutes;

    // Update position and direction from path
    this.updatePositionFromPath(npc);

    // Check if reached end of current segment
    if (npc.pathProgress >= 1) {
      this.completeSegment(npc);
    }
  }

  // ============================================
  // PATH INTERPOLATION
  // ============================================

  private updatePositionFromPath(npc: NPCEntity): void {
    if (!npc.currentPathId) {
      return;
    }

    const path = this.paths.get(npc.currentPathId);
    if (!path) return;

    // Get start and end locations
    const currentIndex = npc.isReversing
      ? npc.currentRouteIndex + 1
      : npc.currentRouteIndex;
    const nextIndex = npc.isReversing
      ? npc.currentRouteIndex
      : npc.currentRouteIndex + 1;

    const startLoc = this.locations.get(npc.route[currentIndex]);
    const endLoc = this.locations.get(npc.route[nextIndex]);

    if (!startLoc || !endLoc) return;

    // Clamp progress
    const t = Math.max(0, Math.min(1, npc.pathProgress));

    // Get position on path
    if (path.points.length >= 4) {
      // Use bezier curve if path has control points
      npc.position = cubicBezier(
        path.points[0],
        path.points[1],
        path.points[2],
        path.points[3],
        npc.isReversing ? 1 - t : t
      );
      npc.direction = normalize(
        bezierTangent(
          path.points[0],
          path.points[1],
          path.points[2],
          path.points[3],
          npc.isReversing ? 1 - t : t
        )
      );
      if (npc.isReversing) {
        npc.direction = { x: -npc.direction.x, y: -npc.direction.y };
      }
    } else {
      // Generate control points for smooth curve
      const { cp1, cp2 } = calculateControlPoints(
        startLoc.position,
        endLoc.position,
        0.2
      );
      npc.position = cubicBezier(
        startLoc.position,
        cp1,
        cp2,
        endLoc.position,
        t
      );
      npc.direction = normalize(
        bezierTangent(startLoc.position, cp1, cp2, endLoc.position, t)
      );
    }
  }

  // ============================================
  // ROUTE MANAGEMENT
  // ============================================

  private startNextSegment(npc: NPCEntity): void {
    const pathIndex = npc.isReversing
      ? npc.currentRouteIndex - 1
      : npc.currentRouteIndex;

    if (pathIndex < 0 || pathIndex >= npc.routePathIds.length) {
      this.setState(npc, 'idle');
      return;
    }

    npc.currentPathId = npc.routePathIds[pathIndex];
    npc.pathProgress = 0;
    this.setState(npc, 'moving');
  }

  private completeSegment(npc: NPCEntity): void {
    // Move to next route index
    if (npc.isReversing) {
      npc.currentRouteIndex--;
    } else {
      npc.currentRouteIndex++;
    }

    // Clamp and reset progress
    npc.pathProgress = 0;
    npc.currentPathId = null;

    // Pause at the new location
    this.setState(npc, 'paused');
    npc.pauseRemaining = npc.pauseDuration;
  }

  private isAtRouteEnd(npc: NPCEntity): boolean {
    if (npc.isReversing) {
      return npc.currentRouteIndex <= 0;
    }
    return npc.currentRouteIndex >= npc.route.length - 1;
  }

  private handleRouteEnd(npc: NPCEntity): void {
    switch (npc.behavior) {
      case 'patrol_loop':
        // Jump back to start
        npc.currentRouteIndex = 0;
        this.startNextSegment(npc);
        break;

      case 'patrol_bounce':
        // Reverse direction
        npc.isReversing = !npc.isReversing;
        this.startNextSegment(npc);
        break;

      case 'one_way':
        // Despawn
        this.despawnNPC(npc.id);
        break;

      case 'wander':
        // Pick a random adjacent location and go there
        this.pickRandomDestination(npc);
        break;
    }
  }

  private pickRandomDestination(npc: NPCEntity): void {
    const currentLocationId = npc.route[npc.currentRouteIndex];
    const location = this.locations.get(currentLocationId);

    if (!location || location.connectedTo.length === 0) {
      this.setState(npc, 'idle');
      return;
    }

    // Pick random connected location
    const randomConn = location.connectedTo[
      Math.floor(Math.random() * location.connectedTo.length)
    ];

    // Update route to go there
    npc.route = [currentLocationId, randomConn.targetLocationId];
    npc.routePathIds = [randomConn.pathId];
    npc.currentRouteIndex = 0;
    npc.isReversing = false;

    this.startNextSegment(npc);
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  private setState(npc: NPCEntity, newState: NPCState): void {
    const oldState = npc.state;
    if (oldState !== newState) {
      npc.state = newState;
      this.onNPCStateChange?.(npc.id, oldState, newState);
    }
  }

  /**
   * Set NPC to interacting state (stops movement)
   */
  public setInteracting(npcId: string, isInteracting: boolean): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    if (isInteracting) {
      this.setState(npc, 'interacting');
    } else {
      // Resume movement
      if (npc.pauseRemaining > 0) {
        this.setState(npc, 'paused');
      } else if (npc.currentPathId) {
        this.setState(npc, 'moving');
      } else {
        this.startNextSegment(npc);
      }
    }
  }

  /**
   * Make NPC flee (double speed)
   */
  public setFleeing(npcId: string, isFleeing: boolean): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    if (isFleeing) {
      this.setState(npc, 'fleeing');
    } else {
      this.setState(npc, 'moving');
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private buildRoutePathIds(route: string[]): string[] {
    const pathIds: string[] = [];

    for (let i = 0; i < route.length - 1; i++) {
      const key = `${route[i]}:${route[i + 1]}`;
      const pathId = this.pathLookup.get(key);

      if (pathId) {
        pathIds.push(pathId);
      } else {
        // Path not found
        console.warn(`No path found between ${route[i]} and ${route[i + 1]}`);
        break;
      }
    }

    return pathIds;
  }

  /**
   * Get the current location ID for an NPC
   */
  public getCurrentLocationId(npcId: string): string | null {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    // If paused or idle, return current route location
    if (npc.state === 'paused' || npc.state === 'idle' || npc.state === 'interacting') {
      return npc.route[npc.currentRouteIndex];
    }

    // If moving, check if close to either end
    if (npc.pathProgress < 0.1) {
      return npc.route[npc.currentRouteIndex];
    }
    if (npc.pathProgress > 0.9) {
      const nextIndex = npc.isReversing
        ? npc.currentRouteIndex
        : npc.currentRouteIndex + 1;
      return npc.route[nextIndex] ?? null;
    }

    return null; // On the path, not at a location
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.npcs.clear();
    this.locations.clear();
    this.paths.clear();
    this.pathLookup.clear();
    this.onPositionUpdate = null;
    this.onNPCSpawned = null;
    this.onNPCDespawned = null;
    this.onNPCStateChange = null;
  }
}

// ============================================
// FACTORY
// ============================================

export function createNPCMovementSystem(
  config?: Partial<NPCMovementConfig>
): NPCMovementSystem {
  return new NPCMovementSystem(config);
}
