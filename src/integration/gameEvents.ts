import type { DialogueLine, Item } from '@/types';

/**
 * Type-safe event definitions for React-PixiJS communication.
 */
export interface GameEventMap {
  // Player Events (PixiJS → React)
  'player:damage': { amount: number; source?: string };
  'player:heal': { amount: number; source?: string };
  'player:levelUp': { newLevel: number; previousLevel: number };
  'player:death': void;
  'player:respawn': void;
  'player:statsChanged': {
    health?: number;
    maxHealth?: number;
    mana?: number;
    maxMana?: number;
    stamina?: number;
    maxStamina?: number;
  };

  // Dialogue Events (bidirectional)
  'dialogue:start': { lines: DialogueLine[] };
  'dialogue:advance': void;
  'dialogue:choice': { choiceId: string; action?: string };
  'dialogue:end': void;
  'dialogue:skip': void;

  // Inventory Events (bidirectional)
  'inventory:open': void;
  'inventory:close': void;
  'inventory:toggle': void;
  'inventory:addItem': { item: Item; quantity: number };
  'inventory:removeItem': { itemId: string; quantity: number };
  'inventory:useItem': { item: Item; slotIndex: number };
  'inventory:itemAdded': { item: Item; quantity: number; slotIndex: number };
  'inventory:itemRemoved': { itemId: string; quantity: number; slotIndex: number };

  // Game State Events (React → PixiJS)
  'game:pause': { paused: boolean };
  'game:resume': void;
  'game:quit': void;
  'game:save': void;
  'game:load': void;
  'game:settingsChanged': {
    masterVolume?: number;
    musicVolume?: number;
    sfxVolume?: number;
    screenShake?: boolean;
    showDamageNumbers?: boolean;
  };

  // Combat Events (PixiJS → React)
  'combat:start': { enemyId: string; enemyName: string };
  'combat:end': { victory: boolean };
  'combat:targetChange': { targetId: string | null; targetName?: string; targetHealth?: number; targetMaxHealth?: number };
  'combat:damageDealt': { amount: number; critical: boolean; targetId: string };
  'combat:damageReceived': { amount: number; critical: boolean; sourceId: string };

  // UI Events (React → PixiJS)
  'ui:modalOpen': { modalType: string };
  'ui:modalClose': { modalType: string };
  'ui:ready': void;
}

type EventCallback<T> = T extends void ? () => void : (data: T) => void;

/**
 * Type-safe event bus for React-PixiJS communication.
 * Uses window.CustomEvent under the hood for cross-framework compatibility.
 */
class GameEventBus {
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on<K extends keyof GameEventMap>(
    event: K,
    callback: EventCallback<GameEventMap[K]>
  ): () => void {
    // Add to internal listeners
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Also listen on window for events from stores
    const windowHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      (callback as EventCallback<unknown>)(customEvent.detail);
    };

    window.addEventListener(event, windowHandler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
      window.removeEventListener(event, windowHandler);
    };
  }

  /**
   * Subscribe to an event once.
   */
  once<K extends keyof GameEventMap>(
    event: K,
    callback: EventCallback<GameEventMap[K]>
  ): () => void {
    const wrappedCallback = ((data: unknown) => {
      unsubscribe();
      (callback as (data: unknown) => void)(data);
    }) as EventCallback<GameEventMap[K]>;

    const unsubscribe = this.on(event, wrappedCallback);
    return unsubscribe;
  }

  /**
   * Emit an event.
   */
  emit<K extends keyof GameEventMap>(
    event: K,
    ...args: GameEventMap[K] extends void ? [] : [GameEventMap[K]]
  ): void {
    const data = args[0];

    // Emit via window.CustomEvent for cross-framework compatibility
    window.dispatchEvent(
      new CustomEvent(event, { detail: data })
    );

    // Also notify internal listeners directly
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        (callback as EventCallback<unknown>)(data);
      });
    }
  }

  /**
   * Remove all listeners for an event.
   */
  off<K extends keyof GameEventMap>(event: K): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners.
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const gameEvents = new GameEventBus();

// Type-safe event creators for common patterns
export const GameEvents = {
  // Player events
  playerDamage: (amount: number, source?: string) =>
    gameEvents.emit('player:damage', { amount, source }),

  playerHeal: (amount: number, source?: string) =>
    gameEvents.emit('player:heal', { amount, source }),

  playerLevelUp: (newLevel: number, previousLevel: number) =>
    gameEvents.emit('player:levelUp', { newLevel, previousLevel }),

  // Dialogue events
  startDialogue: (lines: DialogueLine[]) =>
    gameEvents.emit('dialogue:start', { lines }),

  endDialogue: () =>
    gameEvents.emit('dialogue:end'),

  dialogueChoice: (choiceId: string, action?: string) =>
    gameEvents.emit('dialogue:choice', { choiceId, action }),

  // Inventory events
  openInventory: () =>
    gameEvents.emit('inventory:open'),

  closeInventory: () =>
    gameEvents.emit('inventory:close'),

  addItem: (item: Item, quantity: number) =>
    gameEvents.emit('inventory:addItem', { item, quantity }),

  // Game events
  pause: (paused: boolean) =>
    gameEvents.emit('game:pause', { paused }),

  quit: () =>
    gameEvents.emit('game:quit'),

  // Combat events
  combatStart: (enemyId: string, enemyName: string) =>
    gameEvents.emit('combat:start', { enemyId, enemyName }),

  combatEnd: (victory: boolean) =>
    gameEvents.emit('combat:end', { victory }),

  targetChange: (targetId: string | null, targetName?: string, targetHealth?: number, targetMaxHealth?: number) =>
    gameEvents.emit('combat:targetChange', { targetId, targetName, targetHealth, targetMaxHealth }),
} as const;
