// MapApplication - PixiJS Application wrapper for the travel map
// Manages the PIXI.Application, render loop, and input handling

import { Application } from 'pixi.js';
import type { Vector2 } from '@/types';
import { MapScene, MapSceneEvents } from './MapScene';
import { getMapState, subscribeToMapStore, useMapStore, type ZoomLevel } from '@/stores/mapStore';
import { ClickToMoveController, type ClickToMoveConfig } from './systems/ClickToMoveController';
import { NPCMovementSystem, type NPCMovementConfig } from './systems/NPCMovementSystem';
import type { NPCSpawnConfig } from '@/types/npc';

// ============================================
// MAP APPLICATION EVENTS
// ============================================

export interface MapApplicationEvents extends MapSceneEvents {
  onReady: () => void;
  onDestroy: () => void;
  onNPCInteraction?: (npcId: string) => void;
}

// ============================================
// MAP APPLICATION CLASS
// ============================================

export class MapApplication {
  private app: Application;
  private scene: MapScene | null = null;
  private events: MapApplicationEvents;
  private container: HTMLElement | null = null;

  // Input state for click detection
  private pointerDownPos: Vector2 = { x: 0, y: 0 };
  private pointerDownTime: number = 0;

  // Click-to-move controller
  private clickToMove: ClickToMoveController;
  private clickToMoveEnabled: boolean = true;

  // NPC movement system
  private npcMovement: NPCMovementSystem;
  private npcMovementEnabled: boolean = true;

  // Store subscription
  private unsubscribe: (() => void) | null = null;

  // Animation frame
  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(
    events: MapApplicationEvents,
    clickToMoveConfig?: Partial<ClickToMoveConfig>,
    npcMovementConfig?: Partial<NPCMovementConfig>
  ) {
    this.events = events;
    this.app = new Application();
    this.clickToMove = new ClickToMoveController(clickToMoveConfig);
    this.npcMovement = new NPCMovementSystem(npcMovementConfig);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  public async init(container: HTMLElement): Promise<void> {
    this.container = container;

    // Initialize PIXI application
    await this.app.init({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      eventFeatures: {
        move: true,
        globalMove: true,
        click: true,
        wheel: true,
      },
    });

    // Add canvas to container
    container.appendChild(this.app.canvas);

    // Create scene
    this.scene = new MapScene({
      onLocationClick: (id) => this.events.onLocationClick(id),
      onLocationHover: (id) => this.events.onLocationHover(id),
      onLocationRightClick: (id) => this.events.onLocationRightClick(id),
      onEventClick: (id) => this.events.onEventClick(id),
      onEventHover: (id) => this.events.onEventHover(id),
      onNPCClick: (id) => this.handleNPCClick(id),
      onNPCHover: (id) => this.events.onNPCHover(id),
      onNPCRightClick: (id) => this.events.onNPCRightClick(id),
      onEmptyClick: (pos) => this.events.onEmptyClick(pos),
    });

    this.scene.setScreenSize(container.clientWidth, container.clientHeight);
    this.app.stage.addChild(this.scene);

    // Set up input handlers
    this.setupInputHandlers();

    // Set up resize handler
    this.setupResizeHandler();

    // Subscribe to store
    this.subscribeToStore();

    // Initialize from current store state
    this.syncFromStore();

    // Set up click-to-move callbacks
    this.setupClickToMove();

    // Set up NPC movement callbacks
    this.setupNPCMovement();

    // Start render loop
    this.startRenderLoop();

    // Notify ready
    this.events.onReady();
  }

  // ============================================
  // CLICK-TO-MOVE SETUP
  // ============================================

  private setupClickToMove(): void {
    // Wire up flash route callback to PathLayer
    this.clickToMove.setFlashRouteCallback(async (pathIds, duration) => {
      if (this.scene) {
        await this.scene.flashRoute(pathIds, duration);
      }
    });

    // Wire up start travel callback to store
    this.clickToMove.setStartTravelCallback((travel) => {
      useMapStore.getState().setTravel(travel);
    });

    // Wire up invalid click callback for visual feedback
    this.clickToMove.setInvalidClickCallback((position) => {
      // Could add a visual feedback effect here (red pulse, etc.)
      console.log('No reachable location at', position);
    });
  }

  // ============================================
  // NPC MOVEMENT SETUP
  // ============================================

  private setupNPCMovement(): void {
    // Wire up position update callback to scene
    this.npcMovement.setPositionUpdateCallback((updates) => {
      if (this.scene) {
        this.scene.applyNPCPositionUpdates(updates);
      }
    });

    // Wire up spawn callback to scene
    this.npcMovement.setSpawnCallback((npc) => {
      if (this.scene) {
        this.scene.addNPC(npc);
      }
    });

    // Wire up despawn callback to scene
    this.npcMovement.setDespawnCallback((npcId) => {
      if (this.scene) {
        this.scene.removeNPC(npcId);
      }
    });
  }

  private handleNPCClick(npcId: string): void {
    // Check if player is near the NPC for interaction
    const state = getMapState();
    const currentLocationId = state.currentLocationId;

    if (!currentLocationId || state.travel?.isActive) {
      return;
    }

    // Get NPC's current location
    const npcLocationId = this.npcMovement.getCurrentLocationId(npcId);

    // Allow interaction if at same location or adjacent
    if (npcLocationId === currentLocationId) {
      this.npcMovement.setInteracting(npcId, true);
      this.events.onNPCInteraction?.(npcId);
    } else {
      // NPC is not at player's location - emit click event anyway for UI feedback
      this.events.onNPCClick(npcId);
    }
  }

  // ============================================
  // INPUT HANDLING
  // ============================================

  private setupInputHandlers(): void {
    const canvas = this.app.canvas;

    // Make canvas focusable for keyboard events
    canvas.tabIndex = 0;

    // Pointer events for click-to-move detection (drag is handled in MapScene)
    canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));

