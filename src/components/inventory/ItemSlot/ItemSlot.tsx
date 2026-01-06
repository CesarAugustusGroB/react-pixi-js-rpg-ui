import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventoryStore } from '@stores/inventoryStore';
import { slotVariants } from '@utils/animations';
import { ItemTooltip } from '../ItemTooltip';
import styles from './ItemSlot.module.css';

interface ItemSlotProps {
  index: number;
}

/**
 * Individual inventory grid slot with hover tooltip and selection.
 */
export const ItemSlot: React.FC<ItemSlotProps> = ({ index }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Fine-grained selector - only this slot's data
  const slot = useInventoryStore(
    useCallback((state) => state.slots[index], [index])
  );
  const selectedSlotIndex = useInventoryStore((state) => state.selectedSlotIndex);
  const selectSlot = useInventoryStore((state) => state.selectSlot);
  const useItem = useInventoryStore((state) => state.useItem);

  const isSelected = selectedSlotIndex === index;
  const isEmpty = slot.item === null;
  const rarity = slot.item?.rarity || 'common';

  const handleClick = useCallback(() => {
    if (!isEmpty) {
      selectSlot(index);
    }
  }, [selectSlot, index, isEmpty]);

  const handleDoubleClick = useCallback(() => {
    if (!isEmpty && slot.item?.category === 'consumable') {
      useItem(index);
    }
  }, [useItem, index, isEmpty, slot.item?.category]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!isEmpty) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
      setShowTooltip(true);
    }
  }, [isEmpty]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (showTooltip) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const slotClasses = [
    styles.slot,
    isEmpty && styles.empty,
    isSelected && styles.selected,
    !isEmpty && styles[rarity],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <motion.div
        className={slotClasses}
        variants={slotVariants}
        whileHover={!isEmpty ? 'hover' : undefined}
        whileTap={!isEmpty ? 'tap' : undefined}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {slot.item && (
          <>
            {slot.item.icon ? (
              <img
                src={slot.item.icon}
                alt={slot.item.name}
                className={styles.itemIcon}
                draggable={false}
              />
            ) : (
              <span style={{ fontSize: '24px' }}>📦</span>
            )}

            {slot.quantity > 1 && (
              <span className={styles.quantity}>{slot.quantity}</span>
            )}

            {/* Rarity glow for epic/legendary */}
            {(rarity === 'legendary' || rarity === 'epic') && (
              <div className={`${styles.rarityGlow} ${styles[rarity]}`} />
            )}
          </>
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && slot.item && (
          <ItemTooltip
            item={slot.item}
            quantity={slot.quantity}
            position={tooltipPosition}
          />
        )}
      </AnimatePresence>
    </>
  );
};
