// TravelEventRoller - Generates random events during travel
// Rolls for events based on danger level, time of day, and path type

import type { Vector2, PathType } from '@/types';
import type { TimeOfDay, GameTime } from '@/types/time';
import type {
  TravelEvent,
  TravelEventType,
  TravelEventData,
  RouteSegment,
} from '@/types/travel';
import { getTimeOfDay } from '@/types/time';
import { SeededRandom } from '@/pixi/generators/SeededRandom';

// ============================================
// TYPES
// ============================================

export interface EventRollContext {
  segment: RouteSegment;
  pathType: PathType;
  progress: number; // 0-1 progress through segment
  gameTime: GameTime;
  playerLevel: number;
}

export interface EventProbabilities {
  ambush: number;
  discovery: number;
  traveler: number;
  weather: number;
  shortcut: number;
  caravan_intercept: number;
  blocked_path: number;
  wounded_npc: number;
}

export interface TravelEventRollerConfig {
  // Base encounter rate per segment (0-1)
  baseEncounterRate: number;

  // Danger level multiplier (higher danger = more events)
  dangerMultiplier: number;

  // Time of day modifiers
  timeModifiers: Record<TimeOfDay, number>;

  // Path type modifiers
  pathModifiers: Record<PathType, number>;

  // Event type weights
  eventWeights: EventProbabilities;

  // Minimum progress before first event can occur (0-1)
  minimumProgressForEvent: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: TravelEventRollerConfig = {
  baseEncounterRate: 0.15,
  dangerMultiplier: 0.1,
  timeModifiers: {
    dawn: 0.7,
    morning: 0.6,
    afternoon: 0.5,
    dusk: 0.9,
    evening: 1.2,
    night: 1.5,
  },
  pathModifiers: {
    road: 0.5,
    trail: 0.8,
    wilderness: 1.2,
    hidden: 1.0,
  },
  eventWeights: {
    ambush: 30,
    discovery: 15,
    traveler: 25,
    weather: 10,
    shortcut: 5,
    caravan_intercept: 5,
    blocked_path: 5,
    wounded_npc: 5,
  },
  minimumProgressForEvent: 0.1,
};

// ============================================
// ENEMY TEMPLATES BY DANGER LEVEL
// ============================================

const ENEMY_TEMPLATES: Record<number, string[][]> = {
  1: [['wolf'], ['bandit']],
  2: [['wolf', 'wolf'], ['bandit', 'bandit']],
  3: [['bandit', 'bandit', 'bandit'], ['wolf_pack']],
  4: [['bandit_captain', 'bandit', 'bandit'], ['dire_wolf', 'wolf', 'wolf']],
  5: [['bandit_captain', 'bandit', 'bandit', 'bandit'], ['ogre']],
  6: [['shadow_assassin'], ['bandit_elite', 'bandit', 'bandit', 'bandit']],
  7: [['demon_scout', 'imp', 'imp'], ['shadow_assassin', 'shadow_assassin']],
  8: [['demon_warrior', 'imp', 'imp', 'imp'], ['shadow_lord']],
  9: [['demon_warrior', 'demon_warrior'], ['shadow_lord', 'shadow_assassin']],
  10: [['arch_demon'], ['shadow_lord', 'shadow_lord']],
};

const NPC_TYPES = [
  'merchant',
  'pilgrim',
  'hunter',
  'wanderer',
  'monk',
  'refugee',
  'soldier',
  'courier',
];

const WEATHER_TYPES = ['rain', 'storm', 'fog', 'wind'] as const;

// ============================================
// TRAVEL EVENT ROLLER CLASS
// ============================================

export class TravelEventRoller {
  private rng: SeededRandom;
  private config: TravelEventRollerConfig;
  private eventCounter: number = 0;

