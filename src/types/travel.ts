// Travel System Type Definitions

import type { Vector2 } from './map';

// ============================================
// ROUTE TYPES
// ============================================

export interface RouteSegment {
  pathId: string;
  fromLocationId: string;
  toLocationId: string;
  duration: number;
  dangerLevel: number;
}

export interface TravelRoute {
  segments: RouteSegment[];
  totalTime: number;
  totalDanger: number;
  startLocationId: string;
  endLocationId: string;
}

// ============================================
// TRAVEL EVENTS
// ============================================

export type TravelEventType =
  | 'ambush'
  | 'discovery'
  | 'traveler'
  | 'weather'
  | 'shortcut'
  | 'caravan_intercept'
  | 'blocked_path'
  | 'wounded_npc';

export type WeatherType =
  | 'rain'
  | 'storm'
  | 'fog'
  | 'heat'
  | 'snow'
  | 'wind';

export interface TravelEventData {
  // Ambush
  enemies?: string[];
  ambushDifficulty?: number;

  // Discovery
  revealedLocationId?: string;

  // Traveler
  npcType?: string;
  disposition?: 'friendly' | 'neutral' | 'hostile';

  // Weather
  weatherType?: WeatherType;
  delayAmount?: number;

  // Caravan
  caravanId?: string;
  tradeGoods?: string[];
}

export type TravelEventOutcome =
  | { type: 'continue' }
  | { type: 'delay'; amount: number }
  | { type: 'combat'; result: 'victory' | 'defeat' | 'flee' }
  | { type: 'trade'; completed: boolean }
  | { type: 'discovery'; locationId: string };

export interface TravelEvent {
  id: string;
  type: TravelEventType;
  triggeredAt: number;
  position: Vector2;
  data: TravelEventData;
  resolved: boolean;
  outcome?: TravelEventOutcome;
}

// ============================================
// TRAVEL STATE
// ============================================

export interface TravelState {
  isActive: boolean;
  startedAt: number;              // Game timestamp

  // Route info
  route: TravelRoute;
  currentSegmentIndex: number;
  segmentProgress: number;        // 0.0 - 1.0

  // Calculated
  estimatedArrival: number;
  totalProgress: number;          // 0.0 - 1.0

  // Events
  pendingEvent: TravelEvent | null;
  encounterRollsRemaining: number;
}
