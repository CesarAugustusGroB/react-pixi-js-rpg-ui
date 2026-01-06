import React, { useEffect, useRef } from 'react';
import { HealthManaBar } from '@components/hud';
import { DialogueBox } from '@components/dialogue';
import { InventoryPanel } from '@components/inventory';
import { PauseMenu, SettingsMenu, CharacterSheet } from '@components/menus';
import { usePlayerStore } from '@stores/playerStore';
import { useDialogueStore } from '@stores/dialogueStore';
import { useInventoryStore } from '@stores/inventoryStore';
import { useMenuStore, selectIsMenuOpen } from '@stores/menuStore';
import type { DialogueLine, Item, ItemCategory, ItemRarity } from '@/types';
import styles from './GameUI.module.css';

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
      </div>
    </div>
  );
};