  constructor(seed: string | number, config: Partial<TravelEventRollerConfig> = {}) {
    this.rng = new SeededRandom(seed);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // MAIN ROLL METHODS
  // ============================================

  /**
   * Roll to see if an event should occur at this point in travel
   */
  public shouldTriggerEvent(context: EventRollContext): boolean {
    // Too early in segment
    if (context.progress < this.config.minimumProgressForEvent) {
      return false;
    }

    const encounterRate = this.calculateEncounterRate(context);
    return this.rng.nextBool(encounterRate);
  }

  /**
   * Generate an event based on context
   */
  public generateEvent(
    context: EventRollContext,
    playerPosition: Vector2
  ): TravelEvent {
    const eventType = this.rollEventType(context);
    const eventData = this.generateEventData(eventType, context);

    const event: TravelEvent = {
      id: `travel_event_${++this.eventCounter}_${Date.now()}`,
      type: eventType,
      triggeredAt: context.gameTime.totalMinutes,
      position: playerPosition,
      data: eventData,
      resolved: false,
    };

    return event;
  }

  /**
   * Combined method: check and generate if needed
   */
  public rollForEvent(
    context: EventRollContext,
    playerPosition: Vector2
  ): TravelEvent | null {
    if (!this.shouldTriggerEvent(context)) {
      return null;
    }

    return this.generateEvent(context, playerPosition);
  }

  // ============================================
  // PROBABILITY CALCULATIONS
  // ============================================

  private calculateEncounterRate(context: EventRollContext): number {
    const { baseEncounterRate, dangerMultiplier, timeModifiers, pathModifiers } =
      this.config;

    const timeOfDay = getTimeOfDay(context.gameTime.hour);

    // Base rate
    let rate = baseEncounterRate;

    // Apply danger modifier
    rate += context.segment.dangerLevel * dangerMultiplier;

    // Apply time modifier
    rate *= timeModifiers[timeOfDay];

    // Apply path type modifier
    rate *= pathModifiers[context.pathType];

    // Clamp between 0 and 0.8 (never guaranteed)
    return Math.max(0, Math.min(0.8, rate));
  }

  private rollEventType(context: EventRollContext): TravelEventType {
    const weights = this.adjustWeightsForContext(context);
    const types = Object.keys(weights) as TravelEventType[];
    const weightValues = types.map((t) => weights[t]);

    return this.rng.weightedPick(types, weightValues);
  }

  private adjustWeightsForContext(context: EventRollContext): EventProbabilities {
    const weights = { ...this.config.eventWeights };
    const timeOfDay = getTimeOfDay(context.gameTime.hour);

    // Night increases ambush chance
    if (timeOfDay === 'night' || timeOfDay === 'evening') {
      weights.ambush *= 1.5;
      weights.traveler *= 0.5;
    }

    // Morning/afternoon better for friendly encounters
    if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
      weights.traveler *= 1.3;
      weights.caravan_intercept *= 1.5;
    }

    // Wilderness paths have more discoveries
    if (context.pathType === 'wilderness') {
      weights.discovery *= 2;
      weights.weather *= 1.5;
    }

    // Hidden paths have shortcuts
    if (context.pathType === 'hidden') {
      weights.shortcut *= 3;
      weights.ambush *= 0.5;
    }

    // Roads have more caravans and travelers
    if (context.pathType === 'road') {
      weights.caravan_intercept *= 2;
      weights.traveler *= 1.5;
      weights.discovery *= 0.3;
    }

    // High danger = more ambushes
    if (context.segment.dangerLevel >= 5) {
      weights.ambush *= 1.5;
      weights.wounded_npc *= 1.5;
    }

    return weights;
  }

  // ============================================
  // EVENT DATA GENERATION
  // ============================================

  private generateEventData(
    type: TravelEventType,
    context: EventRollContext
  ): TravelEventData {
    switch (type) {
      case 'ambush':
        return this.generateAmbushData(context);
      case 'discovery':
        return this.generateDiscoveryData();
      case 'traveler':
        return this.generateTravelerData(context);
      case 'weather':
        return this.generateWeatherData();
      case 'shortcut':
        return {};
      case 'caravan_intercept':
        return this.generateCaravanData();
      case 'blocked_path':
        return this.generateBlockedPathData();
      case 'wounded_npc':
        return this.generateWoundedNpcData(context);
      default:
        return {};
    }
  }

