import React, { useCallback, useRef } from 'react';
import { useMenuStore, selectSettingsTab } from '@stores/menuStore';
import type { SettingsTab as SettingsTabType } from '@/types';
import styles from './SettingsMenu.module.css';

const tabs: { id: SettingsTabType; label: string }[] = [
  { id: 'audio', label: 'Audio' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'controls', label: 'Controls' },
];

/**
 * Settings tab navigation.
 */
export const SettingsTabs: React.FC = () => {
  const activeTab = useMenuStore(selectSettingsTab);
  const setSettingsTab = useMenuStore((state) => state.setSettingsTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabClick = useCallback(
    (tab: SettingsTabType) => {
      setSettingsTab(tab);
    },
    [setSettingsTab]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
      }

      if (nextIndex !== null) {
        setSettingsTab(tabs[nextIndex].id);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [setSettingsTab]
  );

  return (
    <div className={styles.tabs} role="tablist" aria-label="Settings categories">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => { tabRefs.current[index] = el; }}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => handleTabClick(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