    // Keyboard shortcuts
    canvas.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handlePointerDown(e: PointerEvent): void {
    // Record position and time for click detection
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.pointerDownTime = performance.now();
  }

  private handlePointerUp(e: PointerEvent): void {
    // Check if this was a click (not a drag)
    // Click = short duration + small movement
    const elapsed = performance.now() - this.pointerDownTime;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const isClick = elapsed < 300 && distance < 10;

    if (isClick && e.button === 0 && !e.shiftKey && this.clickToMoveEnabled) {
      this.handleClickToMove(e);
    }
  }

  private async handleClickToMove(e: PointerEvent): Promise<void> {
    if (!this.scene) return;

    // Get world position from screen position
    const rect = this.app.canvas.getBoundingClientRect();
    const screenPos: Vector2 = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const worldPos = this.scene.screenToWorld(screenPos);
    if (!worldPos) return;

    // Get current location from store
    const state = getMapState();
    const currentLocationId = state.currentLocationId;

    if (!currentLocationId) return;

    // Don't allow click-to-move while already traveling
    if (state.travel?.isActive) return;

    // Handle the click through the controller
    const result = await this.clickToMove.handleClick(worldPos, currentLocationId);

    if (result.success && result.destinationId) {
      // Optional: Emit location click event for UI feedback
      this.events.onLocationClick(result.destinationId);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.scene) return;

    switch (e.key) {
      case 'Home':
      case 'h':
        // Center on player
        this.scene.centerOnPlayer();
        break;
      case '+':
      case '=':
        this.scene.zoomBy(1.2);
        break;
      case '-':
      case '_':
        this.scene.zoomBy(0.8);
        break;
      case '0':
        this.scene.setZoom(1);
        break;
      case 'ArrowUp':
        this.scene.panBy({ x: 0, y: -50 });
        break;
      case 'ArrowDown':
        this.scene.panBy({ x: 0, y: 50 });
        break;
      case 'ArrowLeft':
        this.scene.panBy({ x: -50, y: 0 });
        break;
      case 'ArrowRight':
        this.scene.panBy({ x: 50, y: 0 });
        break;
    }
  }

