// Rumor System Type Definitions

import type { LocationType, Vector2 } from './map';

// ============================================
// RUMOR SOURCES
// ============================================

export type RumorSource =
  | 'npc_dialogue'
  | 'letter'
  | 'map_fragment'
  | 'signpost'
  | 'dying_words'
  | 'graffiti';

// ============================================
// RUMOR DISTORTION
// ============================================

export interface RumorDistortion {
  nameAccurate: boolean;
  typeAccurate: boolean;
  positionOffset: Vector2;          // How far off the mark
  dangerAccurate: boolean;
  lootExaggeration: number;         // 1.0 = accurate, 2.0 = double
}

// ============================================
// RUMOR
// ============================================

export interface Rumor {
  id: string;
  targetLocationId: string;

  // Display info (what player sees)
  vagueName: string;
  vagueDescription: string;
  vagueLocationType: LocationType;  // May be inaccurate

  // Source tracking
  source: RumorSource;
  sourceId: string;                 // NPC ID or item ID
  sourceDetail: string;             // "Merchant in Millbrook"
  acquiredAt: number;               // Game timestamp

  // Accuracy system
  reliability: number;              // 0.0 - 1.0
  distortion: RumorDistortion;
}

// ============================================
// RELIABILITY CONSTANTS
// ============================================

// Rumor reliability by source [min, max]
export const RUMOR_RELIABILITY: Record<RumorSource, [number, number]> = {
  'npc_dialogue': [0.5, 0.8],
  'letter': [0.7, 0.95],
  'map_fragment': [0.85, 1.0],
  'signpost': [0.9, 1.0],
  'dying_words': [0.3, 0.7],
  'graffiti': [0.2, 0.6],
};