  private generateAmbushData(context: EventRollContext): TravelEventData {
    // Clamp danger level to template range
    const dangerLevel = Math.max(1, Math.min(10, Math.round(context.segment.dangerLevel)));
    const templates = ENEMY_TEMPLATES[dangerLevel] || ENEMY_TEMPLATES[1];
    const enemies = this.rng.pick(templates);

    // Scale difficulty based on player level
    const scaledDifficulty = dangerLevel + Math.floor((context.playerLevel - 1) / 3);

    return {
      enemies: [...enemies],
      ambushDifficulty: scaledDifficulty,
    };
  }

  private generateDiscoveryData(): TravelEventData {
    // Location ID would be filled in by the game system
    return {
      revealedLocationId: undefined,
    };
  }

  private generateTravelerData(context: EventRollContext): TravelEventData {
    const npcType = this.rng.pick(NPC_TYPES);

    // Determine disposition based on time and danger
    let disposition: 'friendly' | 'neutral' | 'hostile';
    const timeOfDay = getTimeOfDay(context.gameTime.hour);

    if (timeOfDay === 'night' && context.segment.dangerLevel >= 4) {
      disposition = this.rng.weightedPick(
        ['hostile', 'neutral', 'friendly'],
        [40, 40, 20]
      );
    } else {
      disposition = this.rng.weightedPick(
        ['friendly', 'neutral', 'hostile'],
        [50, 40, 10]
      );
    }

    return { npcType, disposition };
  }

  private generateWeatherData(): TravelEventData {
    const weatherType = this.rng.pick([...WEATHER_TYPES]);
    const delayAmount = this.rng.nextInt(5, 30); // 5-30 minute delay

    return { weatherType, delayAmount };
  }

  private generateCaravanData(): TravelEventData {
    const goods = this.rng.pickMultiple(
      ['potions', 'weapons', 'armor', 'scrolls', 'food', 'materials'],
      this.rng.nextInt(2, 4)
    );

    return {
      caravanId: `caravan_${Date.now()}`,
      tradeGoods: goods,
    };
  }

  private generateBlockedPathData(): TravelEventData {
    const delayAmount = this.rng.nextInt(10, 45);
    return { delayAmount };
  }

  private generateWoundedNpcData(_context: EventRollContext): TravelEventData {
    const npcType = this.rng.pick(['soldier', 'merchant', 'pilgrim', 'hunter']);
    const disposition = this.rng.nextBool(0.9) ? 'friendly' : 'neutral';

    return { npcType, disposition };
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Reset the RNG with a new seed
   */
  public reseed(seed: string | number): void {
    this.rng = new SeededRandom(seed);
    this.eventCounter = 0;
  }

  /**
   * Get the current RNG state for save/load
   */
  public getState(): { seed: number; counter: number } {
    return {
      seed: this.rng.getState(),
      counter: this.eventCounter,
    };
  }

  /**
   * Restore state from save
   */
  public setState(state: { seed: number; counter: number }): void {
    this.rng.setState(state.seed);
    this.eventCounter = state.counter;
  }

  /**
   * Preview encounter rate for UI display
   */
  public getEncounterRatePreview(context: EventRollContext): number {
    return this.calculateEncounterRate(context);
  }

  /**
   * Get most likely event types for UI preview
   */
  public getMostLikelyEvents(
    context: EventRollContext,
    count: number = 3
  ): TravelEventType[] {
    const weights = this.adjustWeightsForContext(context);
    const sorted = Object.entries(weights).sort(([, a], [, b]) => b - a);
    return sorted.slice(0, count).map(([type]) => type as TravelEventType);
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createTravelEventRoller(
  seed: string | number,
  config?: Partial<TravelEventRollerConfig>
): TravelEventRoller {
  return new TravelEventRoller(seed, config);
}
