// TypeScript Type Definitions

// Item Rarity
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Item Categories
export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'material' | 'quest' | 'misc';

// Menu Screens
export type MenuScreen = 'none' | 'pause' | 'settings' | 'character';

// Settings Tabs
export type SettingsTab = 'graphics' | 'audio' | 'controls' | 'gameplay';

// Inventory View Mode
export type ViewMode = 'grid' | 'list';

// Item interface
export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ItemCategory;
  rarity: ItemRarity;
  stackable: boolean;
  maxStack: number;
  stats?: Record<string, number>;
  effect?: string;
}

// Inventory Slot
export interface InventorySlot {
  item: Item | null;
  quantity: number;
}

// Dialogue Choice
export interface DialogueChoice {
  id: string;
  text: string;
  nextDialogueId?: string;
  action?: string;
}

// Dialogue Line
export interface DialogueLine {
  id: string;
  speaker: string;
  portrait?: string;
  text: string;
  choices?: DialogueChoice[];
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
}

// Player Stats
export interface PlayerStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
}

// Settings
export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiScale: number;
  showDamageNumbers: boolean;
  screenShake: boolean;
}

// Enemy Target
export interface EnemyTarget {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
}
