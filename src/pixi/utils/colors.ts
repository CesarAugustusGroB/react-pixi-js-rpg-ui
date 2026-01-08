// Map Color Palette - Modern Clean Design
// Catppuccin-inspired soft colors with high contrast accents
// Design tokens for the travel map visual system

import type { DiscoveryState, BiomeType, LocationType, TimeOfDay } from '@/types';

// ============================================
// BASE COLORS - Catppuccin Mocha Inspired
// ============================================

export const COLORS = {
  // Background - Deep, rich dark tones
  BACKGROUND: 0x1e1e2e,        // Catppuccin base
  BACKGROUND_DARK: 0x11111b,   // Catppuccin crust
  BACKGROUND_SURFACE: 0x313244, // Catppuccin surface0
  BACKGROUND_OVERLAY: 0x45475a, // Catppuccin surface1

  // Fog of war - Gradient from hidden to revealed
  FOG_HIDDEN: 0x11111b,
  FOG_RUMORED: 0x313244,
  FOG_DISCOVERED: 0x45475a,

  // Paths - Clean, readable colors
  PATH_UNKNOWN: 0x45475a,      // Muted gray
  PATH_BASE: 0x585b70,         // Subtle base
  PATH_SAFE: 0xa6e3a1,         // Soft green
  PATH_DANGEROUS: 0xf38ba8,    // Soft red
  PATH_BLOCKED: 0x6c7086,      // Disabled gray
  PATH_TRAVEL_ACTIVE: 0xf9e2af, // Golden yellow
  PATH_GLOW: 0x89b4fa,         // Blue glow for highlights

  // Location states - Clear visual progression
  LOCATION_UNKNOWN: 0x45475a,   // Gray, barely visible
  LOCATION_RUMORED: 0x7f849c,   // Light gray with hint
  LOCATION_DISCOVERED: 0x94e2d5, // Teal - clearly visible
  LOCATION_VISITED: 0x89b4fa,    // Blue - fully explored
  LOCATION_CURRENT: 0xf9e2af,    // Golden yellow - player here
  LOCATION_SELECTED: 0xf5c2e7,   // Pink highlight
  LOCATION_HOVER: 0xcdd6f4,      // Bright white-ish

  // Location types - Distinctive, modern palette
  VILLAGE: 0xa6e3a1,     // Soft green
  TOWN: 0x89b4fa,        // Soft blue
  CITY: 0xcba6f7,        // Soft purple
  DUNGEON: 0xf38ba8,     // Soft red
  SHRINE: 0x94e2d5,      // Teal
  CAMP: 0xfab387,        // Soft orange/peach
  RUINS: 0xa6adc8,       // Lavender gray
  CAVE: 0x6c7086,        // Dark gray
  TOWER: 0xb4befe,       // Lavender
  FORTRESS: 0x74c7ec,    // Sapphire
  CROSSROADS: 0x9399b2,  // Overlay2
  LANDMARK: 0xf9e2af,    // Yellow
  HIDDEN: 0x585b70,      // Surface2

  // Events - Vibrant but not harsh
  EVENT_CARAVAN: 0xf9e2af,    // Golden
  EVENT_RAID: 0xf38ba8,       // Red alert
  EVENT_FESTIVAL: 0xf5c2e7,   // Pink celebration
  EVENT_STORM: 0x74c7ec,      // Blue storm
  EVENT_BEAST: 0xa6e3a1,      // Green nature
  EVENT_PILGRIMAGE: 0x94e2d5, // Teal spiritual

  // UI - Clean, readable
  UI_TEXT: 0xcdd6f4,          // Primary text
  UI_TEXT_SECONDARY: 0xa6adc8, // Secondary text
  UI_TEXT_DIM: 0x6c7086,      // Muted text
  UI_BORDER: 0x45475a,        // Subtle borders
  UI_PANEL: 0x313244,         // Panel backgrounds
  UI_PANEL_HOVER: 0x45475a,   // Hover state
  UI_HIGHLIGHT: 0xf9e2af,     // Golden highlights
  UI_SUCCESS: 0xa6e3a1,       // Green success
  UI_ERROR: 0xf38ba8,         // Red error
  UI_WARNING: 0xfab387,       // Orange warning

  // Player - Stand out clearly
  PLAYER_MARKER: 0xf9e2af,    // Golden yellow
  PLAYER_TRAIL: 0xfab387,     // Orange trail
  PLAYER_GLOW: 0xf9e2af,      // Matching glow

  // Danger levels - Intuitive gradient
  DANGER_SAFE: 0xa6e3a1,      // Green
  DANGER_LOW: 0x94e2d5,       // Teal
  DANGER_MEDIUM: 0xf9e2af,    // Yellow
  DANGER_HIGH: 0xfab387,      // Orange
  DANGER_EXTREME: 0xf38ba8,   // Red

  // Accent colors for effects
  ACCENT_PRIMARY: 0x89b4fa,   // Blue
  ACCENT_SECONDARY: 0xa6e3a1, // Green
  ACCENT_TERTIARY: 0xf5c2e7,  // Pink
  GLOW_COLOR: 0x89b4fa,       // Default glow
  HIGHLIGHT_COLOR: 0xf9e2af,  // Golden highlight

  // Additional accent colors for NPCs
  ACCENT_YELLOW: 0xf9e2af,    // Golden yellow
  ACCENT_ORANGE: 0xfab387,    // Soft orange
  ACCENT_BLUE: 0x89b4fa,      // Blue
  ACCENT_GREEN: 0xa6e3a1,     // Green
  ACCENT_RED: 0xf38ba8,       // Red

  // Semantic colors
  DANGER: 0xf38ba8,           // Red for danger
  WARNING: 0xfab387,          // Orange for warning
  SUCCESS: 0xa6e3a1,          // Green for success
  INFO: 0x89b4fa,             // Blue for info
} as const;

