// TravelAnimator - Orchestrates player travel animation
// Manages travel state machine and coordinates with store

import type { Vector2, Path, MapLocation, PathType } from '@/types';
import type { GameTime } from '@/types/time';
import type {
  TravelState,
  TravelRoute,
  TravelEvent,
} from '@/types/travel';
import { TravelEventRoller, type EventRollContext } from '@/systems/TravelEventRoller';
import { getPointOnPath } from '../utils/geometry';

// ============================================
// TYPES
// ============================================

export type TravelPhase =
  | 'idle'
  | 'departing'
  | 'traveling'
  | 'event_pending'
  | 'arriving'
  | 'completed';

export interface TravelAnimatorCallbacks {
  onProgressUpdate: (
    totalProgress: number,
    segmentIndex: number,
    segmentProgress: number
  ) => void;
  onPositionUpdate: (position: Vector2) => void;
  onEventTriggered: (event: TravelEvent) => void;
  onSegmentComplete: (segmentIndex: number) => void;
  onTravelComplete: (destinationId: string) => void;
  onTimeAdvance: (minutes: number) => void;
}

export interface TravelAnimatorConfig {
  // Real-time seconds per game minute
  realSecondsPerGameMinute: number;

  // Enable event rolling
  enableEvents: boolean;

  // Event check frequency (game minutes between checks)
  eventCheckInterval: number;

  // Animation smoothing
  positionSmoothing: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: TravelAnimatorConfig = {
  realSecondsPerGameMinute: 0.5,
  enableEvents: true,
  eventCheckInterval: 5,
  positionSmoothing: 0.1,
};

// ============================================
// TRAVEL ANIMATOR CLASS
// ============================================

export class TravelAnimator {
  private config: TravelAnimatorConfig;
  private callbacks: TravelAnimatorCallbacks;

  // Travel state
  private phase: TravelPhase = 'idle';
  private travelState: TravelState | null = null;
  private route: TravelRoute | null = null;

  // Timing
  private elapsedRealTime: number = 0;
  private elapsedGameMinutes: number = 0;
  private lastEventCheckMinutes: number = 0;

  // Position tracking
  private currentPosition: Vector2 = { x: 0, y: 0 };
  private targetPosition: Vector2 = { x: 0, y: 0 };

  // Data references
  private paths: Map<string, Path> = new Map();
  private locations: Map<string, MapLocation> = new Map();

  // Event roller
  private eventRoller: TravelEventRoller;
  private playerLevel: number = 1;

  // Game time reference
  private currentGameTime: GameTime = { day: 1, hour: 8, minute: 0, totalMinutes: 480 };

