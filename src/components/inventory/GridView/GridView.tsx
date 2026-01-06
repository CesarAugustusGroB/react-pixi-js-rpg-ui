import React from 'react';
import { motion } from 'framer-motion';
import { useInventoryStore } from '@stores/inventoryStore';
import { ItemSlot } from '../ItemSlot';
import styles from './GridView.module.css';

/**
 * Grid view displaying inventory as 8x5 slots.
 */
export const GridView: React.FC = () => {
  const slots = useInventoryStore((state) => state.slots);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {slots.map((_, index) => (
        <ItemSlot key={index} index={index} />
      ))}
    </motion.div>
  );
};