// ============================================
// COLOR MAPPING FUNCTIONS
// ============================================

export function getDiscoveryColor(state: DiscoveryState): number {
  switch (state) {
    case 'unknown': return COLORS.LOCATION_UNKNOWN;
    case 'rumored': return COLORS.LOCATION_RUMORED;
    case 'discovered': return COLORS.LOCATION_DISCOVERED;
    case 'visited': return COLORS.LOCATION_VISITED;
    default: return COLORS.LOCATION_UNKNOWN;
  }
}

export function getLocationTypeColor(type: LocationType): number {
  const colorMap: Record<LocationType, number> = {
    village: COLORS.VILLAGE,
    town: COLORS.TOWN,
    dungeon: COLORS.DUNGEON,
    shrine: COLORS.SHRINE,
    camp: COLORS.CAMP,
    ruins: COLORS.RUINS,
    cave: COLORS.CAVE,
    tower: COLORS.TOWER,
    landmark: COLORS.LANDMARK,
    crossing: COLORS.CROSSROADS,
  };
  return colorMap[type] ?? COLORS.LOCATION_UNKNOWN;
}

export function getBiomeColor(biome: BiomeType): number {
  const colorMap: Record<BiomeType, number> = {
    forest: 0x228b22,
    plains: 0x90ee90,
    mountain: 0x708090,
    swamp: 0x556b2f,
    desert: 0xdeb887,
    ruins: 0x795548,
    underground: 0x4a4a6a,
  };
  return colorMap[biome] ?? 0x808080;
}

export function getDangerColor(dangerLevel: number): number {
  if (dangerLevel <= 0.2) return COLORS.DANGER_SAFE;
  if (dangerLevel <= 0.4) return COLORS.DANGER_LOW;
  if (dangerLevel <= 0.6) return COLORS.DANGER_MEDIUM;
  if (dangerLevel <= 0.8) return COLORS.DANGER_HIGH;
  return COLORS.DANGER_EXTREME;
}

export function getTimeOfDayTint(timeOfDay: TimeOfDay): number {
  switch (timeOfDay) {
    case 'dawn': return 0xffccaa;
    case 'morning': return 0xfffef0;
    case 'afternoon': return 0xffffff;
    case 'dusk': return 0xffaa88;
    case 'evening': return 0x8888cc;
    case 'night': return 0x4444aa;
    default: return 0xffffff;
  }
}

// ============================================
// COLOR UTILITIES
// ============================================

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

export function lerpColor(color1: number, color2: number, t: number): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  return rgbToHex(r, g, b);
}

export function adjustBrightness(color: number, factor: number): number {
  const rgb = hexToRgb(color);
  return rgbToHex(
    Math.min(255, Math.round(rgb.r * factor)),
    Math.min(255, Math.round(rgb.g * factor)),
    Math.min(255, Math.round(rgb.b * factor))
  );
}

export function withAlpha(color: number, alpha: number): number {
  return (Math.round(alpha * 255) << 24) | color;
}
