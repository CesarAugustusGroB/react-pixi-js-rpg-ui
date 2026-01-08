// storyLocations - Fixed major location definitions
// These are hand-crafted story-critical locations that anchor the procedural generation

import type { LocationType, BiomeType, DiscoveryState, Vector2 } from '@/types';

// ============================================
// STORY LOCATION DEFINITION
// ============================================

export interface StoryLocationDef {
  id: string;
  name: string;
  locationType: LocationType;
  biome: BiomeType;
  description: string;
  dangerLevel: number; // 0-10
  isStoryRequired: boolean;
  initialDiscoveryState: DiscoveryState;

  // Position hints for generator (relative to region bounds, 0-1)
  positionHint: {
    x: number; // 0 = west edge, 1 = east edge
    y: number; // 0 = north edge, 1 = south edge
    variance: number; // How much to randomize position (0-0.2)
  };

  // Connection requirements
  minConnections: number;
  maxConnections: number;
  preferredConnectionTypes?: LocationType[];

  // Special properties
  hasInn?: boolean;
  hasShop?: boolean;
  hasBlacksmith?: boolean;
  hasShrine?: boolean;
  hasGuild?: boolean;

  // For dungeons/towers
  floors?: number;
  bossName?: string;

  // Narrative
  rumors?: string[];
  lore?: string;
}

// ============================================
// STORY LOCATION CATEGORIES
// ============================================

export type StoryLocationCategory =
  | 'starting_area'
  | 'early_game'
  | 'mid_game'
  | 'late_game'
  | 'endgame'
  | 'optional';

// ============================================
// MAIN STORY LOCATIONS
// ============================================

