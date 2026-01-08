// RegionGenerator - Creates zones and locations for the map
// Uses fixed story locations + procedural minor locations

import type {
  MapRegion,
  MapZone,
  MapLocation,
  LocationType,
  BiomeType,
  DiscoveryState,
  ThreatType,
  Bounds,
  Vector2,
} from '@/types';
import {
  getStoryLocations,
  calculateWorldPosition,
} from '@/data/storyLocations';
import { SeededRandom } from './SeededRandom';

// ============================================
// GENERATION CONFIG
// ============================================

export interface RegionGenerationConfig {
  seed: string | number;
  bounds: Bounds;
  regionName: string;

  // Zone generation
  zoneCount: number;
  minZoneSize: number;

  // Location generation
  minorLocationCount: number;
  minLocationSpacing: number;

  // Optional: specific story locations to include
  includeStoryLocations?: string[];
}

// ============================================
// ZONE TEMPLATES
// ============================================

interface ZoneTemplate {
  name: string;
  biome: BiomeType;
  dangerBase: number;
  locationTypes: LocationType[];
  threats: ThreatType[];
  weight: number;
}

const ZONE_TEMPLATES: ZoneTemplate[] = [
  {
    name: 'Whispering Woods',
    biome: 'forest',
    dangerBase: 2,
    locationTypes: ['village', 'shrine', 'camp', 'ruins'],
    threats: ['beasts', 'bandits'],
    weight: 3,
  },
  {
    name: 'Iron Mountains',
    biome: 'mountain',
    dangerBase: 4,
    locationTypes: ['cave', 'landmark', 'crossing', 'camp'],
    threats: ['beasts', 'elementals'],
    weight: 2,
  },
  {
    name: 'Golden Plains',
    biome: 'plains',
    dangerBase: 1,
    locationTypes: ['town', 'village', 'crossing', 'camp'],
    threats: ['bandits'],
    weight: 2,
  },
  {
    name: 'Mire of Shadows',
    biome: 'swamp',
    dangerBase: 5,
    locationTypes: ['ruins', 'shrine', 'landmark'],
    threats: ['undead', 'beasts'],
    weight: 1,
  },
  {
    name: 'Scorched Wastes',
    biome: 'desert',
    dangerBase: 4,
    locationTypes: ['ruins', 'camp', 'landmark', 'cave'],
    threats: ['elementals', 'beasts'],
    weight: 1,
  },
  {
    name: 'Forgotten Ruins',
    biome: 'ruins',
    dangerBase: 6,
    locationTypes: ['ruins', 'dungeon', 'shrine'],
    threats: ['undead', 'demons'],
    weight: 1,
  },
];

// ============================================
// MINOR LOCATION NAMES
// ============================================

const LOCATION_NAME_PREFIXES: Record<BiomeType, string[]> = {
  forest: ['Mossy', 'Hidden', 'Ancient', 'Wild', 'Shadowed', 'Misty'],
  mountain: ['Stone', 'High', 'Frozen', 'Rocky', 'Wind-swept', 'Iron'],
  plains: ['Rolling', 'Golden', 'Sunny', 'Quiet', 'Wanderer\'s', 'Traveler\'s'],
  swamp: ['Murky', 'Cursed', 'Rotting', 'Fog-bound', 'Dark', 'Sunken'],
  desert: ['Burning', 'Sand-worn', 'Lost', 'Scorched', 'Dust', 'Sun-bleached'],
  ruins: ['Crumbling', 'Forgotten', 'Haunted', 'Abandoned', 'Ancient', 'Broken'],
  underground: ['Deep', 'Dark', 'Echo', 'Crystal', 'Shadow', 'Lost'],
};

const LOCATION_NAME_SUFFIXES: Record<LocationType, string[]> = {
  town: ['Town', 'Settlement', 'Haven'],
  village: ['Village', 'Hamlet', 'Settlement'],
  ruins: ['Ruins', 'Remnants', 'Remains'],
  dungeon: ['Depths', 'Dungeon', 'Catacombs'],
  shrine: ['Shrine', 'Altar', 'Sanctuary'],
  camp: ['Camp', 'Outpost', 'Rest'],
  landmark: ['Point', 'Vista', 'Mark'],
  crossing: ['Crossing', 'Junction', 'Fork'],
  cave: ['Cave', 'Grotto', 'Cavern'],
  tower: ['Tower', 'Spire', 'Pinnacle'],
};

