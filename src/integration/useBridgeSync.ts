import { useEffect } from 'react';
import { gameEvents } from './gameEvents';
import { usePlayerStore } from '@stores/playerStore';
import { useDialogueStore } from '@stores/dialogueStore';
import { useInventoryStore } from '@stores/inventoryStore';
import { useMenuStore } from '@stores/menuStore';

/**
 * React hook that syncs Zustand stores with the PixiJS event bridge.
 * Call this once at the app root to enable bidirectional communication.
 *
 * Events from PixiJS → Update React stores
 * Store changes → Already emit events via stores (existing implementation)
 */
export function useBridgeSync() {
  // Player store actions
  const takeDamage = usePlayerStore((state) => state.takeDamage);
  const heal = usePlayerStore((state) => state.heal);
  const setHealth = usePlayerStore((state) => state.setHealth);
  const setMana = usePlayerStore((state) => state.setMana);
  const setStamina = usePlayerStore((state) => state.setStamina);
  const setMaxHealth = usePlayerStore((state) => state.setMaxHealth);
  const setMaxMana = usePlayerStore((state) => state.setMaxMana);
  const setMaxStamina = usePlayerStore((state) => state.setMaxStamina);

  // Dialogue store actions
  const startDialogue = useDialogueStore((state) => state.startDialogue);
  const advanceDialogue = useDialogueStore((state) => state.advanceDialogue);
  const closeDialogue = useDialogueStore((state) => state.closeDialogue);

  // Inventory store actions
  const openInventory = useInventoryStore((state) => state.openInventory);
  const closeInventory = useInventoryStore((state) => state.closeInventory);
  const toggleInventory = useInventoryStore((state) => state.toggleInventory);
  const addItem = useInventoryStore((state) => state.addItem);
  const removeItem = useInventoryStore((state) => state.removeItem);

  // Menu store actions
  const openMenu = useMenuStore((state) => state.openMenu);
  const closeMenu = useMenuStore((state) => state.closeMenu);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // ===== Player Events (PixiJS → React) =====

    unsubscribers.push(
      gameEvents.on('player:damage', ({ amount }) => {
        takeDamage(amount);
      })
    );

    unsubscribers.push(
      gameEvents.on('player:heal', ({ amount }) => {
        heal(amount);
      })
    );

    unsubscribers.push(
      gameEvents.on('player:statsChanged', (stats) => {
        if (stats.health !== undefined) setHealth(stats.health);
        if (stats.maxHealth !== undefined) setMaxHealth(stats.maxHealth);
        if (stats.mana !== undefined) setMana(stats.mana);
        if (stats.maxMana !== undefined) setMaxMana(stats.maxMana);
        if (stats.stamina !== undefined) setStamina(stats.stamina);
        if (stats.maxStamina !== undefined) setMaxStamina(stats.maxStamina);
      })
    );

    // ===== Dialogue Events (PixiJS → React) =====

    unsubscribers.push(
      gameEvents.on('dialogue:start', ({ lines }) => {
        startDialogue(lines);
      })
    );

    unsubscribers.push(
      gameEvents.on('dialogue:advance', () => {
        advanceDialogue();
      })
    );

    unsubscribers.push(
      gameEvents.on('dialogue:end', () => {
        closeDialogue();
      })
    );

    // ===== Inventory Events (PixiJS → React) =====

    unsubscribers.push(
      gameEvents.on('inventory:open', () => {
        openInventory();
      })
    );

    unsubscribers.push(
      gameEvents.on('inventory:close', () => {
        closeInventory();
      })
    );

    unsubscribers.push(
      gameEvents.on('inventory:toggle', () => {
        toggleInventory();
      })
    );

    unsubscribers.push(
      gameEvents.on('inventory:addItem', ({ item, quantity }) => {
        addItem(item, quantity);
      })
    );

    unsubscribers.push(
      gameEvents.on('inventory:removeItem', ({ itemId, quantity }) => {
        // Find slot by itemId
        const slots = useInventoryStore.getState().slots;
        const slotIndex = slots.findIndex((s) => s.item?.id === itemId);
        if (slotIndex !== -1) {
          removeItem(slotIndex, quantity);
        }
      })
    );

    // ===== Game Events (PixiJS → React) =====

    unsubscribers.push(
      gameEvents.on('game:pause', ({ paused }) => {
        if (paused) {
          openMenu('pause');
        } else {
          closeMenu();
        }
      })
    );

    // Emit ready event
    gameEvents.emit('ui:ready');

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [
    takeDamage,
    heal,
    setHealth,
    setMana,
    setStamina,
    setMaxHealth,
    setMaxMana,
    setMaxStamina,
    startDialogue,
    advanceDialogue,
    closeDialogue,
    openInventory,
    closeInventory,
    toggleInventory,
    addItem,
    removeItem,
    openMenu,
    closeMenu,
  ]);
}

/**
 * Provides direct access to store state for non-React code (PixiJS).
 * Use this from PixiJS to read current state without subscribing.
 */
export const storeAccessors = {
  // Player
  getPlayerState: () => usePlayerStore.getState(),
  getHealth: () => usePlayerStore.getState().health,
  getMaxHealth: () => usePlayerStore.getState().maxHealth,
  getMana: () => usePlayerStore.getState().mana,
  getMaxMana: () => usePlayerStore.getState().maxMana,
  getStamina: () => usePlayerStore.getState().stamina,
  getMaxStamina: () => usePlayerStore.getState().maxStamina,
  getLevel: () => usePlayerStore.getState().level,
  getExperience: () => usePlayerStore.getState().experience,

  // Dialogue
  getDialogueState: () => useDialogueStore.getState(),
  isDialogueOpen: () => useDialogueStore.getState().isOpen,

  // Inventory
  getInventoryState: () => useInventoryStore.getState(),
  isInventoryOpen: () => useInventoryStore.getState().isOpen,
  getSlots: () => useInventoryStore.getState().slots,

  // Menu
  getMenuState: () => useMenuStore.getState(),
  isMenuOpen: () => useMenuStore.getState().currentScreen !== 'none',
  isPaused: () => useMenuStore.getState().isPaused,
  getSettings: () => useMenuStore.getState().settings,
} as const;

/**
 * Subscribe to store changes from non-React code (PixiJS).
 * Returns unsubscribe function.
 */
export const storeSubscriptions = {
  onPlayerChange: (callback: (state: ReturnType<typeof usePlayerStore.getState>) => void) =>
    usePlayerStore.subscribe(callback),

  onDialogueChange: (callback: (state: ReturnType<typeof useDialogueStore.getState>) => void) =>
    useDialogueStore.subscribe(callback),

  onInventoryChange: (callback: (state: ReturnType<typeof useInventoryStore.getState>) => void) =>
    useInventoryStore.subscribe(callback),

  onMenuChange: (callback: (state: ReturnType<typeof useMenuStore.getState>) => void) =>
    useMenuStore.subscribe(callback),

  // Fine-grained subscriptions using subscribeWithSelector
  onHealthChange: (callback: (health: number) => void) =>
    usePlayerStore.subscribe(
      (state) => state.health,
      callback
    ),

  onManaChange: (callback: (mana: number) => void) =>
    usePlayerStore.subscribe(
      (state) => state.mana,
      callback
    ),

  onPausedChange: (callback: (isPaused: boolean) => void) =>
    useMenuStore.subscribe(
      (state) => state.isPaused,
      callback
    ),
} as const;