export const STORY_LOCATIONS: Record<string, StoryLocationDef> = {
  // ========== STARTING AREA ==========

  kagemusha_village: {
    id: 'kagemusha_village',
    name: 'Kagemusha Village',
    locationType: 'village',
    biome: 'forest',
    description:
      'A small, hidden village where the remnants of the shadow clan train in secret. Your journey begins here.',
    dangerLevel: 0,
    isStoryRequired: true,
    initialDiscoveryState: 'visited',
    positionHint: { x: 0.2, y: 0.8, variance: 0.05 },
    minConnections: 2,
    maxConnections: 4,
    hasInn: true,
    hasShop: true,
    rumors: [
      'The Infinite Tower appeared three moons ago, rising from the cursed lands.',
      'Strange creatures have been sighted in the northern forests since the tower emerged.',
      'Master Hayato knows more about the tower than he lets on.',
    ],
    lore: 'Founded by refugees of the Great Shadow War, this village has remained hidden for generations.',
  },

  misty_crossroads: {
    id: 'misty_crossroads',
    name: 'Misty Crossroads',
    locationType: 'crossing',
    biome: 'plains',
    description:
      'A foggy intersection where multiple paths converge. Travelers often share news here.',
    dangerLevel: 1,
    isStoryRequired: false,
    initialDiscoveryState: 'rumored',
    positionHint: { x: 0.3, y: 0.65, variance: 0.1 },
    minConnections: 3,
    maxConnections: 5,
    rumors: [
      'Bandits have been ambushing merchants on the eastern road.',
      'A hermit in the Whispering Woods can teach ancient techniques.',
    ],
  },

  // ========== EARLY GAME ==========

  thornwood_outpost: {
    id: 'thornwood_outpost',
    name: 'Thornwood Outpost',
    locationType: 'camp',
    biome: 'forest',
    description:
      'A fortified camp established by rangers to monitor the growing darkness.',
    dangerLevel: 2,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.35, y: 0.55, variance: 0.08 },
    minConnections: 2,
    maxConnections: 3,
    hasBlacksmith: true,
    rumors: [
      'The rangers have captured a shadow beast. It speaks of a master.',
      'Something stirs in the abandoned mine to the north.',
    ],
  },

  silent_shrine: {
    id: 'silent_shrine',
    name: 'Silent Shrine',
    locationType: 'shrine',
    biome: 'forest',
    description:
      'An ancient shrine dedicated to the Moon Goddess. Its power still lingers.',
    dangerLevel: 1,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.15, y: 0.6, variance: 0.1 },
    minConnections: 1,
    maxConnections: 2,
    hasShrine: true,
    lore: 'Built during the Age of Spirits, this shrine was once tended by priestesses who could commune with the dead.',
  },

  hollow_mine: {
    id: 'hollow_mine',
    name: 'Hollow Mine',
    locationType: 'dungeon',
    biome: 'underground',
    description:
      'An abandoned mine that descends deep into darkness. Strange sounds echo from below.',
    dangerLevel: 3,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.4, y: 0.45, variance: 0.05 },
    minConnections: 1,
    maxConnections: 2,
    floors: 5,
    bossName: 'The Burrower',
    rumors: [
      "Miners disappeared one by one. The last survivor spoke of 'eyes in the dark'.",
    ],
  },

  // ========== MID GAME ==========

  ironhold_town: {
    id: 'ironhold_town',
    name: 'Ironhold',
    locationType: 'town',
    biome: 'mountain',
    description:
      'A fortified mountain town known for its master blacksmiths and warrior tradition.',
    dangerLevel: 2,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.6, y: 0.4, variance: 0.08 },
    minConnections: 3,
    maxConnections: 5,
    hasInn: true,
    hasShop: true,
    hasBlacksmith: true,
    hasGuild: true,
    rumors: [
      'The guild master seeks warriors for an expedition to the cursed lands.',
      "Ironhold's weapons are the only ones that can harm shadow creatures.",
      'An ancient forge lies dormant beneath the town.',
    ],
    lore: 'Built into the mountainside, Ironhold has never fallen to siege. Its people are proud and suspicious of outsiders.',
  },

  serpent_pass: {
    id: 'serpent_pass',
    name: 'Serpent Pass',
    locationType: 'landmark',
    biome: 'mountain',
    description:
      'A treacherous mountain path that winds through dragon territory.',
    dangerLevel: 5,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.55, y: 0.3, variance: 0.05 },
    minConnections: 2,
    maxConnections: 2,
    rumors: [
      'A wyvern nests near the highest point of the pass.',
      'The pass was once guarded by an order of dragon knights.',
    ],
  },

  moonfall_ruins: {
    id: 'moonfall_ruins',
    name: 'Moonfall Ruins',
    locationType: 'ruins',
    biome: 'ruins',
    description:
      'The remains of a great city destroyed when a fragment of the moon fell to earth.',
    dangerLevel: 6,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.5, y: 0.25, variance: 0.08 },
    minConnections: 2,
    maxConnections: 4,
    rumors: [
      'The moonstone at the center still pulses with power.',
      'Ghosts of the fallen city wander at night.',
      'The key to the Infinite Tower lies buried here.',
    ],
    lore: 'Once called Selenara, City of Silver Light, it was destroyed in a single night when the heavens fell.',
  },

  // ========== LATE GAME ==========

  shadow_marsh: {
    id: 'shadow_marsh',
    name: 'Shadow Marsh',
    locationType: 'landmark',
    biome: 'swamp',
    description:
      'A cursed swampland where the boundary between worlds grows thin.',
    dangerLevel: 7,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.7, y: 0.35, variance: 0.1 },
    minConnections: 2,
    maxConnections: 3,
    rumors: [
      'The marsh swallows those who stray from the path.',
      'A witch lives at the heart of the marsh, neither alive nor dead.',
    ],
  },

  obsidian_fortress: {
    id: 'obsidian_fortress',
    name: 'Obsidian Fortress',
    locationType: 'dungeon',
    biome: 'mountain',
    description:
      'A dark fortress carved from volcanic glass. Home to the Shadow Legion.',
    dangerLevel: 8,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.75, y: 0.2, variance: 0.05 },
    minConnections: 1,
    maxConnections: 2,
    floors: 10,
    bossName: 'General Kuroken',
    rumors: [
      'The Shadow Legion commands an army of the damned.',
      'Defeating the general will weaken the defenses of the Infinite Tower.',
    ],
    lore: 'Built by the first Shadow Emperor, this fortress has stood for a thousand years.',
  },

  // ========== ENDGAME ==========

  cursed_threshold: {
    id: 'cursed_threshold',
    name: 'Cursed Threshold',
    locationType: 'landmark',
    biome: 'ruins',
    description:
      'The boundary of the cursed lands. Beyond lies only darkness and the tower.',
    dangerLevel: 8,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.85, y: 0.15, variance: 0.03 },
    minConnections: 2,
    maxConnections: 2,
    rumors: [
      'Those who cross the threshold are forever changed.',
      'The curse grows stronger the closer you get to the tower.',
    ],
  },

  infinite_tower: {
    id: 'infinite_tower',
    name: 'The Infinite Tower',
    locationType: 'tower',
    biome: 'ruins',
    description:
      'A tower that stretches endlessly into the sky. The source of all darkness.',
    dangerLevel: 10,
    isStoryRequired: true,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.9, y: 0.1, variance: 0.02 },
    minConnections: 1,
    maxConnections: 1,
    floors: 100,
    bossName: 'The Eternal Shadow',
    rumors: [
      'The tower has no end. It grows with each soul it claims.',
      'At the top waits the one who began the darkness.',
      'The tower tests those who enter. Few return.',
    ],
    lore: 'The Infinite Tower appeared when the seal was broken. It is said to be a bridge between worlds.',
  },

  // ========== OPTIONAL LOCATIONS ==========

  hermit_cave: {
    id: 'hermit_cave',
    name: "Hermit's Cave",
    locationType: 'cave',
    biome: 'mountain',
    description:
      'A secluded cave where a legendary swordmaster lives in exile.',
    dangerLevel: 2,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.25, y: 0.4, variance: 0.15 },
    minConnections: 1,
    maxConnections: 1,
    rumors: [
      'The hermit was once the greatest warrior in the empire.',
      'He teaches only those who prove their worth.',
    ],
  },

  spirit_grove: {
    id: 'spirit_grove',
    name: 'Spirit Grove',
    locationType: 'shrine',
    biome: 'forest',
    description: 'A sacred grove where nature spirits still dwell.',
    dangerLevel: 3,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.1, y: 0.45, variance: 0.1 },
    minConnections: 1,
    maxConnections: 2,
    hasShrine: true,
    rumors: [
      'The spirits can grant blessings to those who honor nature.',
      'A rare herb that cures any poison grows only here.',
    ],
  },

  bandit_hideout: {
    id: 'bandit_hideout',
    name: 'Crimson Fang Hideout',
    locationType: 'camp',
    biome: 'forest',
    description:
      'The hidden base of the Crimson Fang bandits. Heavily guarded.',
    dangerLevel: 4,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.45, y: 0.6, variance: 0.1 },
    minConnections: 1,
    maxConnections: 2,
    rumors: [
      'The Crimson Fang have been raiding caravans for months.',
      'Their leader was once a noble knight.',
    ],
  },

  sunken_temple: {
    id: 'sunken_temple',
    name: 'Sunken Temple',
    locationType: 'dungeon',
    biome: 'swamp',
    description:
      'An ancient temple half-submerged in the swamp. What secrets lie within?',
    dangerLevel: 5,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.6, y: 0.5, variance: 0.1 },
    minConnections: 1,
    maxConnections: 2,
    floors: 3,
    bossName: 'The Drowned Priest',
    rumors: [
      'The temple sank when its god was forgotten.',
      'Treasure hunters who enter never return.',
    ],
  },

  dragon_peak: {
    id: 'dragon_peak',
    name: 'Dragon Peak',
    locationType: 'landmark',
    biome: 'mountain',
    description:
      'The highest peak in the region. An ancient dragon is said to slumber here.',
    dangerLevel: 9,
    isStoryRequired: false,
    initialDiscoveryState: 'unknown',
    positionHint: { x: 0.4, y: 0.15, variance: 0.05 },
    minConnections: 1,
    maxConnections: 1,
    bossName: 'Ryujin, the Storm Dragon',
    rumors: [
      'The dragon has slept for centuries. Its awakening would be catastrophic.',
      "Those who brave the peak can claim a dragon's scale - if they survive.",
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all story locations as an array
 */
export function getStoryLocations(): StoryLocationDef[] {
  return Object.values(STORY_LOCATIONS);
}

/**
 * Get story locations by category (based on position hint)
 */
export function getLocationsByCategory(
  category: StoryLocationCategory
): StoryLocationDef[] {
  const locations = getStoryLocations();

  switch (category) {
    case 'starting_area':
      return locations.filter((l) => l.positionHint.y >= 0.7);
    case 'early_game':
      return locations.filter(
        (l) => l.positionHint.y >= 0.45 && l.positionHint.y < 0.7
      );
    case 'mid_game':
      return locations.filter(
        (l) => l.positionHint.y >= 0.25 && l.positionHint.y < 0.45
      );
    case 'late_game':
      return locations.filter(
        (l) => l.positionHint.y >= 0.15 && l.positionHint.y < 0.25
      );
    case 'endgame':
      return locations.filter((l) => l.positionHint.y < 0.15);
    case 'optional':
      return locations.filter((l) => !l.isStoryRequired);
    default:
      return locations;
  }
}

/**
 * Get required story locations in progression order
 */
export function getStoryProgression(): StoryLocationDef[] {
  return getStoryLocations()
    .filter((l) => l.isStoryRequired)
    .sort((a, b) => {
      // Sort by y position (south to north progression)
      return b.positionHint.y - a.positionHint.y;
    });
}

/**
 * Get locations by type
 */
export function getLocationsByType(type: LocationType): StoryLocationDef[] {
  return getStoryLocations().filter((l) => l.locationType === type);
}

/**
 * Get locations by biome
 */
export function getLocationsByBiome(biome: BiomeType): StoryLocationDef[] {
  return getStoryLocations().filter((l) => l.biome === biome);
}

/**
 * Get location's actual world position from region bounds
 */
export function calculateWorldPosition(
  location: StoryLocationDef,
  regionBounds: { x: number; y: number; width: number; height: number },
  random?: { nextFloat: (min: number, max: number) => number }
): Vector2 {
  const variance = location.positionHint.variance;

  let offsetX = 0;
  let offsetY = 0;

  if (random && variance > 0) {
    offsetX = random.nextFloat(-variance, variance);
    offsetY = random.nextFloat(-variance, variance);
  }

  return {
    x:
      regionBounds.x +
      (location.positionHint.x + offsetX) * regionBounds.width,
    y:
      regionBounds.y +
      (location.positionHint.y + offsetY) * regionBounds.height,
  };
}
