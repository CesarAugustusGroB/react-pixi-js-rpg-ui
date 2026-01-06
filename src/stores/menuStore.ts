import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MenuScreen, SettingsTab, Settings } from '@/types';

export interface MenuState {
  // Navigation
  currentScreen: MenuScreen;
  settingsTab: SettingsTab;
  isPaused: boolean;

  // Settings
  settings: Settings;

  // Actions
  openMenu: (screen: MenuScreen) => void;
  closeMenu: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  resetSettings: () => void;
  togglePause: () => void;
}

const defaultSettings: Settings = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 80,
  uiScale: 100,
  showDamageNumbers: true,
  screenShake: true,
};

export const useMenuStore = create<MenuState>()(
  subscribeWithSelector((set, get) => ({
    currentScreen: 'none',
    settingsTab: 'audio',
    isPaused: false,
    settings: { ...defaultSettings },

    openMenu: (screen) => {
      const isPaused = screen !== 'none';
      set({ currentScreen: screen, isPaused });

      // Emit event for PixiJS
      window.dispatchEvent(
        new CustomEvent('game:pause', { detail: { paused: isPaused } })
      );
    },

    closeMenu: () => {
      set({ currentScreen: 'none', isPaused: false });

      // Emit event for PixiJS
      window.dispatchEvent(
        new CustomEvent('game:pause', { detail: { paused: false } })
      );
    },

    setSettingsTab: (tab) => set({ settingsTab: tab }),

    updateSettings: (partial) =>
      set((state) => ({
        settings: { ...state.settings, ...partial },
      })),

    resetSettings: () => set({ settings: { ...defaultSettings } }),

    togglePause: () => {
      const { isPaused, currentScreen } = get();

      if (isPaused && currentScreen !== 'none') {
        get().closeMenu();
      } else {
        get().openMenu('pause');
      }
    },
  }))
);

// Selectors
export const selectCurrentScreen = (state: MenuState) => state.currentScreen;
export const selectIsPaused = (state: MenuState) => state.isPaused;
export const selectSettingsTab = (state: MenuState) => state.settingsTab;
export const selectSettings = (state: MenuState) => state.settings;
export const selectMasterVolume = (state: MenuState) => state.settings.masterVolume;
export const selectMusicVolume = (state: MenuState) => state.settings.musicVolume;
export const selectSfxVolume = (state: MenuState) => state.settings.sfxVolume;
export const selectUiScale = (state: MenuState) => state.settings.uiScale;
export const selectShowDamageNumbers = (state: MenuState) => state.settings.showDamageNumbers;
export const selectScreenShake = (state: MenuState) => state.settings.screenShake;

// Computed selectors
export const selectIsMenuOpen = (state: MenuState) => state.currentScreen !== 'none';
export const selectIsPauseMenuOpen = (state: MenuState) => state.currentScreen === 'pause';
export const selectIsSettingsOpen = (state: MenuState) => state.currentScreen === 'settings';
export const selectIsCharacterOpen = (state: MenuState) => state.currentScreen === 'character';

// Non-React access
export const getMenuState = () => useMenuStore.getState();
export const subscribeToMenuStore = useMenuStore.subscribe;
