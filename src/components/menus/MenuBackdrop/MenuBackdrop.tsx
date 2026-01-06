import React from 'react';
import { motion } from 'framer-motion';
import { backdropVariants } from '@utils/animations';
import styles from './MenuBackdrop.module.css';

interface MenuBackdropProps {
  onClick?: () => void;
}

/**
 * Shared blurred overlay backdrop for menus.
 */
export const MenuBackdrop: React.FC<MenuBackdropProps> = ({ onClick }) => {
  return (
    <motion.div
      className={styles.backdrop}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClick}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
};
