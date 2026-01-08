// EventScheduler - Manages world event spawning and lifecycle
// Handles merchant caravans, bandit raids, festivals, storms, etc.

import type {
  MapLocation,
  WorldEvent,
  WorldEventType,
  WorldEventState,
  EventReward,
  EventConsequence,
  GameTime,
} from '@/types';
import { SeededRandom } from '../generators/SeededRandom';

// ============================================
// TYPES
// ============================================

export interface EventSchedulerConfig {
  // Base spawn rate per game hour
  baseSpawnRate: number;

  // Maximum concurrent events
  maxConcurrentEvents: number;

  // Event duration ranges (in game minutes)
  durationRanges: Record<WorldEventType, { min: number; max: number }>;

  // Event weights by time of day
  dayTimeWeights: Record<WorldEventType, number>;
  nightTimeWeights: Record<WorldEventType, number>;
}

export interface EventSpawnContext {
  gameTime: GameTime;
  currentLocationId: string;
  visitedLocationIds: string[];
  activeEventCount: number;
}

export interface EventTemplate {
  type: WorldEventType;
  weight: number;
  minDuration: number;
  maxDuration: number;
  isMoving: boolean;
  isInterceptable: boolean;
  interceptWindowDuration: number;
  rewards?: EventReward[];
  consequences?: EventConsequence[];
}

// ============================================
// EVENT TEMPLATES
// ============================================

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'merchant_caravan',
    weight: 30,
    minDuration: 120,
    maxDuration: 360,
    isMoving: true,
    isInterceptable: true,
    interceptWindowDuration: 30,
    rewards: [
      { type: 'item', value: 'rare_goods', probability: 0.3 },
      { type: 'gold', value: 100, probability: 0.5 },
    ],
  },
  {
    type: 'bandit_raid',
    weight: 20,
    minDuration: 60,
    maxDuration: 180,
    isMoving: false,
    isInterceptable: true,
    interceptWindowDuration: 45,
    rewards: [
      { type: 'gold', value: 50, probability: 0.4 },
      { type: 'reputation', value: 10, probability: 0.8 },
    ],
    consequences: [
      { type: 'danger_increase', targetId: '', duration: 1440 },
    ],
  },
  {
    type: 'festival',
    weight: 10,
    minDuration: 480,
    maxDuration: 720,
    isMoving: false,
    isInterceptable: true,
    interceptWindowDuration: 480,
    rewards: [
      { type: 'rumor', value: 'festival_rumor', probability: 0.6 },
      { type: 'gold', value: 30, probability: 0.3 },
    ],
  },
  {
    type: 'beast_migration',
    weight: 15,
    minDuration: 180,
    maxDuration: 360,
    isMoving: true,
    isInterceptable: false,
    interceptWindowDuration: 0,
    consequences: [
      { type: 'path_blocked', targetId: '', duration: 180 },
      { type: 'danger_increase', targetId: '', duration: 360 },
    ],
  },
  {
    type: 'storm',
    weight: 15,
    minDuration: 60,
    maxDuration: 240,
    isMoving: true,
    isInterceptable: false,
    interceptWindowDuration: 0,
    consequences: [
      { type: 'path_blocked', targetId: '', duration: 60 },
    ],
  },
  {
    type: 'plague',
    weight: 5,
    minDuration: 720,
    maxDuration: 1440,
    isMoving: false,
    isInterceptable: false,
    interceptWindowDuration: 0,
    consequences: [
      { type: 'danger_increase', targetId: '', duration: 720 },
    ],
  },
  {
    type: 'pilgrimage',
    weight: 10,
    minDuration: 240,
    maxDuration: 480,
    isMoving: true,
    isInterceptable: true,
    interceptWindowDuration: 60,
    rewards: [
      { type: 'rumor', value: 'shrine_rumor', probability: 0.7 },
    ],
  },
];

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: EventSchedulerConfig = {
  baseSpawnRate: 0.15,
  maxConcurrentEvents: 5,
  durationRanges: {
    merchant_caravan: { min: 120, max: 360 },
    bandit_raid: { min: 60, max: 180 },
    festival: { min: 480, max: 720 },
    beast_migration: { min: 180, max: 360 },
    storm: { min: 60, max: 240 },
    plague: { min: 720, max: 1440 },
    pilgrimage: { min: 240, max: 480 },
  },
  dayTimeWeights: {
    merchant_caravan: 40,
    bandit_raid: 10,
    festival: 20,
    beast_migration: 10,
    storm: 10,
    plague: 5,
    pilgrimage: 20,
  },
  nightTimeWeights: {
    merchant_caravan: 10,
    bandit_raid: 40,
    festival: 5,
    beast_migration: 25,
    storm: 15,
    plague: 5,
    pilgrimage: 5,
  },
};

// ============================================
// EVENT SCHEDULER CLASS
// ============================================

