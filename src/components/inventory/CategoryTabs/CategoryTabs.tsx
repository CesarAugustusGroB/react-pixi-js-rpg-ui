import React, { useCallback, useRef } from 'react';
import { useInventoryStore } from '@stores/inventoryStore';
import type { ItemCategory } from '@/types';
import styles from './CategoryTabs.module.css';

type CategoryOption = ItemCategory | 'all';

const categories: { value: CategoryOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'weapon', label: 'Weapons' },
  { value: 'armor', label: 'Armor' },
  { value: 'consumable', label: 'Consumables' },
  { value: 'material', label: 'Materials' },
  { value: 'quest', label: 'Quest' },
  { value: 'misc', label: 'Misc' },
];

/**
 * Category filter tabs for inventory.
 */
export const CategoryTabs: React.FC = () => {
  const activeCategory = useInventoryStore((state) => state.activeCategory);
  const setActiveCategory = useInventoryStore((state) => state.setActiveCategory);
  const slots = useInventoryStore((state) => state.slots);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Count items per category
  const getCategoryCount = useCallback(
    (category: CategoryOption): number => {
      if (category === 'all') {
        return slots.filter((s) => s.item !== null).length;
      }
      return slots.filter((s) => s.item?.category === category).length;
    },
    [slots]
  );

  const handleTabClick = useCallback(
    (category: CategoryOption) => {
      setActiveCategory(category);
    },
    [setActiveCategory]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (index + 1) % categories.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = (index - 1 + categories.length) % categories.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = categories.length - 1;
          break;
      }

      if (nextIndex !== null) {
        setActiveCategory(categories[nextIndex].value);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [setActiveCategory]
  );

  return (
    <div className={styles.container} role="tablist" aria-label="Item categories">
      {categories.map(({ value, label }, index) => {
        const count = getCategoryCount(value);
        const isActive = activeCategory === value;

        return (
          <button
            key={value}
            ref={(el) => { tabRefs.current[index] = el; }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => handleTabClick(value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {label}
            {count > 0 && (
              <span className={styles.tabCount} aria-label={`${count} items`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
