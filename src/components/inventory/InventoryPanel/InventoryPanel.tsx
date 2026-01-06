import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventoryStore, selectUsedSlotCount } from '@stores/inventoryStore';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { panelVariants, backdropVariants } from '@utils/animations';
import { CategoryTabs } from '../CategoryTabs';
import { ViewToggle } from '../ViewToggle';
import { GridView } from '../GridView';
import { ListView } from '../ListView';
import styles from './InventoryPanel.module.css';

/**
 * Main inventory panel with grid/list view toggle and category tabs.
 */
export const InventoryPanel: React.FC = () => {
  const isOpen = useInventoryStore((state) => state.isOpen);
  const viewMode = useInventoryStore((state) => state.viewMode);
  const maxSlots = useInventoryStore((state) => state.maxSlots);
  const usedSlots = useInventoryStore(selectUsedSlotCount);
  const closeInventory = useInventoryStore((state) => state.closeInventory);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trapping for accessibility
  useFocusTrap(isOpen, panelRef);

  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeInventory();
      }
    },
    [isOpen, closeInventory]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    closeInventory();
  }, [closeInventory]);

  // Handle close button
  const handleClose = useCallback(() => {
    closeInventory();
  }, [closeInventory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className={styles.panel}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-title"
          >
            {/* Header */}
            <div className={styles.header}>
              <h2 id="inventory-title" className={styles.title}>Inventory</h2>
              <div className={styles.headerControls}>
                <ViewToggle />
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={handleClose}
                  aria-label="Close inventory"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <CategoryTabs />

            {/* Content - Grid or List View */}
            <div className={styles.content}>
              <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                  <GridView key="grid" />
                ) : (
                  <ListView key="list" />
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <span className={styles.slotCount}>
                {usedSlots} / {maxSlots} slots used
              </span>
              <span className={styles.goldDisplay}>
                <span>💰</span>
                <span>0</span>
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
