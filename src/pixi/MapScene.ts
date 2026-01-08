// MapScene - Main scene that orchestrates all map layers
// Handles layer ordering, camera control, and state synchronization

import { Container } from 'pixi.js';
import type {
  MapRegion,
  MapZone,
  MapLocation,
  Path,
  WorldEvent,
  TravelState,
  GameTime,
  Vector2,
  Bounds,
} from '@/types';
import { getTimeOfDay } from '@/types/time';
import {
  BackgroundLayer,
  FogLayer,
  PathLayer,
  LocationLayer,
  EventLayer,
  NPCLayer,
  PlayerLayer,
  UILayer,
} from './layers';
import type { NPCEntity, NPCPositionUpdate } from '@/types/npc';
import { Spring, SPRING_PRESETS, clamp } from './utils/easing';
import {
  ZoomLevelManager,
  type ZoomLevel,
  type HierarchyContext,
  type ZoomLevelConfig,
} from './systems/ZoomLevelManager';
import { LevelTransition } from './effects/LevelTransition';

// ============================================
// EVENT TYPES
// ============================================

export interface MapSceneEvents {
  onLocationClick: (locationId: string) => void;
  onLocationHover: (locationId: string | null) => void;
  onLocationRightClick: (locationId: string) => void;
  onEventClick: (eventId: string) => void;
  onEventHover: (eventId: string | null) => void;
  onNPCClick: (npcId: string) => void;
  onNPCHover: (npcId: string | null) => void;
  onNPCRightClick: (npcId: string) => void;
  onEmptyClick: (worldPos: Vector2) => void;
  onZoomLevelChange?: (level: ZoomLevel, context: HierarchyContext) => void;
}

// ============================================
// CAMERA STATE
// ============================================

interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

// ============================================
// MAP SCENE CLASS
// ============================================

export class MapScene extends Container {
  // Layers (in render order)
  private backgroundLayer: BackgroundLayer;
  private fogLayer: FogLayer;
  private pathLayer: PathLayer;
  private locationLayer: LocationLayer;
  private eventLayer: EventLayer;
  private npcLayer: NPCLayer;
  private playerLayer: PlayerLayer;
  private uiLayer: UILayer;

  // World container (for camera transforms)
  private worldContainer: Container;

  // Camera
  private camera: CameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private cameraSpringX: Spring;
  private cameraSpringY: Spring;
  private cameraSpringZoom: Spring;

  // Screen
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  // Bounds
  private worldBounds: Bounds = { x: 0, y: 0, width: 2000, height: 2000 };

  // Events
  private events: MapSceneEvents;

  // Zoom limits
  private readonly MIN_ZOOM = 0.3;
  private readonly MAX_ZOOM = 3.0;

  // Zoom level management
  private zoomLevelManager: ZoomLevelManager;
  private levelTransition: LevelTransition;

  // Drag state
  private isDragging: boolean = false;
  private dragStart: Vector2 = { x: 0, y: 0 };
  private dragThreshold: number = 5; // pixels before drag activates
  private hasDragged: boolean = false;