export class EventScheduler {
  private rng: SeededRandom;
  private config: EventSchedulerConfig;
  private locations: Map<string, MapLocation> = new Map();
  private eventCounter: number = 0;
  private lastSpawnCheck: number = 0;

  constructor(seed: string | number, config: Partial<EventSchedulerConfig> = {}) {
    this.rng = new SeededRandom(seed);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  public setLocations(locations: Record<string, MapLocation>): void {
    this.locations = new Map(Object.entries(locations));
  }

  public reseed(seed: string | number): void {
    this.rng = new SeededRandom(seed);
    this.eventCounter = 0;
  }

  // ============================================
  // EVENT SPAWNING
  // ============================================

  /**
   * Check if a new event should spawn
   */
  public shouldSpawnEvent(context: EventSpawnContext): boolean {
    // Check max concurrent events
    if (context.activeEventCount >= this.config.maxConcurrentEvents) {
      return false;
    }

    // Time-based spawn rate
    const hoursSinceLastCheck =
      (context.gameTime.totalMinutes - this.lastSpawnCheck) / 60;

    if (hoursSinceLastCheck < 1) {
      return false;
    }

    this.lastSpawnCheck = context.gameTime.totalMinutes;

    // Roll for spawn
    const spawnChance = this.config.baseSpawnRate * hoursSinceLastCheck;
    return this.rng.nextBool(spawnChance);
  }

  /**
   * Generate a new world event
   */
  public spawnEvent(context: EventSpawnContext): WorldEvent | null {
    // Select event type
    const template = this.selectEventTemplate(context);
    if (!template) return null;

    // Find appropriate location
    const locationId = this.selectEventLocation(template, context);
    if (!locationId) return null;

    // Generate route for moving events
    const route = template.isMoving
      ? this.generateEventRoute(locationId, template.type)
      : undefined;

    // Calculate timing
    const duration = this.rng.nextInt(template.minDuration, template.maxDuration);
    const startTime = context.gameTime.totalMinutes;
    const endTime = startTime + duration;

    // Intercept window
    const interceptWindow = template.isInterceptable
      ? {
          start: startTime,
          end: startTime + template.interceptWindowDuration,
        }
      : undefined;

    // Create event
    const event: WorldEvent = {
      id: `event_${++this.eventCounter}_${Date.now()}`,
      type: template.type,
      startTime,
      duration,
      endTime,
      isMoving: template.isMoving,
      route,
      currentLocationIndex: 0,
      staticLocationId: template.isMoving ? undefined : locationId,
      state: 'active',
      isInterceptable: template.isInterceptable,
      wasIntercepted: false,
      interceptWindow,
      rewards: template.rewards?.map((r) => ({ ...r })),
      consequences: template.consequences?.map((c) => ({
        ...c,
        targetId: locationId,
      })),
    };

    return event;
  }

  // ============================================
  // EVENT SELECTION
  // ============================================

  private selectEventTemplate(context: EventSpawnContext): EventTemplate | null {
    const isNight = context.gameTime.hour >= 19 || context.gameTime.hour < 6;
    const weights = isNight
      ? this.config.nightTimeWeights
      : this.config.dayTimeWeights;

    // Build weighted selection
    const weightedTemplates = EVENT_TEMPLATES.map((t) => ({
      template: t,
      weight: weights[t.type] || t.weight,
    }));

    const totalWeight = weightedTemplates.reduce((sum, w) => sum + w.weight, 0);
    let random = this.rng.next() * totalWeight;

    for (const { template, weight } of weightedTemplates) {
      random -= weight;
      if (random <= 0) {
        return template;
      }
    }

    return EVENT_TEMPLATES[0];
  }

  private selectEventLocation(
    template: EventTemplate,
    context: EventSpawnContext
  ): string | null {
    const locationIds = Array.from(this.locations.keys());
    if (locationIds.length === 0) return null;

    // Filter based on event type
    const validLocations = locationIds.filter((id) => {
      const location = this.locations.get(id)!;

      // Festivals prefer towns/villages
      if (template.type === 'festival') {
        return location.locationType === 'town' || location.locationType === 'village';
      }

      // Pilgrimages prefer shrines
      if (template.type === 'pilgrimage') {
        return location.locationType === 'shrine';
      }

      // Raids target towns/villages but not player's current location
      if (template.type === 'bandit_raid') {
        if (id === context.currentLocationId) return false;
        return location.locationType === 'town' || location.locationType === 'village';
      }

      // Default: any discovered location
      return location.discoveryState !== 'unknown';
    });

    if (validLocations.length === 0) {
      // Fallback to any location
      return this.rng.pick(locationIds);
    }

    return this.rng.pick(validLocations);
  }

  private generateEventRoute(startLocationId: string, eventType: WorldEventType): string[] {
    const route: string[] = [startLocationId];
    const startLocation = this.locations.get(startLocationId);

    if (!startLocation) return route;

    // Generate route based on event type
    const routeLength = eventType === 'merchant_caravan' ? 4 : 3;
    let currentId = startLocationId;

    for (let i = 1; i < routeLength; i++) {
      const current = this.locations.get(currentId);
      if (!current || current.connectedTo.length === 0) break;

      // Pick a connected location we haven't visited
      const unvisitedConnections = current.connectedTo.filter(
        (conn) => !route.includes(conn.targetLocationId)
      );

      if (unvisitedConnections.length === 0) break;

      const nextConn = this.rng.pick(unvisitedConnections);
      route.push(nextConn.targetLocationId);
      currentId = nextConn.targetLocationId;
    }

    return route;
  }

  // ============================================
  // EVENT UPDATES
  // ============================================

  /**
   * Update an event's state based on current game time
   */
  public updateEvent(event: WorldEvent, gameTime: GameTime): WorldEvent {
    // Check if event should end
    if (gameTime.totalMinutes >= event.endTime) {
      return {
        ...event,
        state: 'completed' as WorldEventState,
      };
    }

    // Update moving events
    if (event.isMoving && event.route && event.route.length > 1) {
      const elapsedTime = gameTime.totalMinutes - event.startTime;
      const timePerStop = event.duration / event.route.length;
      const newLocationIndex = Math.min(
        event.route.length - 1,
        Math.floor(elapsedTime / timePerStop)
      );

      if (newLocationIndex !== event.currentLocationIndex) {
        return {
          ...event,
          currentLocationIndex: newLocationIndex,
        };
      }
    }

    // Update intercept window
    if (event.isInterceptable && event.interceptWindow) {
      const windowEnded = gameTime.totalMinutes > event.interceptWindow.end;
      if (windowEnded && !event.wasIntercepted) {
        return {
          ...event,
          isInterceptable: false,
        };
      }
    }

    return event;
  }

  /**
   * Check if player can intercept an event
   */
  public canInterceptEvent(
    event: WorldEvent,
    playerLocationId: string,
    gameTime: GameTime
  ): boolean {
    if (!event.isInterceptable || event.wasIntercepted) {
      return false;
    }

    // Check intercept window
    if (event.interceptWindow) {
      const { start, end } = event.interceptWindow;
      if (gameTime.totalMinutes < start || gameTime.totalMinutes > end) {
        return false;
      }
    }

    // Check location
    const eventLocationId = event.isMoving
      ? event.route?.[event.currentLocationIndex ?? 0]
      : event.staticLocationId;

    return eventLocationId === playerLocationId;
  }

  /**
   * Process event interception
   */
  public interceptEvent(event: WorldEvent): {
    updatedEvent: WorldEvent;
    rewards: EventReward[];
  } {
    const rewards = (event.rewards || []).filter(
      (r) => this.rng.nextBool(r.probability)
    );

    return {
      updatedEvent: {
        ...event,
        wasIntercepted: true,
        isInterceptable: false,
      },
      rewards,
    };
  }

  /**
   * Process event completion and apply consequences
   */
  public completeEvent(event: WorldEvent): EventConsequence[] {
    if (event.wasIntercepted) {
      // No negative consequences if intercepted
      return [];
    }

    return event.consequences || [];
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get events at a specific location
   */
  public getEventsAtLocation(
    events: WorldEvent[],
    locationId: string
  ): WorldEvent[] {
    return events.filter((event) => {
      if (event.state !== 'active') return false;

      const eventLocationId = event.isMoving
        ? event.route?.[event.currentLocationIndex ?? 0]
        : event.staticLocationId;

      return eventLocationId === locationId;
    });
  }

  /**
   * Get interceptable events for player
   */
  public getInterceptableEvents(
    events: WorldEvent[],
    playerLocationId: string,
    gameTime: GameTime
  ): WorldEvent[] {
    return events.filter((event) =>
      this.canInterceptEvent(event, playerLocationId, gameTime)
    );
  }

  /**
   * Check if a location is affected by event consequences
   */
  public getLocationConsequences(
    events: WorldEvent[],
    locationId: string
  ): EventConsequence[] {
    const consequences: EventConsequence[] = [];

    for (const event of events) {
      if (!event.consequences) continue;

      for (const consequence of event.consequences) {
        if (consequence.targetId === locationId) {
          consequences.push(consequence);
        }
      }
    }

    return consequences;
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  public getState(): { counter: number; lastSpawn: number } {
    return {
      counter: this.eventCounter,
      lastSpawn: this.lastSpawnCheck,
    };
  }

  public setState(state: { counter: number; lastSpawn: number }): void {
    this.eventCounter = state.counter;
    this.lastSpawnCheck = state.lastSpawn;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createEventScheduler(
  seed: string | number,
  config?: Partial<EventSchedulerConfig>
): EventScheduler {
  return new EventScheduler(seed, config);
}