  constructor(
    callbacks: TravelAnimatorCallbacks,
    config: Partial<TravelAnimatorConfig> = {}
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventRoller = new TravelEventRoller(Date.now());
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  public setMapData(
    paths: Record<string, Path>,
    locations: Record<string, MapLocation>
  ): void {
    this.paths = new Map(Object.entries(paths));
    this.locations = new Map(Object.entries(locations));
  }

  public setPlayerLevel(level: number): void {
    this.playerLevel = level;
  }

  public setGameTime(gameTime: GameTime): void {
    this.currentGameTime = gameTime;
  }

  // ============================================
  // TRAVEL CONTROL
  // ============================================

  public startTravel(route: TravelRoute, startTime: number): TravelState {
    this.route = route;
    this.phase = 'departing';
    this.elapsedRealTime = 0;
    this.elapsedGameMinutes = 0;
    this.lastEventCheckMinutes = 0;

    // Reseed event roller for this journey
    this.eventRoller.reseed(`travel_${startTime}_${route.startLocationId}`);

    // Create initial travel state
    this.travelState = {
      isActive: true,
      startedAt: startTime,
      route,
      currentSegmentIndex: 0,
      segmentProgress: 0,
      estimatedArrival: startTime + route.totalTime,
      totalProgress: 0,
      pendingEvent: null,
      encounterRollsRemaining: Math.ceil(route.totalTime / this.config.eventCheckInterval),
    };

    // Set initial position
    const startLocation = this.locations.get(route.startLocationId);
    if (startLocation) {
      this.currentPosition = { ...startLocation.position };
      this.targetPosition = { ...this.currentPosition };
    }

    // Quick departure phase then start traveling
    setTimeout(() => {
      if (this.phase === 'departing') {
        this.phase = 'traveling';
      }
    }, 200);

    return this.travelState;
  }

  public pauseTravel(): void {
    if (this.phase === 'traveling') {
      this.phase = 'event_pending';
    }
  }

  public resumeTravel(): void {
    if (this.phase === 'event_pending' && this.travelState) {
      this.travelState.pendingEvent = null;
      this.phase = 'traveling';
    }
  }

  public cancelTravel(): void {
    this.phase = 'idle';
    this.travelState = null;
    this.route = null;
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    if (this.phase === 'idle' || !this.travelState || !this.route) {
      return;
    }

    // Skip update if waiting for event resolution
    if (this.phase === 'event_pending') {
      return;
    }

    // Calculate game time advancement
    const gameMinutesElapsed =
      deltaTime / this.config.realSecondsPerGameMinute;
    this.elapsedRealTime += deltaTime;
    this.elapsedGameMinutes += gameMinutesElapsed;

    // Advance game time
    this.callbacks.onTimeAdvance(gameMinutesElapsed);

    // Update travel progress
    this.updateTravelProgress();

    // Update position
    this.updatePosition();

    // Check for events
    if (this.config.enableEvents) {
      this.checkForEvents();
    }

    // Notify progress
    this.callbacks.onProgressUpdate(
      this.travelState.totalProgress,
      this.travelState.currentSegmentIndex,
      this.travelState.segmentProgress
    );
  }

  private updateTravelProgress(): void {
    if (!this.travelState || !this.route) return;

    const { route, currentSegmentIndex } = this.travelState;
    const segment = route.segments[currentSegmentIndex];

    if (!segment) {
      // No more segments - travel complete
      this.completeTravelSegment();
      return;
    }

    // Calculate progress within current segment
    const segmentTimeElapsed =
      (this.elapsedGameMinutes -
        this.getSegmentStartTime(currentSegmentIndex)) /
      segment.duration;

    this.travelState.segmentProgress = Math.min(1, Math.max(0, segmentTimeElapsed));

    // Calculate total progress
    let completedTime = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      completedTime += route.segments[i].duration;
    }
    completedTime += segment.duration * this.travelState.segmentProgress;

    this.travelState.totalProgress = Math.min(
      1,
      completedTime / route.totalTime
    );

    // Check segment completion
    if (this.travelState.segmentProgress >= 1) {
      this.completeCurrentSegment();
    }
  }

  private getSegmentStartTime(segmentIndex: number): number {
    if (!this.route) return 0;

    let time = 0;
    for (let i = 0; i < segmentIndex; i++) {
      time += this.route.segments[i].duration;
    }
    return time;
  }

  private completeCurrentSegment(): void {
    if (!this.travelState || !this.route) return;

    const completedIndex = this.travelState.currentSegmentIndex;
    this.callbacks.onSegmentComplete(completedIndex);

    // Move to next segment
    this.travelState.currentSegmentIndex++;
    this.travelState.segmentProgress = 0;

    // Check if travel complete
    if (this.travelState.currentSegmentIndex >= this.route.segments.length) {
      this.completeTravelSegment();
    }
  }

  private completeTravelSegment(): void {
    if (!this.route) return;

    this.phase = 'arriving';

    // Brief arrival animation then complete
    setTimeout(() => {
      this.phase = 'completed';
      this.callbacks.onTravelComplete(this.route!.endLocationId);

      // Reset state
      this.travelState = null;
      this.route = null;
      this.phase = 'idle';
    }, 300);
  }

  // ============================================
  // POSITION UPDATES
  // ============================================

