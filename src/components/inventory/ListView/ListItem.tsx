import React, { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Item } from '@/types';
import { useInventoryStore } from '@stores/inventoryStore';
import { ItemTooltip } from '../ItemTooltip';
import styles from './ListView.module.css';

interface ListItemProps {
  item: Item;
  quantity: number;
  slotIndex: number;
}

/**
 * Individual item row in list view.
 */
export const ListItem: React.FC<ListItemProps> = ({
  item,
  quantity,
  slotIndex,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const selectedSlotIndex = useInventoryStore((state) => state.selectedSlotIndex);
  const selectSlot = useInventoryStore((state) => state.selectSlot);
  const useItem = useInventoryStore((state) => state.useItem);

  const isSelected = selectedSlotIndex === slotIndex;
  const isConsumable = item.category === 'consumable';

  const handleClick = useCallback(() => {
    selectSlot(slotIndex);
  }, [selectSlot, slotIndex]);

  const handleUse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    useItem(slotIndex);
  }, [useItem, slotIndex]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return (
    <>
      <div
        className={`${styles.listItem} ${isSelected ? styles.selected : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.itemIcon}>
          {item.icon ? (
            <img src={item.icon} alt={item.name} />
          ) : (
            <span>📦</span>
          )}
        </div>

        <div className={styles.itemInfo}>
          <div className={`${styles.itemName} ${styles[item.rarity]}`}>
            {item.name}
          </div>
          <div className={styles.itemCategory}>{item.category}</div>
        </div>

        {quantity > 1 && (
          <div className={styles.itemQuantity}>×{quantity}</div>
        )}

        <div className={styles.itemActions}>
          {isConsumable && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.use}`}
              onClick={handleUse}
            >
              Use
            </button>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <ItemTooltip
            item={item}
            quantity={quantity}
            position={tooltipPosition}
          />
        )}
      </AnimatePresence>
    </>
  );
};