  constructor(events: MapSceneEvents) {
    super();
    this.events = events;

    // Initialize camera springs
    this.cameraSpringX = new Spring(0, SPRING_PRESETS.gentle);
    this.cameraSpringY = new Spring(0, SPRING_PRESETS.gentle);
    this.cameraSpringZoom = new Spring(1, SPRING_PRESETS.gentle);

    // Create world container (will be transformed for camera)
    this.worldContainer = new Container();
    this.addChild(this.worldContainer);

    // Create layers
    this.backgroundLayer = new BackgroundLayer(this.worldBounds);
    this.fogLayer = new FogLayer(this.worldBounds);
    this.pathLayer = new PathLayer();
    this.locationLayer = new LocationLayer({
      onLocationClick: (id) => this.events.onLocationClick(id),
      onLocationHover: (id) => this.events.onLocationHover(id),
      onLocationRightClick: (id) => this.events.onLocationRightClick(id),
    });
    this.eventLayer = new EventLayer({
      onEventClick: (id) => this.events.onEventClick(id),
      onEventHover: (id) => this.events.onEventHover(id),
    });
    this.npcLayer = new NPCLayer({
      onNPCClick: (id) => this.events.onNPCClick(id),
      onNPCHover: (id) => this.events.onNPCHover(id),
      onNPCRightClick: (id) => this.events.onNPCRightClick(id),
    });
    this.playerLayer = new PlayerLayer();
    this.uiLayer = new UILayer();

    // Add layers to world container (render order)
    this.worldContainer.addChild(this.backgroundLayer);
    this.worldContainer.addChild(this.fogLayer);
    this.worldContainer.addChild(this.pathLayer);
    this.worldContainer.addChild(this.locationLayer);
    this.worldContainer.addChild(this.eventLayer);
    this.worldContainer.addChild(this.npcLayer);
    this.worldContainer.addChild(this.playerLayer);

    // UI layer stays outside world (fixed to screen)
    this.addChild(this.uiLayer);

    // Initialize zoom level manager
    this.zoomLevelManager = new ZoomLevelManager();
    this.setupZoomLevelCallbacks();

    // Initialize level transition effect
    this.levelTransition = new LevelTransition({ type: 'zoom_fade' });
    this.addChild(this.levelTransition);

    // Enable interaction on world
    this.worldContainer.eventMode = 'static';
    this.worldContainer.cursor = 'grab';

    // Set hit area to cover entire world bounds
    this.worldContainer.hitArea = {
      contains: () => true, // Accept all hits within container
    };

    // Drag handling
    this.worldContainer.on('pointerdown', (e) => {
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStart = { x: e.global.x, y: e.global.y };
      this.worldContainer.cursor = 'grabbing';
    });

    this.worldContainer.on('pointermove', (e) => {
      if (!this.isDragging) return;

      const dx = e.global.x - this.dragStart.x;
      const dy = e.global.y - this.dragStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if we've passed the drag threshold
      if (distance > this.dragThreshold) {
        this.hasDragged = true;
      }

      if (this.hasDragged) {
        // Pan the camera (negative because we're dragging the world)
        // Use immediate=true for responsive dragging
        this.panBy({ x: -dx, y: -dy }, true);
        this.dragStart = { x: e.global.x, y: e.global.y };
      }
    });

    this.worldContainer.on('pointerup', (e) => {
      this.isDragging = false;
      this.worldContainer.cursor = 'grab';

      // Only fire click if we didn't drag
      if (!this.hasDragged) {
        const local = e.data.getLocalPosition(this.worldContainer);
        const nearestLocation = this.locationLayer.getLocationAtPosition(local);
        if (!nearestLocation) {
          this.events.onEmptyClick(local);
        }
      }
    });

    this.worldContainer.on('pointerupoutside', () => {
      this.isDragging = false;
      this.worldContainer.cursor = 'grab';
    });

    this.worldContainer.on('pointerleave', () => {
      this.isDragging = false;
      this.worldContainer.cursor = 'grab';
    });

    // Mouse wheel zoom
    this.worldContainer.on('wheel', (e) => {
      e.preventDefault();

      // Zoom factor per wheel tick
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = this.camera.zoom * zoomFactor;

      // Get mouse position in world coords before zoom
      const mouseScreen = { x: e.global.x, y: e.global.y };
      const mouseWorldBefore = this.screenToWorld(mouseScreen);

      // Apply zoom
      this.setZoom(newZoom);

      // Get mouse position in world coords after zoom (with new zoom)
      const mouseWorldAfter = this.screenToWorld(mouseScreen);

      // Adjust camera to keep mouse position stable
      const dx = mouseWorldAfter.x - mouseWorldBefore.x;
      const dy = mouseWorldAfter.y - mouseWorldBefore.y;
      this.panBy({ x: -dx * this.camera.zoom, y: -dy * this.camera.zoom });
    });
  }

  // ============================================
  // ZOOM LEVEL MANAGEMENT
  // ============================================

