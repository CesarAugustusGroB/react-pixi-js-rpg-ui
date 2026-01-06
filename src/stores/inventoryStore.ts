import { create } from 'zustand';
import type { Item, InventorySlot, ItemCategory, ViewMode } from '@/types';

export interface InventoryState {
  // State
  slots: InventorySlot[];
  maxSlots: number;
  selectedSlotIndex: number | null;
  viewMode: ViewMode;
  activeCategory: ItemCategory | 'all';
  isOpen: boolean;

  // Actions
  addItem: (item: Item, quantity?: number) => boolean;
  removeItem: (slotIndex: number, quantity?: number) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  useItem: (slotIndex: number) => void;
  selectSlot: (index: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveCategory: (category: ItemCategory | 'all') => void;
  toggleInventory: () => void;
  openInventory: () => void;
  closeInventory: () => void;
  clearInventory: () => void;
}

const createEmptySlots = (count: number): InventorySlot[] =>
  Array.from({ length: count }, () => ({ item: null, quantity: 0 }));

const INITIAL_MAX_SLOTS = 40;

export const useInventoryStore = create<InventoryState>((set, get) => ({
  slots: createEmptySlots(INITIAL_MAX_SLOTS),
  maxSlots: INITIAL_MAX_SLOTS,
  selectedSlotIndex: null,
  viewMode: 'grid',
  activeCategory: 'all',
  isOpen: false,

  addItem: (item, quantity = 1) => {
    const { slots } = get();

    // If stackable, try to add to existing stack first
    if (item.stackable) {
      const existingSlotIndex = slots.findIndex(
        (s) => s.item?.id === item.id && s.quantity < item.maxStack
      );

      if (existingSlotIndex !== -1) {
        const newSlots = [...slots];
        const slot = newSlots[existingSlotIndex];
        const spaceInStack = item.maxStack - slot.quantity;
        const amountToAdd = Math.min(quantity, spaceInStack);

        newSlots[existingSlotIndex] = {
          ...slot,
          quantity: slot.quantity + amountToAdd,
        };

        set({ slots: newSlots });

        // If more items remain, recursively add to new slot
        if (quantity > amountToAdd) {
          return get().addItem(item, quantity - amountToAdd);
        }
        return true;
      }
    }

    // Find empty slot
    const emptySlotIndex = slots.findIndex((s) => s.item === null);
    if (emptySlotIndex === -1) return false; // Inventory full

    const newSlots = [...slots];
    newSlots[emptySlotIndex] = {
      item,
      quantity: Math.min(quantity, item.stackable ? item.maxStack : 1),
    };
    set({ slots: newSlots });

    // Emit event for PixiJS
    window.dispatchEvent(
      new CustomEvent('inventory:itemAdded', {
        detail: { item, quantity, slotIndex: emptySlotIndex },
      })
    );

    return true;
  },

  removeItem: (slotIndex, quantity = 1) => {
    const { slots } = get();
    const slot = slots[slotIndex];
    if (!slot.item) return;

    const newSlots = [...slots];
    const newQuantity = slot.quantity - quantity;

    if (newQuantity <= 0) {
      newSlots[slotIndex] = { item: null, quantity: 0 };
    } else {
      newSlots[slotIndex] = { ...slot, quantity: newQuantity };
    }

    set({ slots: newSlots });

    // Emit event for PixiJS
    window.dispatchEvent(
      new CustomEvent('inventory:itemRemoved', {
        detail: { item: slot.item, quantity, slotIndex },
      })
    );
  },

  moveItem: (fromIndex, toIndex) => {
    const { slots } = get();
    if (fromIndex === toIndex) return;

    const newSlots = [...slots];
    const fromSlot = newSlots[fromIndex];
    const toSlot = newSlots[toIndex];

    // If same item and stackable, try to merge
    if (
      fromSlot.item &&
      toSlot.item &&
      fromSlot.item.id === toSlot.item.id &&
      fromSlot.item.stackable
    ) {
      const totalQuantity = fromSlot.quantity + toSlot.quantity;
      const maxStack = fromSlot.item.maxStack;

      if (totalQuantity <= maxStack) {
        // Merge completely
        newSlots[toIndex] = { ...toSlot, quantity: totalQuantity };
        newSlots[fromIndex] = { item: null, quantity: 0 };
      } else {
        // Partial merge
        newSlots[toIndex] = { ...toSlot, quantity: maxStack };
        newSlots[fromIndex] = { ...fromSlot, quantity: totalQuantity - maxStack };
      }
    } else {
      // Swap items
      [newSlots[fromIndex], newSlots[toIndex]] = [
        newSlots[toIndex],
        newSlots[fromIndex],
      ];
    }

    set({ slots: newSlots });
  },

  useItem: (slotIndex) => {
    const { slots } = get();
    const slot = slots[slotIndex];
    if (!slot.item) return;

    // Emit event for PixiJS to handle item use
    window.dispatchEvent(
      new CustomEvent('inventory:useItem', {
        detail: { item: slot.item, slotIndex },
      })
    );

    // If consumable, remove from inventory
    if (slot.item.category === 'consumable') {
      get().removeItem(slotIndex, 1);
    }
  },

  selectSlot: (index) => set({ selectedSlotIndex: index }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setActiveCategory: (category) => set({ activeCategory: category }),

  toggleInventory: () =>
    set((state) => {
      const newIsOpen = !state.isOpen;
      // Emit event for PixiJS
      window.dispatchEvent(
        new CustomEvent(newIsOpen ? 'inventory:open' : 'inventory:close')
      );
      return { isOpen: newIsOpen };
    }),

  openInventory: () => {
    set({ isOpen: true });
    window.dispatchEvent(new CustomEvent('inventory:open'));
  },

  closeInventory: () => {
    set({ isOpen: false, selectedSlotIndex: null });
    window.dispatchEvent(new CustomEvent('inventory:close'));
  },

  clearInventory: () =>
    set({
      slots: createEmptySlots(get().maxSlots),
      selectedSlotIndex: null,
    }),
}));

// Selectors
export const selectSlots = (state: InventoryState) => state.slots;
export const selectIsInventoryOpen = (state: InventoryState) => state.isOpen;
export const selectViewMode = (state: InventoryState) => state.viewMode;
export const selectActiveCategory = (state: InventoryState) => state.activeCategory;
export const selectSelectedSlotIndex = (state: InventoryState) => state.selectedSlotIndex;

// Computed selectors
export const selectFilteredSlots = (state: InventoryState) => {
  if (state.activeCategory === 'all') return state.slots;
  return state.slots.map((slot) =>
    slot.item === null || slot.item.category === state.activeCategory
      ? slot
      : { item: null, quantity: 0 }
  );
};

export const selectUsedSlotCount = (state: InventoryState) =>
  state.slots.filter((s) => s.item !== null).length;

export const selectItemCount = (state: InventoryState, itemId: string) =>
  state.slots
    .filter((s) => s.item?.id === itemId)
    .reduce((sum, s) => sum + s.quantity, 0);

export const selectSelectedItem = (state: InventoryState) =>
  state.selectedSlotIndex !== null
    ? state.slots[state.selectedSlotIndex]?.item
    : null;

// Non-React access
export const getInventoryState = () => useInventoryStore.getState();
export const subscribeToInventoryStore = useInventoryStore.subscribe;