// ============================================
// REGION GENERATOR CLASS
// ============================================

export class RegionGenerator {
  private rng: SeededRandom;
  private config: RegionGenerationConfig;

  // Generated data
  private region: MapRegion | null = null;
  private zones: MapZone[] = [];
  private locations: MapLocation[] = [];
  private zoneTemplates: Map<string, ZoneTemplate> = new Map();

  constructor(config: RegionGenerationConfig) {
    this.config = config;
    this.rng = new SeededRandom(config.seed);
  }

  // ============================================
  // MAIN GENERATION
  // ============================================

  public generate(): {
    region: MapRegion;
    zones: MapZone[];
    locations: MapLocation[];
  } {
    // Step 1: Generate zones (without locations yet)
    this.zones = this.generateZones();

    // Step 2: Place story locations
    this.placeStoryLocations();

    // Step 3: Generate minor locations
    this.generateMinorLocations();

    // Step 4: Assign locations to zones
    this.assignLocationsToZones();

    // Step 5: Create region
    this.region = this.generateRegion();

    return {
      region: this.region,
      zones: this.zones,
      locations: this.locations,
    };
  }

  // ============================================
  // REGION GENERATION
  // ============================================

  private generateRegion(): MapRegion {
    const seedNum = typeof this.config.seed === 'number'
      ? this.config.seed
      : this.hashString(this.config.seed);

    return {
      id: `region_${seedNum}`,
      seed: seedNum,
      name: this.config.regionName,
      bounds: { ...this.config.bounds },
      zones: this.zones,
      generatedAt: Date.now(),
    };
  }

  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  // ============================================
  // ZONE GENERATION
  // ============================================