  private setupZoomLevelCallbacks(): void {
    // Handle level changes
    this.zoomLevelManager.setLevelChangeCallback((level, context) => {
      this.applyZoomLevelVisibility(level);
      this.events.onZoomLevelChange?.(level, context);
    });

    // Handle visibility changes
    this.zoomLevelManager.setVisibilityChangeCallback((visibility) => {
      this.applyContentVisibility(visibility);
    });
  }

  private applyZoomLevelVisibility(level: ZoomLevel): void {
    const config = this.zoomLevelManager.getLevelConfig(level);
    this.applyContentVisibility(config.visibleContent);
  }

  private applyContentVisibility(visibility: ZoomLevelConfig['visibleContent']): void {
    // Apply visibility to layers based on zoom level
    this.pathLayer.visible = visibility.paths;
    this.npcLayer.visible = visibility.npcs;
    this.eventLayer.visible = visibility.events;

    // LocationLayer handles its own filtering for major/minor
    // This could be extended to support more granular visibility
  }

  /**
   * Set the zoom level directly
   */
  public setZoomLevel(level: ZoomLevel, animate: boolean = true): void {
    if (animate) {
      const fromLevel = this.zoomLevelManager.getCurrentLevel();
      this.levelTransition.start(
        fromLevel,
        level,
        () => {
          // Midpoint callback - change visibility
          this.zoomLevelManager.setLevel(level, false);
          const targetZoom = this.zoomLevelManager.getLevelZoomValue(level);
          this.setZoom(targetZoom, true);
        },
        () => {
          // Complete callback
        }
      );
    } else {
      this.zoomLevelManager.setLevel(level, false);
      const targetZoom = this.zoomLevelManager.getLevelZoomValue(level);
      this.setZoom(targetZoom, true);
    }
  }

  /**
   * Get the current zoom level
   */
  public getZoomLevel(): ZoomLevel {
    return this.zoomLevelManager.getCurrentLevel();
  }

  /**
   * Enter a zone or location context
   */
  public enterHierarchyContext(type: 'zone' | 'location', id: string): void {
    this.zoomLevelManager.enterContext(type, id);
  }

  /**
   * Exit current context (zoom out one level)
   */
  public exitHierarchyContext(): void {
    this.zoomLevelManager.exitContext();
  }

