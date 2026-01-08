# Travel System

Pathfinding and travel event systems.

## Table of Contents

1. [A* Pathfinding](#a-pathfinding)
2. [Route Reconstruction](#route-reconstruction)
3. [Travel Event Roller](#travel-event-roller)
4. [Event Weights](#event-weights)

---

## A* Pathfinding

Find the shortest route between locations on the map graph.

```typescript
// src/systems/Pathfinding.ts

export function findRoute(
  fromId: string,
  toId: string,
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>
): TravelRoute | null {
  const start = locations[fromId];
  const goal = locations[toId];

  if (!start || !goal) return null;

  // Only traverse discovered/rumored paths
  const isTraversable = (pathId: string): boolean => {
    const path = paths[pathId];
    return path && path.discoveryState !== 'unknown';
  };

  // A* implementation
  const openSet = new Set<string>([fromId]);
  const cameFrom = new Map<string, { locationId: string; pathId: string }>();

  const gScore = new Map<string, number>();
  gScore.set(fromId, 0);

  const fScore = new Map<string, number>();
  fScore.set(fromId, heuristic(start, goal));

  while (openSet.size > 0) {
    // Get node with lowest fScore
    let current: string | null = null;
    let lowestF = Infinity;

    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = id;
      }
    }

    if (!current) break;

    if (current === toId) {
      return reconstructRoute(current, cameFrom, locations, paths);
    }

    openSet.delete(current);
    const currentLoc = locations[current];

    for (const connection of currentLoc.connectedTo) {
      if (!isTraversable(connection.pathId)) continue;

      const neighbor = connection.targetLocationId;
      const neighborLoc = locations[neighbor];
      if (!neighborLoc) continue;

      // Can only travel to discovered/rumored locations
      if (neighborLoc.discoveryState === 'unknown') continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + connection.travelTime;

      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, { locationId: current, pathId: connection.pathId });
        gScore.set(neighbor, tentativeG);
        fScore.set(neighbor, tentativeG + heuristic(neighborLoc, goal));
        openSet.add(neighbor);
      }
    }
  }

  return null; // No path found
}

function heuristic(a: MapLocation, b: MapLocation): number {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) / 50;
}
```

## Route Reconstruction

Build the travel route from pathfinding results.

```typescript
function reconstructRoute(
  goalId: string,
  cameFrom: Map<string, { locationId: string; pathId: string }>,
  locations: Record<string, MapLocation>,
  paths: Record<string, Path>
): TravelRoute {
  const segments: RouteSegment[] = [];
  let current = goalId;

  while (cameFrom.has(current)) {
    const { locationId: prev, pathId } = cameFrom.get(current)!;
    const path = paths[pathId];
    const prevLoc = locations[prev];

    const connection = prevLoc.connectedTo.find(c => c.pathId === pathId);

    segments.unshift({
      pathId,
      fromLocationId: prev,
      toLocationId: current,
      duration: connection?.travelTime ?? 30,
      dangerLevel: connection?.dangerModifier ?? 1,
    });

    current = prev;
  }

  const totalTime = segments.reduce((sum, s) => sum + s.duration, 0);
  const totalDanger = segments.reduce((sum, s) => sum + s.dangerLevel, 0) / segments.length;

  return {
    segments,
    totalTime,
    totalDanger,
    startLocationId: segments[0]?.fromLocationId ?? goalId,
    endLocationId: goalId,
  };
}
```

## Travel Event Roller

Roll for random events during travel.

```typescript
// src/systems/TravelEventRoller.ts

export function rollTravelEvent(
  travel: TravelState,
  state: MapState
): TravelEvent | null {
  const currentSegment = travel.route.segments[travel.currentSegmentIndex];
  if (!currentSegment) return null;

  const rng = new SeededRandom(state.gameTime.totalMinutes);

  // Base chance modified by danger level
  const dangerLevel = currentSegment.dangerLevel;
  const baseChance = 0.1 + (dangerLevel * 0.1); // 10% base + 10% per danger level

  // Time of day modifier
  const timeOfDay = getTimeOfDay(state.gameTime.hour);
  const timeModifier = timeOfDay === 'night' ? 1.5 : 1.0;

  const finalChance = baseChance * timeModifier;

  if (rng.float() > finalChance) {
    return null; // No event
  }

  // Select event type based on danger
  const weights = dangerLevel < 3
    ? EVENT_WEIGHTS.safe
    : dangerLevel < 6
      ? EVENT_WEIGHTS.moderate
      : EVENT_WEIGHTS.dangerous;

  const eventType = rng.weighted(weights);

  // Generate event data
  const eventData = generateEventData(eventType, travel, state, rng);

  return {
    id: rng.id('evt'),
    type: eventType,
    triggeredAt: state.gameTime.totalMinutes,
    position: calculateEventPosition(travel, state),
    data: eventData,
    resolved: false,
  };
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
}
```

## Event Weights

Event type probabilities by danger level.

```typescript
const EVENT_WEIGHTS = {
  safe: [
    { type: 'traveler', weight: 40 },
    { type: 'discovery', weight: 20 },
    { type: 'weather', weight: 30 },
    { type: 'shortcut', weight: 10 },
  ],
  moderate: [
    { type: 'ambush', weight: 30 },
    { type: 'traveler', weight: 25 },
    { type: 'discovery', weight: 15 },
    { type: 'weather', weight: 20 },
    { type: 'blocked_path', weight: 10 },
  ],
  dangerous: [
    { type: 'ambush', weight: 50 },
    { type: 'traveler', weight: 10 },
    { type: 'weather', weight: 15 },
    { type: 'blocked_path', weight: 15 },
    { type: 'wounded_npc', weight: 10 },
  ],
};
```

### Event Data Generation

```typescript
function generateEventData(
  type: string,
  travel: TravelState,
  state: MapState,
  rng: SeededRandom
): TravelEventData {
  switch (type) {
    case 'ambush':
      return {
        enemies: generateEnemies(travel.route.totalDanger, rng),
        ambushDifficulty: Math.ceil(travel.route.totalDanger * rng.floatBetween(0.8, 1.2)),
      };

    case 'discovery':
      const nearbyUnknown = findNearbyUnknownLocation(
        calculateEventPosition(travel, state),
        state.locations
      );
      return {
        revealedLocationId: nearbyUnknown?.id,
      };

    case 'traveler':
      return {
        npcType: rng.pick(['merchant', 'pilgrim', 'adventurer', 'refugee']),
        disposition: rng.weighted([
          { value: 'friendly', weight: 50 },
          { value: 'neutral', weight: 40 },
          { value: 'hostile', weight: 10 },
        ]),
      };

    case 'weather':
      return {
        weatherType: rng.pick(['rain', 'storm', 'fog', 'heat']),
        delayAmount: rng.intBetween(10, 30),
      };

    case 'caravan_intercept':
      const caravan = state.activeEvents.find(e => e.type === 'merchant_caravan');
      return {
        caravanId: caravan?.id,
        tradeGoods: ['weapons', 'potions', 'materials'],
      };

    default:
      return {};
  }
}
```