  private generateZones(): MapZone[] {
    const zones: MapZone[] = [];
    const { bounds, zoneCount } = this.config;

    // Use Voronoi-like approach: place zone centers, then assign regions
    const zoneCenters: { center: Vector2; template: ZoneTemplate }[] = [];

    // Generate zone centers with good spacing
    const gridCols = Math.ceil(Math.sqrt(zoneCount * (bounds.width / bounds.height)));
    const gridRows = Math.ceil(zoneCount / gridCols);
    const cellWidth = bounds.width / gridCols;
    const cellHeight = bounds.height / gridRows;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (zoneCenters.length >= zoneCount) break;

        // Randomize position within cell
        const centerX =
          bounds.x +
          col * cellWidth +
          this.rng.nextFloat(cellWidth * 0.2, cellWidth * 0.8);
        const centerY =
          bounds.y +
          row * cellHeight +
          this.rng.nextFloat(cellHeight * 0.2, cellHeight * 0.8);

        // Pick template based on position (biome distribution)
        const template = this.pickZoneTemplate(centerY / bounds.height);

        zoneCenters.push({
          center: { x: centerX, y: centerY },
          template,
        });
      }
    }

    // Calculate zone bounds using Voronoi-like approach
    for (let i = 0; i < zoneCenters.length; i++) {
      const { center, template } = zoneCenters[i];

      // Simple rectangular bounds based on nearest neighbors
      const zoneBounds = this.calculateZoneBounds(center, zoneCenters, i);

      // Generate unique zone name
      const zoneName = this.generateZoneName(template);

      // Store template for later use
      const zoneId = `zone_${i}`;
      this.zoneTemplates.set(zoneId, template);

      // Calculate adjacent zones
      const adjacentZoneIds = this.calculateAdjacentZones(i, zoneCenters);

      zones.push({
        id: zoneId,
        regionId: `region_${this.config.seed}`,
        name: zoneName,
        biome: template.biome,
        bounds: zoneBounds,
        locations: [], // Will be filled later
        dangerLevel: Math.max(1, Math.min(10, template.dangerBase + this.rng.nextInt(-1, 1))),
        discoveryState: 'unknown',
        adjacentZoneIds,
        ambientThreat: template.threats,
      });
    }

    return zones;
  }

  private pickZoneTemplate(normalizedY: number): ZoneTemplate {
    // Bias biome selection by position (south = safer, north = dangerous)
    const dangerBias = (1 - normalizedY) * 3; // 0-3 danger bonus for northern areas

    // Weight templates based on danger appropriateness
    const weightedTemplates = ZONE_TEMPLATES.map((t) => {
      let adjustedWeight = t.weight;

      // Increase weight for templates matching position danger
      if (Math.abs(t.dangerBase - dangerBias - 2) < 2) {
        adjustedWeight *= 2;
      }

      return { template: t, weight: adjustedWeight };
    });

    const totalWeight = weightedTemplates.reduce((sum, w) => sum + w.weight, 0);
    let random = this.rng.next() * totalWeight;

    for (const { template, weight } of weightedTemplates) {
      random -= weight;
      if (random <= 0) {
        return template;
      }
    }

    return ZONE_TEMPLATES[0];
  }

  private calculateZoneBounds(
    center: Vector2,
    allCenters: { center: Vector2 }[],
    currentIndex: number
  ): Bounds {
    const { bounds, minZoneSize } = this.config;

    // Find distances to other zone centers
    let minDistX = bounds.width / 2;
    let minDistY = bounds.height / 2;

    for (let i = 0; i < allCenters.length; i++) {
      if (i === currentIndex) continue;

      const other = allCenters[i].center;
      const dx = Math.abs(other.x - center.x);
      const dy = Math.abs(other.y - center.y);

      if (dx < minDistX * 2) minDistX = Math.min(minDistX, dx / 2);
      if (dy < minDistY * 2) minDistY = Math.min(minDistY, dy / 2);
    }

    // Ensure minimum size
    minDistX = Math.max(minDistX, minZoneSize / 2);
    minDistY = Math.max(minDistY, minZoneSize / 2);

    // Clamp to region bounds
    const x = Math.max(bounds.x, center.x - minDistX);
    const y = Math.max(bounds.y, center.y - minDistY);
    const width = Math.min(minDistX * 2, bounds.x + bounds.width - x);
    const height = Math.min(minDistY * 2, bounds.y + bounds.height - y);

    return { x, y, width, height };
  }

  private calculateAdjacentZones(
    currentIndex: number,
    zoneCenters: { center: Vector2 }[]
  ): string[] {
    const current = zoneCenters[currentIndex].center;
    const adjacent: string[] = [];
    const maxDistance = Math.max(
      this.config.bounds.width,
      this.config.bounds.height
    ) / 2;

    for (let i = 0; i < zoneCenters.length; i++) {
      if (i === currentIndex) continue;

      const other = zoneCenters[i].center;
      const dx = other.x - current.x;
      const dy = other.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance) {
        adjacent.push(`zone_${i}`);
      }
    }

    return adjacent;
  }

  private generateZoneName(template: ZoneTemplate): string {
    // Add variation to template name
    const variants = ['', 'Northern ', 'Southern ', 'Eastern ', 'Western ', 'Central '];
    const variant = this.rng.pick(variants);
    return `${variant}${template.name}`;
  }

  // ============================================
  // STORY LOCATION PLACEMENT
  // ============================================

  private placeStoryLocations(): void {
    const storyLocations = this.config.includeStoryLocations
      ? getStoryLocations().filter((l) =>
          this.config.includeStoryLocations!.includes(l.id)
        )
      : getStoryLocations();

    for (const storyLoc of storyLocations) {
      const position = calculateWorldPosition(
        storyLoc,
        this.config.bounds,
        this.rng
      );

      // Find nearest zone
      const zone = this.findNearestZone(position);

      const location: MapLocation = {
        id: storyLoc.id,
        zoneId: zone?.id ?? 'zone_0',
        name: storyLoc.name,
        locationType: storyLoc.locationType,
        position,
        discoveryState: storyLoc.initialDiscoveryState,
        connectedTo: [],
        isInteractable: true,
        hasActiveEvent: false,
      };

      this.locations.push(location);
    }
  }

  // ============================================
  // MINOR LOCATION GENERATION
  // ============================================

  private generateMinorLocations(): void {
    const { minorLocationCount, minLocationSpacing, bounds } = this.config;

    let attempts = 0;
    const maxAttempts = minorLocationCount * 10;
    const storyLocationCount = getStoryLocations().length;

    while (
      this.locations.length < storyLocationCount + minorLocationCount &&
      attempts < maxAttempts
    ) {
      attempts++;

      // Generate random position
      const position = {
        x: this.rng.nextFloat(bounds.x + 50, bounds.x + bounds.width - 50),
        y: this.rng.nextFloat(bounds.y + 50, bounds.y + bounds.height - 50),
      };

      // Check spacing from existing locations
      if (!this.isValidLocationPosition(position, minLocationSpacing)) {
        continue;
      }

      // Find zone for this position
      const zone = this.findNearestZone(position);
      if (!zone) continue;

      // Get zone template for location type options
      const zoneTemplate = this.zoneTemplates.get(zone.id);
      if (!zoneTemplate) continue;

      const locationType = this.rng.pick(zoneTemplate.locationTypes);
      const name = this.generateLocationName(zone.biome, locationType);

      const location: MapLocation = {
        id: `loc_${this.locations.length}`,
        zoneId: zone.id,
        name,
        locationType,
        position,
        discoveryState: 'unknown' as DiscoveryState,
        connectedTo: [],
        isInteractable: true,
        hasActiveEvent: false,
      };

      this.locations.push(location);
    }
  }

  private isValidLocationPosition(
    position: Vector2,
    minSpacing: number
  ): boolean {
    for (const existing of this.locations) {
      const dx = existing.position.x - position.x;
      const dy = existing.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minSpacing) {
        return false;
      }
    }
    return true;
  }

  private generateLocationName(
    biome: BiomeType,
    locationType: LocationType
  ): string {
    const prefixes = LOCATION_NAME_PREFIXES[biome] || LOCATION_NAME_PREFIXES.forest;
    const suffixes = LOCATION_NAME_SUFFIXES[locationType] || ['Place'];

    const prefix = this.rng.pick(prefixes);
    const suffix = this.rng.pick(suffixes);

    return `${prefix} ${suffix}`;
  }

  // ============================================
  // ZONE ASSIGNMENT
  // ============================================

  private assignLocationsToZones(): void {
    for (const location of this.locations) {
      const zone = this.zones.find((z) => z.id === location.zoneId);
      if (zone) {
        const existingIds = zone.locations.map(l => l.id);
        if (!existingIds.includes(location.id)) {
          zone.locations.push(location);
        }
      }
    }
  }

  private findNearestZone(position: Vector2): MapZone | null {
    let nearestZone: MapZone | null = null;
    let nearestDistance = Infinity;

    for (const zone of this.zones) {
      const centerX = zone.bounds.x + zone.bounds.width / 2;
      const centerY = zone.bounds.y + zone.bounds.height / 2;
      const dx = position.x - centerX;
      const dy = position.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestZone = zone;
      }
    }

    return nearestZone;
  }

  // ============================================
  // UTILITIES
  // ============================================

  public getLocations(): MapLocation[] {
    return [...this.locations];
  }

  public getZones(): MapZone[] {
    return [...this.zones];
  }

  public getRegion(): MapRegion | null {
    return this.region;
  }

  /**
   * Get a location by ID
   */
  public getLocation(id: string): MapLocation | undefined {
    return this.locations.find((l) => l.id === id);
  }

  /**
   * Get locations within a zone
   */
  public getLocationsInZone(zoneId: string): MapLocation[] {
    return this.locations.filter((l) => l.zoneId === zoneId);
  }

  /**
   * Get the RNG for further procedural generation
   */
  public getRng(): SeededRandom {
    return this.rng;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createDefaultRegionConfig(
  seed: string | number
): RegionGenerationConfig {
  return {
    seed,
    bounds: { x: 0, y: 0, width: 2000, height: 2000 },
    regionName: 'The Cursed Lands',
    zoneCount: 8,
    minZoneSize: 200,
    minorLocationCount: 15,
    minLocationSpacing: 100,
  };
}