  /**
   * Get zoom level manager for external access
   */
  public getZoomLevelManager(): ZoomLevelManager {
    return this.zoomLevelManager;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  public initialize(
    region: MapRegion,
    zones: MapZone[],
    locations: MapLocation[],
    paths: Path[],
    worldEvents: WorldEvent[],
    currentLocationId: string
  ): void {
    // Set world bounds from region
    this.worldBounds = region.bounds;
    this.backgroundLayer.updateBounds(this.worldBounds);
    this.fogLayer.updateBounds(this.worldBounds);

    // Initialize layers
    this.backgroundLayer.renderZones(zones);
    this.pathLayer.initializePaths(paths, locations);
    this.locationLayer.initializeLocations(locations);
    this.eventLayer.initializeEvents(worldEvents, locations);
    this.playerLayer.initialize(locations, paths, currentLocationId);

    // Update fog based on discovery
    this.fogLayer.updateLocations(locations);

    // Set current location
    this.locationLayer.setCurrentLocation(currentLocationId);

    // Center camera on current location
    const currentLocation = locations.find(l => l.id === currentLocationId);
    if (currentLocation) {
      this.panTo(currentLocation.position, true);
    }
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  public updateLocations(locations: MapLocation[]): void {
    this.locationLayer.updateLocations(locations);
    this.pathLayer.updateLocations(locations);
    this.eventLayer.updateLocations(locations);
    this.playerLayer.updateLocations(locations);
    this.fogLayer.updateLocations(locations);
  }

  public updateLocation(location: MapLocation): void {
    this.locationLayer.updateLocation(location);
  }

  public updatePaths(paths: Path[]): void {
    this.playerLayer.updatePaths(paths);
  }

  public updateWorldEvents(events: WorldEvent[]): void {
    this.eventLayer.updateEvents(events);
  }

  public setCurrentLocation(locationId: string): void {
    this.locationLayer.setCurrentLocation(locationId);
    this.playerLayer.setCurrentLocation(locationId);
  }

  public setSelectedLocation(locationId: string | null): void {
    this.locationLayer.setSelectedLocation(locationId);
  }

  // ============================================
  // TRAVEL
  // ============================================

  public startTravel(travelState: TravelState): void {
    this.playerLayer.startTravel(travelState);

    // Highlight travel route
    const pathIds = travelState.route.segments.map(s => s.pathId);
    this.pathLayer.highlightRoute(pathIds);
  }

  public updateTravel(travelState: TravelState): void {
    this.playerLayer.updateTravel(travelState);

    // Update path progress
    const segment = travelState.route.segments[travelState.currentSegmentIndex];
    if (segment) {
      this.pathLayer.setPathTraveling(segment.pathId, true, travelState.segmentProgress);
    }
  }

  public endTravel(arrivalLocationId: string): void {
    this.playerLayer.endTravel(arrivalLocationId);
    this.pathLayer.clearHighlights();

    // Center on arrival
    const location = this.locationLayer.getLocationNode(arrivalLocationId)?.getLocation();
    if (location) {
      this.panTo(location.position);
    }
  }

  /**
   * Flash a route for click-to-move preview
   */
  public async flashRoute(pathIds: string[], duration: number = 300): Promise<void> {
    await this.pathLayer.flashRoute(pathIds, duration);
  }

  // ============================================
  // TIME
  // ============================================

  public updateGameTime(gameTime: GameTime): void {
    this.uiLayer.updateGameTime(gameTime);

    const timeOfDay = getTimeOfDay(gameTime.hour);
    this.backgroundLayer.setTimeOfDay(timeOfDay);
  }

  // ============================================
  // CAMERA CONTROL
  // ============================================

  public panTo(position: Vector2, immediate: boolean = false): void {
    const targetX = position.x;
    const targetY = position.y;

    if (immediate) {
      this.camera.x = targetX;
      this.camera.y = targetY;
      this.cameraSpringX.setPosition(targetX);
      this.cameraSpringY.setPosition(targetY);
    } else {
      this.cameraSpringX.setTarget(targetX);
      this.cameraSpringY.setTarget(targetY);
    }
  }

  public panBy(delta: Vector2, immediate: boolean = false): void {
    // When immediate, use current camera position; otherwise use spring target
    const baseX = immediate ? this.camera.x : this.cameraSpringX.getTarget();
    const baseY = immediate ? this.camera.y : this.cameraSpringY.getTarget();

    const targetX = baseX + delta.x / this.camera.zoom;
    const targetY = baseY + delta.y / this.camera.zoom;

    // Clamp to world bounds
    const clampedX = clamp(
      targetX,
      this.worldBounds.x,
      this.worldBounds.x + this.worldBounds.width
    );
    const clampedY = clamp(
      targetY,
      this.worldBounds.y,
      this.worldBounds.y + this.worldBounds.height
    );

    if (immediate) {
      // Set both position and target to prevent spring animation back
      this.camera.x = clampedX;
      this.camera.y = clampedY;
      this.cameraSpringX.setPosition(clampedX);
      this.cameraSpringY.setPosition(clampedY);
      this.cameraSpringX.setTarget(clampedX);
      this.cameraSpringY.setTarget(clampedY);
    } else {
      this.cameraSpringX.setTarget(clampedX);
      this.cameraSpringY.setTarget(clampedY);
    }
  }

  public setZoom(zoom: number, immediate: boolean = false): void {
    const clampedZoom = clamp(zoom, this.MIN_ZOOM, this.MAX_ZOOM);

    if (immediate) {
      this.camera.zoom = clampedZoom;
      this.cameraSpringZoom.setPosition(clampedZoom);
    } else {
      this.cameraSpringZoom.setTarget(clampedZoom);
    }

    this.uiLayer.updateZoom(clampedZoom);
  }

  public zoomBy(factor: number): void {
    const newZoom = this.cameraSpringZoom.getTarget() * factor;
    this.setZoom(newZoom);
  }

  public centerOnPlayer(): void {
    const pos = this.playerLayer.getCurrentPosition();
    this.panTo(pos);
  }

  // ============================================
  // SCREEN SIZE
  // ============================================

  public setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.uiLayer.setScreenSize(width, height);
    this.levelTransition.setScreenSize(width, height);
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    // Update zoom level transitions
    this.zoomLevelManager.updateTransition(deltaTime);
    this.levelTransition.update(deltaTime);

    // Update camera springs
    this.camera.x = this.cameraSpringX.update(deltaTime);
    this.camera.y = this.cameraSpringY.update(deltaTime);
    this.camera.zoom = this.cameraSpringZoom.update(deltaTime);

    // Apply camera transform
    this.worldContainer.position.set(
      this.screenWidth / 2 - this.camera.x * this.camera.zoom,
      this.screenHeight / 2 - this.camera.y * this.camera.zoom
    );
    this.worldContainer.scale.set(this.camera.zoom);

    // Update layers
    this.fogLayer.update(deltaTime);
    this.pathLayer.update(deltaTime);
    this.locationLayer.update(deltaTime);
    this.eventLayer.update(deltaTime);
    this.npcLayer.update(deltaTime);
    this.playerLayer.update(deltaTime);
    this.uiLayer.update(deltaTime);
  }

  // ============================================
  // QUERIES
  // ============================================

  public getCamera(): CameraState {
    return { ...this.camera };
  }

  public screenToWorld(screenPos: Vector2): Vector2 {
    return {
      x: (screenPos.x - this.screenWidth / 2) / this.camera.zoom + this.camera.x,
      y: (screenPos.y - this.screenHeight / 2) / this.camera.zoom + this.camera.y,
    };
  }

  public worldToScreen(worldPos: Vector2): Vector2 {
    return {
      x: (worldPos.x - this.camera.x) * this.camera.zoom + this.screenWidth / 2,
      y: (worldPos.y - this.camera.y) * this.camera.zoom + this.screenHeight / 2,
    };
  }

  // ============================================
  // LAYER ACCESS
  // ============================================

  public getLocationLayer(): LocationLayer {
    return this.locationLayer;
  }

  public getPathLayer(): PathLayer {
    return this.pathLayer;
  }

  public getEventLayer(): EventLayer {
    return this.eventLayer;
  }

  public getPlayerLayer(): PlayerLayer {
    return this.playerLayer;
  }

  public getNPCLayer(): NPCLayer {
    return this.npcLayer;
  }

  // ============================================
  // NPC MANAGEMENT
  // ============================================

  /**
   * Add an NPC to the map
   */
  public addNPC(entity: NPCEntity): void {
    this.npcLayer.addNPC(entity);
  }

  /**
   * Remove an NPC from the map
   */
  public removeNPC(npcId: string): void {
    this.npcLayer.removeNPC(npcId);
  }

  /**
   * Update all NPCs from entity array
   */
  public updateNPCs(entities: NPCEntity[]): void {
    this.npcLayer.updateNPCs(entities);
  }

  /**
   * Apply position updates from movement system
   */
  public applyNPCPositionUpdates(updates: NPCPositionUpdate[]): void {
    this.npcLayer.applyPositionUpdates(updates);
  }

  /**
   * Clear all NPCs from the map
   */
  public clearNPCs(): void {
    this.npcLayer.clearNPCs();
  }

  // ============================================
  // OPTIONS
  // ============================================

  public setFogEnabled(enabled: boolean): void {
    this.fogLayer.setFogEnabled(enabled);
  }

  public setUIVisible(visible: boolean): void {
    this.uiLayer.visible = visible;
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.backgroundLayer.destroy();
    this.fogLayer.destroy();
    this.pathLayer.destroy();
    this.locationLayer.destroy();
    this.eventLayer.destroy();
    this.npcLayer.destroy();
    this.playerLayer.destroy();
    this.uiLayer.destroy();
    this.levelTransition.destroy();
    super.destroy({ children: true });
  }
}
