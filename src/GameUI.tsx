import React, { useEffect, useRef } from 'react';
import { HealthManaBar } from '@components/hud';
import { DialogueBox } from '@components/dialogue';
import { InventoryPanel } from '@components/inventory';
import { PauseMenu, SettingsMenu, CharacterSheet } from '@components/menus';
import { MapContainer } from '@components/map';
import { usePlayerStore } from '@stores/playerStore';
import { useDialogueStore } from '@stores/dialogueStore';
import { useInventoryStore } from '@stores/inventoryStore';
import { useMenuStore, selectIsMenuOpen } from '@stores/menuStore';
import { useMapStore, selectIsMapOpen } from '@stores/mapStore';
import { useMapBridgeSync } from '@integration/useMapBridgeSync';
import type { DialogueLine, Item, ItemCategory, ItemRarity } from '@/types';
import type { MapRegion, MapZone, MapLocation, Path } from '@/types/map';
import styles from './GameUI.module.css';

// Demo map data
const createDemoMapData = () => {
  const region: MapRegion = {
    id: 'demo-region',
    seed: 42,
    name: 'The Wandering Lands',
    bounds: { x: 0, y: 0, width: 1000, height: 800 },
    zones: [],
    generatedAt: Date.now(),
  };

  const zones: Record<string, MapZone> = {
    'zone-forest': {
      id: 'zone-forest',
      regionId: 'demo-region',
      name: 'Whispering Woods',
      biome: 'forest',
      bounds: { x: 0, y: 0, width: 500, height: 400 },
      locations: [],
      dangerLevel: 3,
      discoveryState: 'discovered',
      adjacentZoneIds: ['zone-plains'],
      ambientThreat: ['beasts'],
    },
    'zone-plains': {
      id: 'zone-plains',
      regionId: 'demo-region',
      name: 'Golden Plains',
      biome: 'plains',
      bounds: { x: 500, y: 0, width: 500, height: 400 },
      locations: [],
      dangerLevel: 2,
      discoveryState: 'discovered',
      adjacentZoneIds: ['zone-forest'],
      ambientThreat: ['bandits'],
    },
  };

  const locations: Record<string, MapLocation> = {
    'loc-village': {
      id: 'loc-village',
      zoneId: 'zone-forest',
      name: 'Eldergrove Village',
      locationType: 'village',
      position: { x: 150, y: 200 },
      discoveryState: 'visited',
      connectedTo: [
        {
          targetLocationId: 'loc-shrine',
          pathId: 'path-village-shrine',
          travelTime: 30,
          dangerModifier: 1.2,
          pathType: 'road',
          discoveryState: 'visited',
        },
        {
          targetLocationId: 'loc-town',
          pathId: 'path-village-town',
          travelTime: 45,
          dangerModifier: 1.0,
          pathType: 'road',
          discoveryState: 'discovered',
        },
      ],
      isInteractable: true,
      hasActiveEvent: false,
      actualData: {
        description: 'A peaceful village nestled among ancient trees.',
        npcs: ['elder', 'merchant'],
        availableServices: ['rest', 'trade'],
        lootTable: 'village_common',
        encounterTable: 'none',
        specialFlags: ['safe_zone', 'respawn_point'],
      },
    },
    'loc-shrine': {
      id: 'loc-shrine',
      zoneId: 'zone-forest',
      name: 'Moonlit Shrine',
      locationType: 'shrine',
      position: { x: 300, y: 150 },
      discoveryState: 'discovered',
      connectedTo: [
        {
          targetLocationId: 'loc-village',
          pathId: 'path-village-shrine',
          travelTime: 30,
          dangerModifier: 1.2,
          pathType: 'road',
          discoveryState: 'visited',
        },
      ],
      isInteractable: true,
      hasActiveEvent: false,
      actualData: {
        description: 'An ancient shrine bathed in eternal moonlight.',
        npcs: ['shrine_keeper'],
        availableServices: ['heal', 'quest'],
        lootTable: 'shrine_rare',
        encounterTable: 'none',
        specialFlags: ['safe_zone'],
      },
    },
    'loc-town': {
      id: 'loc-town',
      zoneId: 'zone-plains',
      name: 'Sunhaven Town',
      locationType: 'town',
      position: { x: 600, y: 250 },
      discoveryState: 'discovered',
      connectedTo: [
        {
          targetLocationId: 'loc-village',
          pathId: 'path-village-town',
          travelTime: 45,
          dangerModifier: 1.0,
          pathType: 'road',
          discoveryState: 'discovered',
        },
        {
          targetLocationId: 'loc-dungeon',
          pathId: 'path-town-dungeon',
          travelTime: 60,
          dangerModifier: 2.0,
          pathType: 'trail',
          discoveryState: 'rumored',
        },
      ],
      isInteractable: true,
      hasActiveEvent: false,
      actualData: {
        description: 'A bustling trading town at the crossroads.',
        npcs: ['mayor', 'blacksmith', 'innkeeper'],
        availableServices: ['rest', 'trade', 'craft', 'storage'],
        lootTable: 'town_market',
        encounterTable: 'none',
        specialFlags: ['safe_zone', 'respawn_point'],
      },
    },
    'loc-dungeon': {
      id: 'loc-dungeon',
      zoneId: 'zone-plains',
      name: 'Forgotten Crypt',
      locationType: 'dungeon',
      position: { x: 800, y: 350 },
      discoveryState: 'rumored',
      connectedTo: [
        {
          targetLocationId: 'loc-town',
          pathId: 'path-town-dungeon',
          travelTime: 60,
          dangerModifier: 2.0,
          pathType: 'trail',
          discoveryState: 'rumored',
        },
      ],
      isInteractable: true,
      hasActiveEvent: false,
      rumor: {
        id: 'rumor-crypt',
        targetLocationId: 'loc-dungeon',
        vagueName: 'The Old Crypt',
        vagueDescription: 'They say there\'s an old crypt filled with treasure...',
        vagueLocationType: 'dungeon',
        source: 'npc_dialogue',
        sourceId: 'innkeeper-001',
        sourceDetail: 'A drunk traveler at the inn',
        acquiredAt: Date.now(),
        reliability: 0.7,
        distortion: {
          nameAccurate: true,
          typeAccurate: true,
          positionOffset: { x: 20, y: -15 },
          dangerAccurate: false,
          lootExaggeration: 1.5,
        },
      },
    },
  };

  const paths: Record<string, Path> = {
    'path-village-shrine': {
      id: 'path-village-shrine',
      points: [
        { x: 150, y: 200 },
        { x: 200, y: 170 },
        { x: 250, y: 160 },
        { x: 300, y: 150 },
      ],
      sourceId: 'loc-village',
      targetId: 'loc-shrine',
      pathType: 'road',
      discoveryState: 'visited',
    },
    'path-village-town': {
      id: 'path-village-town',
      points: [
        { x: 150, y: 200 },
        { x: 300, y: 220 },
        { x: 450, y: 240 },
        { x: 600, y: 250 },
      ],
      sourceId: 'loc-village',
      targetId: 'loc-town',
      pathType: 'road',
      discoveryState: 'discovered',
    },
    'path-town-dungeon': {
      id: 'path-town-dungeon',
      points: [
        { x: 600, y: 250 },
        { x: 680, y: 280 },
        { x: 740, y: 320 },
        { x: 800, y: 350 },
      ],
      sourceId: 'loc-town',
      targetId: 'loc-dungeon',
      pathType: 'trail',
      discoveryState: 'rumored',
    },
  };

  return { region, zones, locations, paths, startingLocationId: 'loc-village' };
};

