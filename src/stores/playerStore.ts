import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface PlayerState {
  // Vitals
  health: number;
  maxHealth: number;
  previousHealth: number; // For ghost bar effect
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;

  // Stats
  level: number;
  experience: number;
  experienceToNextLevel: number;

  // Character info
  name: string;
  characterClass: string;

  // Actions
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  useMana: (amount: number) => boolean;
  restoreMana: (amount: number) => void;
  useStamina: (amount: number) => boolean;
  restoreStamina: (amount: number) => void;
  gainExperience: (amount: number) => void;

  // Setters for PixiJS bridge
  setHealth: (health: number) => void;
  setMana: (mana: number) => void;
  setStamina: (stamina: number) => void;
  setMaxHealth: (maxHealth: number) => void;
  setMaxMana: (maxMana: number) => void;
  setMaxStamina: (maxStamina: number) => void;
  setCharacterInfo: (name: string, characterClass: string) => void;
  reset: () => void;
}

const initialState = {
  health: 100,
  maxHealth: 100,
  previousHealth: 100,
  mana: 80,
  maxMana: 80,
  stamina: 100,
  maxStamina: 100,
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  name: 'Adventurer',
  characterClass: 'Warrior',
};

export const usePlayerStore = create<PlayerState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    takeDamage: (amount) =>
      set((state) => ({
        previousHealth: state.health,
        health: Math.max(0, state.health - amount),
      })),

    heal: (amount) =>
      set((state) => ({
        previousHealth: state.health,
        health: Math.min(state.maxHealth, state.health + amount),
      })),

    useMana: (amount) => {
      const { mana } = get();
      if (mana >= amount) {
        set({ mana: mana - amount });
        return true;
      }
      return false;
    },

    restoreMana: (amount) =>
      set((state) => ({
        mana: Math.min(state.maxMana, state.mana + amount),
      })),

    useStamina: (amount) => {
      const { stamina } = get();
      if (stamina >= amount) {
        set({ stamina: stamina - amount });
        return true;
      }
      return false;
    },

    restoreStamina: (amount) =>
      set((state) => ({
        stamina: Math.min(state.maxStamina, state.stamina + amount),
      })),

    gainExperience: (amount) =>
      set((state) => {
        let newExp = state.experience + amount;
        let newLevel = state.level;
        let expToNext = state.experienceToNextLevel;

        // Level up loop
        while (newExp >= expToNext) {
          newExp -= expToNext;
          newLevel += 1;
          expToNext = Math.floor(expToNext * 1.5); // Exponential scaling
        }

        return {
          experience: newExp,
          level: newLevel,
          experienceToNextLevel: expToNext,
        };
      }),

    // Setters for PixiJS bridge
    setHealth: (health) =>
      set((state) => ({
        previousHealth: state.health,
        health: Math.max(0, Math.min(state.maxHealth, health)),
      })),

    setMana: (mana) =>
      set((state) => ({
        mana: Math.max(0, Math.min(state.maxMana, mana)),
      })),

    setStamina: (stamina) =>
      set((state) => ({
        stamina: Math.max(0, Math.min(state.maxStamina, stamina)),
      })),

    setMaxHealth: (maxHealth) =>
      set((state) => ({
        maxHealth,
        health: Math.min(state.health, maxHealth),
      })),

    setMaxMana: (maxMana) =>
      set((state) => ({
        maxMana,
        mana: Math.min(state.mana, maxMana),
      })),

    setMaxStamina: (maxStamina) =>
      set((state) => ({
        maxStamina,
        stamina: Math.min(state.stamina, maxStamina),
      })),

    setCharacterInfo: (name, characterClass) =>
      set({ name, characterClass }),

    reset: () => set(initialState),
  }))
);

// Fine-grained selectors for surgical re-renders
export const selectHealth = (state: PlayerState) => state.health;
export const selectMaxHealth = (state: PlayerState) => state.maxHealth;
export const selectPreviousHealth = (state: PlayerState) => state.previousHealth;
export const selectMana = (state: PlayerState) => state.mana;
export const selectMaxMana = (state: PlayerState) => state.maxMana;
export const selectStamina = (state: PlayerState) => state.stamina;
export const selectMaxStamina = (state: PlayerState) => state.maxStamina;
export const selectLevel = (state: PlayerState) => state.level;
export const selectExperience = (state: PlayerState) => state.experience;
export const selectExperienceToNextLevel = (state: PlayerState) => state.experienceToNextLevel;
export const selectName = (state: PlayerState) => state.name;
export const selectCharacterClass = (state: PlayerState) => state.characterClass;

// Computed selectors
export const selectHealthPercent = (state: PlayerState) =>
  (state.health / state.maxHealth) * 100;

export const selectManaPercent = (state: PlayerState) =>
  (state.mana / state.maxMana) * 100;

export const selectStaminaPercent = (state: PlayerState) =>
  (state.stamina / state.maxStamina) * 100;

export const selectExperiencePercent = (state: PlayerState) =>
  (state.experience / state.experienceToNextLevel) * 100;

export const selectIsLowHealth = (state: PlayerState) =>
  state.health / state.maxHealth <= 0.25;

export const selectIsDead = (state: PlayerState) => state.health <= 0;

// Non-React access for PixiJS
export const getPlayerState = () => usePlayerStore.getState();
export const subscribeToPlayerStore = usePlayerStore.subscribe;
