import React, { useCallback } from 'react';
import { useInventoryStore } from '@stores/inventoryStore';
import type { ViewMode } from '@/types';
import styles from './ViewToggle.module.css';

/**
 * Toggle button for switching between grid and list view.
 */
export const ViewToggle: React.FC = () => {
  const viewMode = useInventoryStore((state) => state.viewMode);
  const setViewMode = useInventoryStore((state) => state.setViewMode);

  const handleToggle = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.button} ${viewMode === 'grid' ? styles.active : ''}`}
        onClick={() => handleToggle('grid')}
        title="Grid View"
        aria-label="Switch to grid view"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
        </svg>
      </button>
      <button
        type="button"
        className={`${styles.button} ${viewMode === 'list' ? styles.active : ''}`}
        onClick={() => handleToggle('list')}
        title="List View"
        aria-label="Switch to list view"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
        </svg>
      </button>
    </div>
  );
};