// Demo dialogue data
const demoDialogue: DialogueLine[] = [
  {
    id: '1',
    speaker: 'Elder Sage',
    text: 'Welcome, young adventurer. The path ahead is fraught with danger, but I sense great potential within you.',
  },
  {
    id: '2',
    speaker: 'Elder Sage',
    text: 'Before you embark on your journey, you must make a choice that will shape your destiny.',
    choices: [
      { id: 'warrior', text: 'I will walk the path of the warrior.', action: 'select_warrior' },
      { id: 'mage', text: 'I seek the arcane arts.', action: 'select_mage' },
      { id: 'rogue', text: 'Shadows are my domain.', action: 'select_rogue' },
    ],
  },
];

const demoDialogueSimple: DialogueLine[] = [
  {
    id: '1',
    speaker: 'Mysterious Stranger',
    text: 'The tower holds many secrets... Some are better left undiscovered.',
  },
  {
    id: '2',
    speaker: 'Mysterious Stranger',
    text: 'But you seem determined. Very well, take this - it may help you on your journey.',
  },
  {
    id: '3',
    speaker: 'Mysterious Stranger',
    text: 'Farewell, adventurer. May fortune favor the bold.',
  },
];

// Demo inventory items
const createDemoItem = (
  id: string,
  name: string,
  category: ItemCategory,
  rarity: ItemRarity,
  description: string,
  icon: string,
  stackable: boolean = false,
  stats?: Item['stats']
): Item => ({
  id,
  name,
  category,
  rarity,
  description,
  icon,
  stackable,
  maxStack: stackable ? 99 : 1,
  stats,
});

