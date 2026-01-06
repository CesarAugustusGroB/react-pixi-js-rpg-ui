import type { Variants, Transition } from 'framer-motion';

// Spring presets for consistent feel
export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 10 } as Transition,
  smooth: { type: 'spring', stiffness: 100, damping: 20 } as Transition,
  gentle: { type: 'spring', stiffness: 50, damping: 15 } as Transition,
};

// Panel animations
export const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.2 },
  },
};

// Menu container with stagger
export const menuContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// Menu item
export const menuItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springs.snappy,
  },
  exit: { opacity: 0, x: -10 },
};

// Dialogue box
export const dialogueVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springs.bouncy,
  },
  exit: {
    opacity: 0,
    y: 30,
    transition: { duration: 0.2 },
  },
};

// Inventory slot
export const slotVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.snappy,
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.15 },
  },
  tap: { scale: 0.95 },
};

// Damage flash
export const damageFlashVariants: Variants = {
  idle: { opacity: 0 },
  flash: {
    opacity: [0, 0.6, 0],
    transition: { duration: 0.3, times: [0, 0.1, 1] },
  },
};

// Tooltip
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 5 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15 },
  },
};

// Backdrop
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};
