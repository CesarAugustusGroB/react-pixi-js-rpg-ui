import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore, selectIsCharacterOpen } from '@stores/menuStore';
import {
  usePlayerStore,
  selectHealth,
  selectMaxHealth,
  selectMana,
  selectMaxMana,
  selectStamina,
  selectMaxStamina,
  selectLevel,
  selectExperience,
  selectExperienceToNextLevel,
  selectName,
  selectCharacterClass,
} from '@stores/playerStore';
import { useFocusTrap } from '@hooks/useFocusTrap';
import { panelVariants } from '@utils/animations';
import { MenuBackdrop } from '../MenuBackdrop';
import { StatBar } from './StatBar';
import styles from './CharacterSheet.module.css';

const equipmentSlots = [
  { id: 'head', label: 'Head', icon: '🪖' },
  { id: 'chest', label: 'Chest', icon: '🛡️' },
  { id: 'hands', label: 'Hands', icon: '🧤' },
  { id: 'weapon', label: 'Weapon', icon: '⚔️' },
  { id: 'legs', label: 'Legs', icon: '👖' },
  { id: 'feet', label: 'Feet', icon: '👢' },
];

/**
 * Character stats and equipment display.
 */
export const CharacterSheet: React.FC = () => {
  const isOpen = useMenuStore(selectIsCharacterOpen);
  const openMenu = useMenuStore((state) => state.openMenu);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus trapping for accessibility
  useFocusTrap(isOpen, containerRef);

  // Player stats with fine-grained selectors
  const name = usePlayerStore(selectName);
  const characterClass = usePlayerStore(selectCharacterClass);
  const level = usePlayerStore(selectLevel);
  const health = usePlayerStore(selectHealth);
  const maxHealth = usePlayerStore(selectMaxHealth);
  const mana = usePlayerStore(selectMana);
  const maxMana = usePlayerStore(selectMaxMana);
  const stamina = usePlayerStore(selectStamina);
  const maxStamina = usePlayerStore(selectMaxStamina);
  const experience = usePlayerStore(selectExperience);
  const experienceToNextLevel = usePlayerStore(selectExperienceToNextLevel);

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
            aria-labelledby="character-title"
          >
            <div className={styles.header}>
              <h2 id="character-title" className={styles.title}>Character</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close character sheet"
              >
                ×
              </button>
            </div>

            {/* Character Info */}
            <div className={styles.characterInfo}>
              <div className={styles.portrait}>👤</div>
              <div className={styles.details}>
                <h3 className={styles.characterName}>{name}</h3>
                <p className={styles.characterClass}>{characterClass}</p>
                <span className={styles.level}>Level {level}</span>
              </div>
            </div>

            <div className={styles.content}>
              {/* Stats Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Stats</h3>
                <StatBar
                  label="Health"
                  icon="❤️"
                  current={health}
                  max={maxHealth}
                  type="health"
                />
                <StatBar
                  label="Mana"
                  icon="💙"
                  current={mana}
                  max={maxMana}
                  type="mana"
                />
                <StatBar
                  label="Stamina"
                  icon="⚡"
                  current={stamina}
                  max={maxStamina}
                  type="stamina"
                />
                <StatBar
                  label="Experience"
                  icon="✨"
                  current={experience}
                  max={experienceToNextLevel}
                  type="experience"
                />
              </div>

              {/* Equipment Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Equipment</h3>
                <div className={styles.equipmentGrid}>
                  {equipmentSlots.map((slot) => (
                    <div key={slot.id} className={styles.equipmentSlot}>
                      <span className={styles.equipmentSlotIcon}>{slot.icon}</span>
                      {slot.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.button}
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