  // ============================================
  // RESIZE HANDLING
  // ============================================

  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resize(width, height);
      }
    });

    if (this.container) {
      resizeObserver.observe(this.container);
    }
  }

  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.scene?.setScreenSize(width, height);
  }

  // ============================================
  // STORE SUBSCRIPTION
  // ============================================

  private subscribeToStore(): void {
    this.unsubscribe = subscribeToMapStore(
      (state) => ({
        region: state.region,
        zones: state.zones,
        locations: state.locations,
        paths: state.paths,
        activeEvents: state.activeEvents,
        travel: state.travel,
        gameTime: state.gameTime,
        currentLocationId: state.currentLocationId,
        selectedLocationId: state.selectedLocationId,
        currentZoom: state.currentZoom,
        viewCenter: state.viewCenter,
      }),
      (current, prev) => {
        if (!this.scene) return;

        // Handle location updates
        if (current.locations !== prev.locations) {
          this.scene.updateLocations(Object.values(current.locations));
          // Also update click-to-move controller
          this.clickToMove.updateData(current.locations, current.paths);
        }

        // Handle world events
        if (current.activeEvents !== prev.activeEvents) {
          this.scene.updateWorldEvents(current.activeEvents);
        }

        // Handle travel state
        if (current.travel !== prev.travel) {
          if (current.travel?.isActive && !prev.travel?.isActive) {
            // Travel started
            this.scene.startTravel(current.travel);
          } else if (current.travel?.isActive && prev.travel?.isActive) {
            // Travel in progress
            this.scene.updateTravel(current.travel);
          } else if (!current.travel?.isActive && prev.travel?.isActive && current.currentLocationId) {
            // Travel ended
            this.scene.endTravel(current.currentLocationId);
          }
        }

        // Handle current location change
        if (current.currentLocationId !== prev.currentLocationId && current.currentLocationId) {
          this.scene.setCurrentLocation(current.currentLocationId);
        }

        // Handle selection change
        if (current.selectedLocationId !== prev.selectedLocationId) {
          this.scene.setSelectedLocation(current.selectedLocationId);
        }

        // Handle time change
        if (current.gameTime !== prev.gameTime) {
          this.scene.updateGameTime(current.gameTime);
        }

        // Handle zoom change (zoom level is a string, convert to numeric)
        if (current.currentZoom !== prev.currentZoom) {
          const zoomValue = this.zoomLevelToNumber(current.currentZoom);
          this.scene.setZoom(zoomValue);
        }

        // Handle pan change
        if (current.viewCenter !== prev.viewCenter) {
          this.scene.panTo(current.viewCenter);
        }
      }
    );
  }

  private zoomLevelToNumber(level: ZoomLevel): number {
    switch (level) {
      case 'region': return 0.5;
      case 'zone': return 1.0;
      case 'local': return 1.5;
      default: return 1.0;
    }
  }

  private syncFromStore(): void {
    const state = getMapState();

    const locationsArray = Object.values(state.locations);
    const zonesArray = Object.values(state.zones);
    const pathsArray = Object.values(state.paths);

    // Update click-to-move controller with current map data
    this.clickToMove.updateData(state.locations, state.paths);

    // Update NPC movement system with current map data
    this.npcMovement.updateMapData(state.locations, state.paths);

    if (this.scene && state.region && locationsArray.length > 0 && state.currentLocationId) {
      this.scene.initialize(
        state.region,
        zonesArray,
        locationsArray,
        pathsArray,
        state.activeEvents,
        state.currentLocationId
      );

      this.scene.updateGameTime(state.gameTime);
      this.scene.setZoom(this.zoomLevelToNumber(state.currentZoom), true);
    }
  }

  // ============================================
  // RENDER LOOP
  // ============================================

  private startRenderLoop(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.app.ticker.add(this.tick, this);
  }

  private stopRenderLoop(): void {
    this.isRunning = false;
    this.app.ticker.remove(this.tick, this);
  }

  private tick = (): void => {
    if (!this.isRunning || !this.scene) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap delta time to prevent huge jumps
    const cappedDelta = Math.min(deltaTime, 0.1);

    // Update NPC movement system
    // Convert real time to game minutes based on time speed
    const state = getMapState();
    const gameMinutes = cappedDelta * state.timeSpeed * 0.5; // Adjust scale as needed
    if (this.npcMovementEnabled && gameMinutes > 0) {
      this.npcMovement.update(gameMinutes, cappedDelta);
    }

    // Update travel progress
    if (state.travel?.isActive && !state.travel.pendingEvent) {
      this.updateTravelProgress(cappedDelta, state.timeSpeed);
    }

    // Update scene
    this.scene.update(cappedDelta);
  };

  // ============================================
  // TRAVEL PROGRESS
  // ============================================

  private updateTravelProgress(deltaTime: number, timeSpeed: number): void {
    const state = getMapState();
    const travel = state.travel;
    if (!travel || !travel.isActive) return;

    const route = travel.route;
    const currentSegment = route.segments[travel.currentSegmentIndex];
    if (!currentSegment) return;

    // Calculate progress increment based on game time
    // deltaTime is in real seconds, timeSpeed multiplies it
    // Segment duration is in game minutes
    // Convert: realSeconds * timeSpeed * 60 = gameSeconds, / 60 = gameMinutes
    const gameMinutesElapsed = deltaTime * timeSpeed;
    const segmentProgressIncrement = gameMinutesElapsed / currentSegment.duration;

    let newSegmentProgress = travel.segmentProgress + segmentProgressIncrement;
    let newSegmentIndex = travel.currentSegmentIndex;

    // Check if we completed the current segment
    while (newSegmentProgress >= 1.0 && newSegmentIndex < route.segments.length - 1) {
      const prevSegment = route.segments[newSegmentIndex];
      newSegmentProgress -= 1.0;
      newSegmentIndex++;
      const nextSegment = route.segments[newSegmentIndex];
      if (nextSegment && prevSegment) {
        // Scale remaining progress to next segment's duration
        newSegmentProgress = newSegmentProgress * prevSegment.duration / nextSegment.duration;
      }
    }

    // Calculate total progress
    let completedTime = 0;
    for (let i = 0; i < newSegmentIndex; i++) {
      completedTime += route.segments[i].duration;
    }
    const currentSegmentTime = route.segments[newSegmentIndex]?.duration ?? 0;
    completedTime += currentSegmentTime * Math.min(newSegmentProgress, 1.0);
    const newTotalProgress = Math.min(completedTime / route.totalTime, 1.0);

    // Check if travel is complete
    if (newSegmentIndex >= route.segments.length - 1 && newSegmentProgress >= 1.0) {
      // Travel complete - arrive at destination
      const destinationId = route.endLocationId;
      useMapStore.getState().setTravel(null);
      useMapStore.getState().visitLocation(destinationId);
    } else {
      // Update progress
      useMapStore.getState().updateTravelProgress(
        newTotalProgress,
        newSegmentIndex,
        Math.min(newSegmentProgress, 1.0)
      );
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  public getScene(): MapScene | null {
    return this.scene;
  }

  public getApplication(): Application {
    return this.app;
  }

  public panTo(position: Vector2, immediate?: boolean): void {
    this.scene?.panTo(position, immediate);
  }

  public setZoom(zoom: number, immediate?: boolean): void {
    this.scene?.setZoom(zoom, immediate);
  }

  public centerOnPlayer(): void {
    this.scene?.centerOnPlayer();
  }

  public setFogEnabled(enabled: boolean): void {
    this.scene?.setFogEnabled(enabled);
  }

  public setClickToMoveEnabled(enabled: boolean): void {
    this.clickToMoveEnabled = enabled;
  }

  public isClickToMoveEnabled(): boolean {
    return this.clickToMoveEnabled;
  }

  public getClickToMoveController(): ClickToMoveController {
    return this.clickToMove;
  }

  // ============================================
  // NPC PUBLIC API
  // ============================================

  public setNPCMovementEnabled(enabled: boolean): void {
    this.npcMovementEnabled = enabled;
  }

  public isNPCMovementEnabled(): boolean {
    return this.npcMovementEnabled;
  }

  public getNPCMovementSystem(): NPCMovementSystem {
    return this.npcMovement;
  }

  public spawnNPC(config: NPCSpawnConfig): string | null {
    const state = getMapState();
    const npc = this.npcMovement.spawnNPC(config, state.gameTime.totalMinutes);
    return npc?.id ?? null;
  }

  public despawnNPC(npcId: string): void {
    this.npcMovement.despawnNPC(npcId);
  }

  public endNPCInteraction(npcId: string): void {
    this.npcMovement.setInteracting(npcId, false);
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    // Stop render loop
    this.stopRenderLoop();

    // Unsubscribe from store
    this.unsubscribe?.();

    // Destroy NPC movement system
    this.npcMovement.destroy();

    // Destroy scene
    this.scene?.destroy();
    this.scene = null;

    // Remove canvas from container
    if (this.container && this.app.canvas.parentElement === this.container) {
      this.container.removeChild(this.app.canvas);
    }

    // Destroy PIXI application
    this.app.destroy(true, { children: true, texture: true });

    // Notify destruction
    this.events.onDestroy();
  }
}
