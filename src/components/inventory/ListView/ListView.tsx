import React from 'react';
import { motion } from 'framer-motion';
import { useInventoryStore } from '@stores/inventoryStore';
import type { ItemCategory } from '@/types';
import { menuContainerVariants, menuItemVariants } from '@utils/animations';
import { ListItem } from './ListItem';
import styles from './ListView.module.css';

const categoryLabels: Record<ItemCategory | 'all', string> = {
  all: 'All Items',
  weapon: 'Weapons',
  armor: 'Armor',
  consumable: 'Consumables',
  material: 'Materials',
  quest: 'Quest Items',
  misc: 'Miscellaneous',
};

const categoryOrder: ItemCategory[] = [
  'weapon',
  'armor',
  'consumable',
  'material',
  'quest',
  'misc',
];

/**
 * List view displaying items grouped by category.
 */
export const ListView: React.FC = () => {
  const slots = useInventoryStore((state) => state.slots);
  const activeCategory = useInventoryStore((state) => state.activeCategory);

  // Filter out empty slots and add original index
  const filledSlots = slots
    .map((slot, index) => ({ ...slot, originalIndex: index }))
    .filter((slot) => slot.item !== null);

  // Filter by active category if not "all"
  const filteredSlots = activeCategory === 'all'
    ? filledSlots
    : filledSlots.filter((slot) => slot.item!.category === activeCategory);

  // Group by category
  const groupedItems = filteredSlots.reduce(
    (acc, slot) => {
      const category = slot.item!.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(slot);
      return acc;
    },
    {} as Record<ItemCategory, typeof filteredSlots>
  );

  // Sort categories
  const sortedCategories = categoryOrder.filter(
    (cat) => groupedItems[cat]?.length > 0
  );

  if (filteredSlots.length === 0) {
    return (
      <div className={styles.emptyState}>
        {activeCategory === 'all'
          ? 'Your inventory is empty'
          : `No ${categoryLabels[activeCategory].toLowerCase()} found`}
      </div>
    );
  }

  return (
    <motion.div
      className={styles.container}
      variants={menuContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {sortedCategories.map((category) => (
        <div key={category} className={styles.categoryGroup}>
          <h3 className={styles.categoryHeader}>
            {categoryLabels[category]}
          </h3>
          <div className={styles.itemList}>
            {groupedItems[category].map((slot) => (
              <motion.div key={slot.originalIndex} variants={menuItemVariants}>
                <ListItem
                  item={slot.item!}
                  quantity={slot.quantity}
                  slotIndex={slot.originalIndex}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
};
