import React from 'react';
import { motion } from 'framer-motion';
import { menuItemVariants } from '@utils/animations';
import styles from './PauseMenu.module.css';

interface MenuItemProps {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Animated menu button with hover effects.
 */
export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  onClick,
  danger = false,
}) => {
  return (
    <motion.button
      type="button"
      className={`${styles.menuItem} ${danger ? styles.danger : ''}`}
      variants={menuItemVariants}
      onClick={onClick}
      whileHover={{ x: 10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon && <span className={styles.menuItemIcon}>{icon}</span>}
      {label}
    </motion.button>
  );
};
