import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore, selectIsPauseMenuOpen } from '@stores/menuStore';
import { useInventoryStore } from '@stores/inventoryStore';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { menuContainerVariants } from '@utils/animations';
import { MenuBackdrop } from '../MenuBackdrop';
import { MenuItem } from './MenuItem';
import styles from './PauseMenu.module.css';

/**
 * Main pause menu with Resume/Inventory/Character/Settings/Quit options.
 */
export const PauseMenu: React.FC = () => {
  const isOpen = useMenuStore(selectIsPauseMenuOpen);
  const openMenu = useMenuStore((state) => state.openMenu);
  const closeMenu = useMenuStore((state) => state.closeMenu);
  const openInventory = useInventoryStore((state) => state.openInventory);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus trapping for accessibility
  useFocusTrap(isOpen, containerRef);

  const handleResume = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  const handleInventory = useCallback(() => {
    closeMenu();
    openInventory();
  }, [closeMenu, openInventory]);

  const handleCharacter = useCallback(() => {
    openMenu('character');
  }, [openMenu]);

  const handleSettings = useCallback(() => {
    openMenu('settings');
  }, [openMenu]);

  const handleQuit = useCallback(() => {
    // Emit quit event for PixiJS
    window.dispatchEvent(new CustomEvent('game:quit'));
    closeMenu();
  }, [closeMenu]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <MenuBackdrop onClick={handleResume} />
          <motion.div
            ref={containerRef}
            className={styles.container}
            variants={menuContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-menu-title"
          >
            <h1 id="pause-menu-title" className={styles.title}>Paused</h1>
            <motion.div className={styles.menuList} variants={menuContainerVariants}>
              <MenuItem label="Resume" icon="▶" onClick={handleResume} />
              <MenuItem label="Inventory" icon="🎒" onClick={handleInventory} />
              <MenuItem label="Character" icon="👤" onClick={handleCharacter} />
              <MenuItem label="Settings" icon="⚙" onClick={handleSettings} />
              <MenuItem label="Quit" icon="🚪" onClick={handleQuit} danger />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