  private updatePosition(): void {
    if (!this.travelState || !this.route) return;

    const { currentSegmentIndex, segmentProgress } = this.travelState;
    const segment = this.route.segments[currentSegmentIndex];

    if (!segment) return;

    // Get path and calculate position
    const path = this.paths.get(segment.pathId);
    const fromLocation = this.locations.get(segment.fromLocationId);
    const toLocation = this.locations.get(segment.toLocationId);

    if (!path || !fromLocation || !toLocation) return;

    // Calculate target position on path
    this.targetPosition = getPointOnPath(
      path.points,
      fromLocation.position,
      toLocation.position,
      segmentProgress
    );

    // Smooth interpolation
    this.currentPosition = {
      x:
        this.currentPosition.x +
        (this.targetPosition.x - this.currentPosition.x) *
          this.config.positionSmoothing,
      y:
        this.currentPosition.y +
        (this.targetPosition.y - this.currentPosition.y) *
          this.config.positionSmoothing,
    };

    this.callbacks.onPositionUpdate(this.currentPosition);
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private checkForEvents(): void {
    if (!this.travelState || !this.route) return;

    // Check interval
    const minutesSinceLastCheck =
      this.elapsedGameMinutes - this.lastEventCheckMinutes;
    if (minutesSinceLastCheck < this.config.eventCheckInterval) {
      return;
    }

    this.lastEventCheckMinutes = this.elapsedGameMinutes;

    // Build event context
    const segment = this.route.segments[this.travelState.currentSegmentIndex];
    if (!segment) return;

    const path = this.paths.get(segment.pathId);
    const pathType: PathType = path?.pathType ?? 'trail';

    const context: EventRollContext = {
      segment,
      pathType,
      progress: this.travelState.segmentProgress,
      gameTime: this.currentGameTime,
      playerLevel: this.playerLevel,
    };

    // Roll for event
    const event = this.eventRoller.rollForEvent(context, this.currentPosition);

    if (event) {
      this.triggerEvent(event);
    }
  }

  private triggerEvent(event: TravelEvent): void {
    if (!this.travelState) return;

    this.travelState.pendingEvent = event;
    this.travelState.encounterRollsRemaining--;
    this.phase = 'event_pending';

    this.callbacks.onEventTriggered(event);
  }

  // ============================================
  // QUERIES
  // ============================================

  public getPhase(): TravelPhase {
    return this.phase;
  }

  public getTravelState(): TravelState | null {
    return this.travelState;
  }

  public getCurrentPosition(): Vector2 {
    return { ...this.currentPosition };
  }

  public isActive(): boolean {
    return this.phase !== 'idle' && this.phase !== 'completed';
  }

  public isPaused(): boolean {
    return this.phase === 'event_pending';
  }

  /**
   * Get ETA in game minutes from current time
   */
  public getETA(): number {
    if (!this.travelState || !this.route) return 0;

    const remainingTime =
      this.route.totalTime * (1 - this.travelState.totalProgress);
    return Math.ceil(remainingTime);
  }

  /**
   * Get current segment info for UI
   */
  public getCurrentSegmentInfo(): {
    from: string;
    to: string;
    progress: number;
    dangerLevel: number;
  } | null {
    if (!this.travelState || !this.route) return null;

    const segment =
      this.route.segments[this.travelState.currentSegmentIndex];
    if (!segment) return null;

    const fromLocation = this.locations.get(segment.fromLocationId);
    const toLocation = this.locations.get(segment.toLocationId);

    return {
      from: fromLocation?.name ?? segment.fromLocationId,
      to: toLocation?.name ?? segment.toLocationId,
      progress: this.travelState.segmentProgress,
      dangerLevel: segment.dangerLevel,
    };
  }

  /**
   * Preview danger for upcoming route (for UI)
   */
  public getDangerPreview(): { average: number; max: number } {
    if (!this.route) return { average: 0, max: 0 };

    const dangers = this.route.segments.map((s) => s.dangerLevel);
    const average = dangers.reduce((a, b) => a + b, 0) / dangers.length;
    const max = Math.max(...dangers);

    return { average, max };
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createTravelAnimator(
  callbacks: TravelAnimatorCallbacks,
  config?: Partial<TravelAnimatorConfig>
): TravelAnimator {
  return new TravelAnimator(callbacks, config);
}
