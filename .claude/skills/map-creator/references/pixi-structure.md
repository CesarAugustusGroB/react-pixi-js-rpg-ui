# PixiJS Structure

PixiJS rendering architecture for the map system.

## Table of Contents

1. [Directory Layout](#directory-layout)
2. [MapApplication](#mapapplication)
3. [MapScene](#mapscene)
4. [Layer Hierarchy](#layer-hierarchy)
5. [LocationNode Object](#locationnode-object)
6. [Interaction Setup](#interaction-setup)

---

## Directory Layout

```
src/pixi/
├── MapApplication.ts           # Main PIXI.Application wrapper
├── MapScene.ts                 # Scene orchestrator
│
├── layers/
│   ├── BackgroundLayer.ts      # Terrain, biome colors
│   ├── PathLayer.ts            # Roads, trails, connections
│   ├── LocationLayer.ts        # Location nodes
│   ├── EventLayer.ts           # Caravans, raids, weather
│   ├── PlayerLayer.ts          # Player icon, travel animation
│   ├── FogLayer.ts             # Undiscovered area overlay
│   └── UILayer.ts              # Tooltips, selection highlights
│
├── objects/
│   ├── LocationNode.ts         # Individual location sprite
│   ├── PathLine.ts             # Bezier path renderer
│   ├── PlayerMarker.ts         # Player position indicator
│   ├── EventMarker.ts          # World event indicators
│   ├── RumorSilhouette.ts      # Mysterious undiscovered marker
│   └── CaravanSprite.ts        # Moving caravan
│
├── systems/
│   ├── ZoomController.ts       # Zoom level management
│   ├── PanController.ts        # Camera panning
│   ├── TravelAnimator.ts       # Player movement animation
│   ├── TimeVisualizer.ts       # Day/night lighting
│   └── EventScheduler.ts       # World event spawning
│
├── generators/
│   ├── RegionGenerator.ts      # Procedural region creation
│   ├── ZoneGenerator.ts        # Zone content generation
│   ├── PathGenerator.ts        # Road network creation
│   ├── NameGenerator.ts        # Location/NPC names
│   └── SeededRandom.ts         # Deterministic RNG
│
├── renderers/
│   ├── VectorRenderer.ts       # Clean vector graphics
│   ├── IconRenderer.ts         # Location type icons
│   └── EffectRenderer.ts       # Particles, glows
│
└── utils/
    ├── geometry.ts             # Vector math, bezier curves
    ├── colors.ts               # Color palette constants
    └── easing.ts               # Animation easing functions
```

## MapApplication

```typescript
// src/pixi/MapApplication.ts

import * as PIXI from 'pixi.js';
import { MapScene } from './MapScene';
import { subscribeToMapStore, getMapState } from '@/stores/mapStore';

export class MapApplication {
  private app: PIXI.Application;
  private scene: MapScene;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application();
    this.scene = new MapScene(this.app);
  }

  async initialize(): Promise<void> {
    await this.app.init({
      background: '#1a1a2e',
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    document.getElementById('map-container')?.appendChild(this.app.canvas);

    await this.scene.initialize();
    this.app.stage.addChild(this.scene.container);

    // Subscribe to store changes
    this.unsubscribe = subscribeToMapStore(
      (state) => state,
      (state) => this.scene.update(state),
      { fireImmediately: true }
    );

    // Start render loop
    this.app.ticker.add(this.tick.bind(this));
  }

  private tick(ticker: PIXI.Ticker): void {
    const deltaMs = ticker.deltaMS;
    this.scene.tick(deltaMs);

    // Update travel if active
    const { travel } = getMapState();
    if (travel?.isActive && !travel.pendingEvent) {
      getMapState().updateTravel(deltaMs);
    }
  }

  destroy(): void {
    this.unsubscribe?.();
    this.scene.destroy();
    this.app.destroy(true);
  }
}
```

## MapScene

```typescript
// src/pixi/MapScene.ts

import * as PIXI from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { PathLayer } from './layers/PathLayer';
import { LocationLayer } from './layers/LocationLayer';
import { EventLayer } from './layers/EventLayer';
import { PlayerLayer } from './layers/PlayerLayer';
import { FogLayer } from './layers/FogLayer';
import { UILayer } from './layers/UILayer';
import { ZoomController } from './systems/ZoomController';
import { PanController } from './systems/PanController';
import { TimeVisualizer } from './systems/TimeVisualizer';

export class MapScene {
  public container: PIXI.Container;

  // Layers (render order)
  private backgroundLayer: BackgroundLayer;
  private fogLayer: FogLayer;
  private pathLayer: PathLayer;
  private locationLayer: LocationLayer;
  private eventLayer: EventLayer;
  private playerLayer: PlayerLayer;
  private uiLayer: UILayer;

  // Systems
  private zoomController: ZoomController;
  private panController: PanController;
  private timeVisualizer: TimeVisualizer;

  // Internal
  private worldContainer: PIXI.Container;

  constructor(private app: PIXI.Application) {
    this.container = new PIXI.Container();
    this.worldContainer = new PIXI.Container();

    // Initialize layers
    this.backgroundLayer = new BackgroundLayer();
    this.fogLayer = new FogLayer();
    this.pathLayer = new PathLayer();
    this.locationLayer = new LocationLayer();
    this.eventLayer = new EventLayer();
    this.playerLayer = new PlayerLayer();
    this.uiLayer = new UILayer();

    // Initialize systems
    this.zoomController = new ZoomController(this.worldContainer);
    this.panController = new PanController(this.worldContainer, app);
    this.timeVisualizer = new TimeVisualizer();
  }

  async initialize(): Promise<void> {
    // Add layers to world container (order matters)
    this.worldContainer.addChild(this.backgroundLayer.container);
    this.worldContainer.addChild(this.fogLayer.container);
    this.worldContainer.addChild(this.pathLayer.container);
    this.worldContainer.addChild(this.locationLayer.container);
    this.worldContainer.addChild(this.eventLayer.container);
    this.worldContainer.addChild(this.playerLayer.container);

    // UI layer is screen-space, not world-space
    this.container.addChild(this.worldContainer);
    this.container.addChild(this.uiLayer.container);

    // Initialize all layers
    await Promise.all([
      this.backgroundLayer.initialize(),
      this.fogLayer.initialize(),
      this.pathLayer.initialize(),
      this.locationLayer.initialize(),
      this.eventLayer.initialize(),
      this.playerLayer.initialize(),
      this.uiLayer.initialize(),
    ]);

    this.setupInteraction();
  }

  update(state: MapState): void {
    // Update all layers with new state
    this.backgroundLayer.update(state);
    this.fogLayer.update(state);
    this.pathLayer.update(state);
    this.locationLayer.update(state);
    this.eventLayer.update(state);
    this.playerLayer.update(state);
    this.uiLayer.update(state);

    // Apply time-based lighting
    this.timeVisualizer.update(state.gameTime);
    this.applyTimeOfDayLighting(state);
  }

  tick(deltaMs: number): void {
    this.playerLayer.tick(deltaMs);
    this.eventLayer.tick(deltaMs);
    this.uiLayer.tick(deltaMs);
    this.panController.tick(deltaMs);
  }

  private applyTimeOfDayLighting(state: MapState): void {
    const lighting = this.timeVisualizer.getLighting();
    this.worldContainer.tint = lighting.tint;
    this.fogLayer.setNightMode(lighting.isNight);
  }
}
```

## Layer Hierarchy

Layers render in this order (bottom to top):

| Order | Layer | Purpose |
|-------|-------|---------|
| 1 | BackgroundLayer | Terrain colors, biome visuals |
| 2 | FogLayer | Overlay for undiscovered areas |
| 3 | PathLayer | Roads, trails, wilderness paths |
| 4 | LocationLayer | Location nodes (towns, dungeons) |
| 5 | EventLayer | Moving events (caravans, raids) |
| 6 | PlayerLayer | Player marker and travel animation |
| 7 | UILayer | Tooltips, selection highlights (screen-space) |

## LocationNode Object

```typescript
// src/pixi/objects/LocationNode.ts

import * as PIXI from 'pixi.js';
import { COLORS, SIZES } from '../utils/colors';

export class LocationNode {
  public container: PIXI.Container;
  public locationId: string;

  private background: PIXI.Graphics;
  private icon: PIXI.Graphics;
  private glow: PIXI.Graphics;
  private label: PIXI.Text;
  private silhouette: PIXI.Graphics;

  private state: DiscoveryState = 'unknown';

  constructor(location: MapLocation) {
    this.locationId = location.id;
    this.container = new PIXI.Container();
    this.container.position.set(location.position.x, location.position.y);

    // Create visual elements
    this.glow = this.createGlow();
    this.background = this.createBackground();
    this.icon = this.createIcon(location.locationType);
    this.silhouette = this.createSilhouette();
    this.label = this.createLabel(location.name);

    // Layer order
    this.container.addChild(this.glow);
    this.container.addChild(this.silhouette);
    this.container.addChild(this.background);
    this.container.addChild(this.icon);
    this.container.addChild(this.label);

    // Interactivity
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.hitArea = new PIXI.Circle(0, 0, SIZES.nodeRadius * 1.5);

    this.updateVisuals(location.discoveryState);
  }

  updateVisuals(discoveryState: DiscoveryState): void {
    this.state = discoveryState;

    switch (discoveryState) {
      case 'unknown':
        this.container.visible = false;
        break;

      case 'rumored':
        this.container.visible = true;
        this.background.visible = false;
        this.icon.visible = false;
        this.silhouette.visible = true;
        this.label.alpha = 0.5;
        this.label.text = '???';
        break;

      case 'discovered':
        this.container.visible = true;
        this.background.visible = true;
        this.icon.visible = true;
        this.silhouette.visible = false;
        this.label.alpha = 1;
        break;

      case 'visited':
        this.container.visible = true;
        this.background.visible = true;
        this.icon.visible = true;
        this.silhouette.visible = false;
        this.label.alpha = 1;
        // Add visited indicator (checkmark, different border, etc.)
        break;
    }
  }
}
```

## Interaction Setup

```typescript
private setupInteraction(): void {
  // Location clicks
  this.locationLayer.onLocationClick = (locationId: string) => {
    const state = getMapState();
    if (state.currentLocationId && !state.travel?.isActive) {
      const canTravel = this.canTravelTo(locationId, state);
      if (canTravel) {
        state.startTravel(locationId);
      }
    }
    state.selectLocation(locationId);
  };

  // Location hover
  this.locationLayer.onLocationHover = (locationId: string | null) => {
    getMapState().hoverLocation(locationId);
  };
}

private canTravelTo(targetId: string, state: MapState): boolean {
  const current = state.locations[state.currentLocationId!];
  if (!current) return false;

  // Must be connected
  const isConnected = current.connectedTo.some(
    c => c.targetLocationId === targetId
  );

  // Must be at least rumored
  const target = state.locations[targetId];
  const isDiscovered = target &&
    target.discoveryState !== 'unknown';

  return isConnected && isDiscovered;
}
```