const demoItems: { item: Item; quantity: number }[] = [
  // Weapons
  {
    item: createDemoItem('sword_iron', 'Iron Sword', 'weapon', 'common', 'A sturdy iron blade. Nothing fancy, but reliable.', '⚔️', false, { attack: 12 }),
    quantity: 1,
  },
  {
    item: createDemoItem('bow_hunter', "Hunter's Bow", 'weapon', 'uncommon', 'A finely crafted bow favored by skilled hunters.', '🏹', false, { attack: 15, critChance: 5 }),
    quantity: 1,
  },
  {
    item: createDemoItem('staff_arcane', 'Arcane Staff', 'weapon', 'rare', 'Imbued with magical essence. Crackles with energy.', '🪄', false, { attack: 8, magicPower: 25 }),
    quantity: 1,
  },
  {
    item: createDemoItem('dagger_shadow', 'Shadow Dagger', 'weapon', 'epic', 'Forged in darkness, this blade finds its mark unseen.', '🗡️', false, { attack: 18, critChance: 15, critDamage: 50 }),
    quantity: 1,
  },
  // Armor
  {
    item: createDemoItem('helm_steel', 'Steel Helm', 'armor', 'common', 'Basic head protection for any adventurer.', '🪖', false, { defense: 8 }),
    quantity: 1,
  },
  {
    item: createDemoItem('chest_knight', "Knight's Chestplate", 'armor', 'rare', 'Heavy armor bearing the crest of a fallen kingdom.', '🛡️', false, { defense: 25, maxHealth: 20 }),
    quantity: 1,
  },
  {
    item: createDemoItem('boots_swift', 'Boots of Swiftness', 'armor', 'epic', 'Enchanted boots that make the wearer light as wind.', '👢', false, { defense: 5, speed: 20 }),
    quantity: 1,
  },
  // Consumables
  {
    item: createDemoItem('potion_health', 'Health Potion', 'consumable', 'common', 'Restores 50 HP when consumed.', '❤️', true),
    quantity: 8,
  },
  {
    item: createDemoItem('potion_mana', 'Mana Potion', 'consumable', 'common', 'Restores 30 MP when consumed.', '💙', true),
    quantity: 5,
  },
  {
    item: createDemoItem('potion_greater_health', 'Greater Health Potion', 'consumable', 'uncommon', 'Restores 150 HP when consumed.', '💗', true),
    quantity: 3,
  },
  {
    item: createDemoItem('elixir_strength', 'Elixir of Strength', 'consumable', 'rare', 'Temporarily increases attack power by 25%.', '💪', true),
    quantity: 2,
  },
  // Materials
  {
    item: createDemoItem('ore_iron', 'Iron Ore', 'material', 'common', 'Raw iron ore. Can be smelted into ingots.', '🪨', true),
    quantity: 24,
  },
  {
    item: createDemoItem('herb_healing', 'Healing Herb', 'material', 'common', 'A medicinal herb used in potion crafting.', '🌿', true),
    quantity: 15,
  },
  {
    item: createDemoItem('gem_ruby', 'Ruby Gem', 'material', 'rare', 'A brilliant red gemstone. Radiates warmth.', '💎', true),
    quantity: 3,
  },
  {
    item: createDemoItem('essence_dragon', 'Dragon Essence', 'material', 'legendary', 'Crystallized essence of an ancient dragon.', '🐉', true),
    quantity: 1,
  },
  // Quest items
  {
    item: createDemoItem('key_dungeon', 'Dungeon Key', 'quest', 'uncommon', 'An old key that opens the gates to the forgotten dungeon.', '🗝️', false),
    quantity: 1,
  },
  {
    item: createDemoItem('scroll_ancient', 'Ancient Scroll', 'quest', 'rare', 'Contains writings in an unknown language.', '📜', false),
    quantity: 1,
  },
  // Misc
  {
    item: createDemoItem('coin_gold', 'Gold Coin', 'misc', 'common', 'Standard currency of the realm.', '🪙', true),
    quantity: 247,
  },
  {
    item: createDemoItem('trophy_goblin', 'Goblin Ear', 'misc', 'common', 'Proof of goblin slaying. Trade for bounty.', '👂', true),
    quantity: 12,
  },
];

