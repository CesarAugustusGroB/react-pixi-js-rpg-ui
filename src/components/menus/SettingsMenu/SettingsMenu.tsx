import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore, selectIsSettingsOpen, selectSettingsTab, selectSettings } from '@stores/menuStore';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { panelVariants } from '@utils/animations';
import { MenuBackdrop } from '../MenuBackdrop';
import { SettingsTabs } from './SettingsTabs';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import styles from './SettingsMenu.module.css';

/**
 * Settings panel with tabbed sections.
 */
export const SettingsMenu: React.FC = () => {
  const isOpen = useMenuStore(selectIsSettingsOpen);
  const activeTab = useMenuStore(selectSettingsTab);
  const settings = useMenuStore(selectSettings);
  const openMenu = useMenuStore((state) => state.openMenu);
  const updateSettings = useMenuStore((state) => state.updateSettings);
  const resetSettings = useMenuStore((state) => state.resetSettings);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus trapping for accessibility
  useFocusTrap(isOpen, containerRef);

  const handleClose = useCallback(() => {
    openMenu('pause');
  }, [openMenu]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const renderAudioSettings = () => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Volume</h3>
      <Slider
        label="Master Volume"
        value={settings.masterVolume}
        onChange={(value) => updateSettings({ masterVolume: value })}
      />
      <Slider
        label="Music Volume"
        value={settings.musicVolume}
        onChange={(value) => updateSettings({ musicVolume: value })}
      />
      <Slider
        label="SFX Volume"
        value={settings.sfxVolume}
        onChange={(value) => updateSettings({ sfxVolume: value })}
      />
    </div>
  );

  const renderGraphicsSettings = () => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Display</h3>
      <Slider
        label="UI Scale"
        value={settings.uiScale}
        min={50}
        max={150}
        onChange={(value) => updateSettings({ uiScale: value })}
      />
    </div>
  );

  const renderGameplaySettings = () => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Gameplay</h3>
      <Toggle
        label="Show Damage Numbers"
        value={settings.showDamageNumbers}
        onChange={(value) => updateSettings({ showDamageNumbers: value })}
      />
      <Toggle
        label="Screen Shake"
        value={settings.screenShake}
        onChange={(value) => updateSettings({ screenShake: value })}
      />
    </div>
  );

  const renderControlsSettings = () => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Controls</h3>
      <div className={styles.toggleContainer}>
        <span className={styles.toggleLabel}>ESC - Pause Menu</span>
      </div>
      <div className={styles.toggleContainer}>
        <span className={styles.toggleLabel}>I - Inventory</span>
      </div>
      <div className={styles.toggleContainer}>
        <span className={styles.toggleLabel}>Space/Enter - Advance Dialogue</span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'audio':
        return renderAudioSettings();
      case 'graphics':
        return renderGraphicsSettings();
      case 'gameplay':
        return renderGameplaySettings();
      case 'controls':
        return renderControlsSettings();
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <MenuBackdrop onClick={handleClose} />
          <motion.div
            ref={containerRef}
            className={styles.container}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className={styles.header}>
              <h2 id="settings-title" className={styles.title}>Settings</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <SettingsTabs />

            <div className={styles.content}>{renderContent()}</div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.button}
                onClick={resetSettings}
              >
                Reset Defaults
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={handleClose}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
