---
name: map-creator
description: Create roguelike travel map systems with PixiJS. Use when building: node-based travel maps, rumor-driven exploration, procedural map generation, real-time travel with encounters, day/night cycles, world events (caravans, raids), or PixiJS map rendering. Triggers on "create a map", "travel system", "roguelike map", "exploration map".
---

# Map Creator

Build real-time, rumor-driven roguelike travel maps with PixiJS and Zustand.

## Core Features

| Feature | Implementation |
|---------|----------------|
| Map Type | Full-screen travel map |
| Navigation | Node-locked paths |
| Discovery | Rumor-driven (NPCs, letters) |
| Travel | Real-time, committed (no cancel) |
| Generation | Procedural per run (seeded) |
| Death | Full reset |
| Zoom | Region → Zone → Local |

## Architecture

```
Types (src/types/)     →  Store (src/stores/)  →  PixiJS (src/pixi/)
map.ts, travel.ts          mapStore.ts              MapApplication.ts
rumor.ts, time.ts                                   layers/, objects/
```

## Key Patterns

### 1. Discovery State Machine

```
unknown → rumored → discovered → visited
           ↑
     (NPC, letter, map fragment)
```

### 2. Rumor Reliability

Sources have accuracy ranges: map fragments (85-100%), letters (70-95%), NPCs (50-80%), graffiti (20-60%).

### 3. Committed Travel

Once started, travel cannot be cancelled. Events interrupt but don't stop travel.

### 4. Seeded Generation

Same seed = same map. Use `SeededRandom` for all procedural decisions.

### 5. Event-Driven Bridge

React-PixiJS communication via `window.CustomEvent` with typed event bus.

## Workflow

### Step 1: Define Types

Create type definitions for your map system. See [data-models.md](references/data-models.md).

Required types:
- `DiscoveryState`, `BiomeType`, `LocationType`
- `MapRegion`, `MapZone`, `MapLocation`
- `PathConnection`, `Path`
- `Rumor`, `TravelState`, `GameTime`

### Step 2: Create Zustand Store

Implement `mapStore.ts` with `subscribeWithSelector`. See [state-management.md](references/state-management.md).

Required state:
- Map data (region, zones, locations, paths)
- Player position and travel state
- Game time and world events
- View state (zoom, pan, selection)

### Step 3: Set Up PixiJS Structure

Create the rendering layer hierarchy. See [pixi-structure.md](references/pixi-structure.md).

Layer order (bottom to top):
1. BackgroundLayer (terrain)
2. FogLayer (undiscovered)
3. PathLayer (roads, trails)
4. LocationLayer (nodes)
5. EventLayer (caravans, raids)
6. PlayerLayer (marker)
7. UILayer (tooltips)

### Step 4: Implement Procedural Generation

Build the map generator with seeded randomness. See [procedural-generation.md](references/procedural-generation.md).

Components:
- `SeededRandom` (Mulberry32 PRNG)
- `RegionGenerator` (zones, connections)
- Path generation (bezier curves)

### Step 5: Add Travel System

Implement pathfinding and travel events. See [travel-system.md](references/travel-system.md).

Features:
- A* pathfinding on location graph
- Travel event roller (weighted by danger)
- Real-time position updates

### Step 6: Apply Visual Design

Use consistent colors, sizes, and animations. See [visual-design.md](references/visual-design.md).

## Quick Reference

| Task | Reference File |
|------|----------------|
| Define map/location types | [data-models.md](references/data-models.md) |
| Set up Zustand store | [state-management.md](references/state-management.md) |
| Create PixiJS layers | [pixi-structure.md](references/pixi-structure.md) |
| Build procedural generator | [procedural-generation.md](references/procedural-generation.md) |
| Implement travel/pathfinding | [travel-system.md](references/travel-system.md) |
| Apply colors/animations | [visual-design.md](references/visual-design.md) |