export const GameUI: React.FC = () => {
  // Player store actions
  const takeDamage = usePlayerStore((state) => state.takeDamage);
  const heal = usePlayerStore((state) => state.heal);
  const useMana = usePlayerStore((state) => state.useMana);
  const restoreMana = usePlayerStore((state) => state.restoreMana);
  const gainExperience = usePlayerStore((state) => state.gainExperience);

  // Dialogue store actions
  const startDialogue = useDialogueStore((state) => state.startDialogue);
  const isDialogueOpen = useDialogueStore((state) => state.isOpen);

  // Inventory store actions
  const openInventory = useInventoryStore((state) => state.openInventory);
  const closeInventory = useInventoryStore((state) => state.closeInventory);
  const isInventoryOpen = useInventoryStore((state) => state.isOpen);
  const addItem = useInventoryStore((state) => state.addItem);
  const clearInventory = useInventoryStore((state) => state.clearInventory);

  // Menu store actions
  const togglePause = useMenuStore((state) => state.togglePause);
  const isMenuOpen = useMenuStore(selectIsMenuOpen);

  // Map store actions
  const openMap = useMapStore((state) => state.openMap);
  const closeMap = useMapStore((state) => state.closeMap);
  const isMapOpen = useMapStore(selectIsMapOpen);
  const initializeMap = useMapStore((state) => state.initializeMap);

  // Initialize map bridge sync
  useMapBridgeSync();

  // Track if demo items have been loaded
  const itemsLoadedRef = useRef(false);

  // Load demo items on mount (once)
  useEffect(() => {
    if (!itemsLoadedRef.current) {
      itemsLoadedRef.current = true;
      // Clear and load demo items
      clearInventory();
      demoItems.forEach(({ item, quantity }) => {
        addItem(item, quantity);
      });
    }
  }, [addItem, clearInventory]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to toggle pause menu (only if no other modal is open)
      if (e.key === 'Escape' && !isDialogueOpen && !isInventoryOpen) {
        togglePause();
        return;
      }

      // I key to toggle inventory (only if not in dialogue or menu)
      if (e.key.toLowerCase() === 'i' && !isDialogueOpen && !isMenuOpen) {
        if (isInventoryOpen) {
          closeInventory();
        } else {
          openInventory();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInventoryOpen, isDialogueOpen, isMenuOpen, openInventory, closeInventory, togglePause]);

  return (
    <div className={styles.uiContainer}>
      {/* HUD - Health/Mana Bars */}
      <HealthManaBar showStamina={false} showExperience={true} showLevel={true} />

      {/* Dialogue System */}
      <DialogueBox />

      {/* Inventory System */}
      <InventoryPanel />

      {/* Menu System */}
      <PauseMenu />
      <SettingsMenu />
      <CharacterSheet />

      {/* Map System */}
      <MapContainer />

      {/* Demo Controls - Remove in production */}
      <div className={styles.demoControls}>
        <h3>Demo Controls</h3>

        {/* Player Stats */}
        <div className={styles.section}>
          <h4>Player</h4>
          <div className={styles.buttonRow}>
            <button type="button" onClick={() => takeDamage(15)}>
              Damage (-15)
            </button>
            <button type="button" onClick={() => heal(10)}>
              Heal (+10)
            </button>
          </div>
          <div className={styles.buttonRow}>
            <button type="button" onClick={() => useMana(10)}>
              Mana (-10)
            </button>
            <button type="button" onClick={() => restoreMana(10)}>
              Mana (+10)
            </button>
          </div>
          <div className={styles.buttonRow}>
            <button type="button" onClick={() => gainExperience(25)}>
              XP (+25)
            </button>
          </div>
        </div>

        {/* Dialogue Demo */}
        <div className={styles.section}>
          <h4>Dialogue</h4>
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={() => startDialogue(demoDialogue)}
              disabled={isDialogueOpen}
            >
              With Choices
            </button>
            <button
              type="button"
              onClick={() => startDialogue(demoDialogueSimple)}
              disabled={isDialogueOpen}
            >
              Simple
            </button>
          </div>
        </div>

        {/* Inventory Demo */}
        <div className={styles.section}>
          <h4>Inventory (Press I)</h4>
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={() => (isInventoryOpen ? closeInventory() : openInventory())}
            >
              {isInventoryOpen ? 'Close' : 'Open'}
            </button>
            <button
              type="button"
              onClick={() => {
                clearInventory();
                demoItems.forEach(({ item, quantity }) => addItem(item, quantity));
              }}
            >
              Reset Items
            </button>
          </div>
        </div>

        {/* Menu Demo */}
        <div className={styles.section}>
          <h4>Menu (Press ESC)</h4>
          <div className={styles.buttonRow}>
            <button type="button" onClick={togglePause}>
              {isMenuOpen ? 'Close Menu' : 'Pause'}
            </button>
          </div>
        </div>

        {/* Map Demo */}
        <div className={styles.section}>
          <h4>Map (Press M)</h4>
          <div className={styles.buttonRow}>
            <button type="button" onClick={() => (isMapOpen ? closeMap() : openMap())}>
              {isMapOpen ? 'Close Map' : 'Open Map'}
            </button>
            <button
              type="button"
              onClick={() => initializeMap(createDemoMapData())}
            >
              Init Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
