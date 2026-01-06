import React from 'react';
import { useTypewriter } from '@hooks/useTypewriter';
import styles from './TypewriterText.module.css';

interface TypewriterTextProps {
  /** Text to display with typewriter effect */
  text: string;
  /** Speed in ms per character */
  speed?: number;
  /** Callback when typing completes */
  onComplete?: () => void;
  /** Whether typing is active */
  isActive?: boolean;
}

/**
 * Text component with character-by-character typewriter reveal effect.
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 30,
  onComplete,
  isActive = true,
}) => {
  const { displayedText, isTyping } = useTypewriter(text, {
    speed,
    onComplete,
  });

  // If not active, show full text immediately
  const textToShow = isActive ? displayedText : text;
  const showCursor = isActive && isTyping;

  return (
    <p className={styles.text}>
      {textToShow}
      {showCursor && <span className={styles.cursor} />}
    </p>
  );
};
