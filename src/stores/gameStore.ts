import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { EnemyTarget } from '@/types';

export interface GameState {
  // UI blocking state
  isUIBlocking: boolean;
  activeUIPanel: string | null;

  // Player position (updated by PixiJS, read by UI for minimap etc.)
  playerPosition: { x: number; y: number };
  currentZone: string;

  // Combat state
  inCombat: boolean;
  targetEnemy: EnemyTarget | null;

  // Game state
  isGameRunning: boolean;
  gameTime: number; // In-game time in seconds

  // Actions
  setUIBlocking: (blocking: boolean) => void;
  setActiveUIPanel: (panel: string | null) => void;
  setPlayerPosition: (pos: { x: number; y: number }) => void;
  setCurrentZone: (zone: string) => void;
  setInCombat: (inCombat: boolean) => void;
  setTargetEnemy: (enemy: EnemyTarget | null) => void;
  setIsGameRunning: (running: boolean) => void;
  updateGameTime: (deltaSeconds: number) => void;
  reset: () => void;
}

const initialState = {
  isUIBlocking: false,
  activeUIPanel: null,
  playerPosition: { x: 0, y: 0 },
  currentZone: 'Starting Area',
  inCombat: false,
  targetEnemy: null,
  isGameRunning: true,
  gameTime: 0,
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setUIBlocking: (blocking) => set({ isUIBlocking: blocking }),

    setActiveUIPanel: (panel) =>
      set({
        activeUIPanel: panel,
        isUIBlocking: panel !== null,
      }),

    setPlayerPosition: (pos) => set({ playerPosition: pos }),

    setCurrentZone: (zone) => set({ currentZone: zone }),

    setInCombat: (inCombat) => set({ inCombat }),

    setTargetEnemy: (enemy) => set({ targetEnemy: enemy }),

    setIsGameRunning: (running) => set({ isGameRunning: running }),

    updateGameTime: (deltaSeconds) =>
      set((state) => ({
        gameTime: state.gameTime + deltaSeconds,
      })),

    reset: () => set(initialState),
  }))
);

// Selectors
export const selectIsUIBlocking = (state: GameState) => state.isUIBlocking;
export const selectActiveUIPanel = (state: GameState) => state.activeUIPanel;
export const selectPlayerPosition = (state: GameState) => state.playerPosition;
export const selectCurrentZone = (state: GameState) => state.currentZone;
export const selectInCombat = (state: GameState) => state.inCombat;
export const selectTargetEnemy = (state: GameState) => state.targetEnemy;
export const selectIsGameRunning = (state: GameState) => state.isGameRunning;
export const selectGameTime = (state: GameState) => state.gameTime;

// Computed selectors
export const selectHasTarget = (state: GameState) => state.targetEnemy !== null;
export const selectTargetHealthPercent = (state: GameState) =>
  state.targetEnemy
    ? (state.targetEnemy.health / state.targetEnemy.maxHealth) * 100
    : 0;

// Non-React access for PixiJS
export const getGameState = () => useGameStore.getState();
export const subscribeToGameStore = useGameStore.subscribe;

// Direct setters for PixiJS (non-React) usage
export const gameActions = {
  setUIBlocking: (blocking: boolean) =>
    useGameStore.getState().setUIBlocking(blocking),
  setPlayerPosition: (pos: { x: number; y: number }) =>
    useGameStore.getState().setPlayerPosition(pos),
  setCurrentZone: (zone: string) =>
    useGameStore.getState().setCurrentZone(zone),
  setInCombat: (inCombat: boolean) =>
    useGameStore.getState().setInCombat(inCombat),
  setTargetEnemy: (enemy: EnemyTarget | null) =>
    useGameStore.getState().setTargetEnemy(enemy),
};
