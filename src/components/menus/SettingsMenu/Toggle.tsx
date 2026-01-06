import React, { useCallback } from 'react';
import styles from './SettingsMenu.module.css';

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Boolean toggle switch component.
 */
export const Toggle: React.FC<ToggleProps> = ({ label, value, onChange }) => {
  const handleClick = useCallback(() => {
    onChange(!value);
  }, [value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChange(!value);
      }
    },
    [value, onChange]
  );

  return (
    <div className={styles.toggleContainer}>
      <span id={`toggle-label-${label.replace(/\s+/g, '-').toLowerCase()}`} className={styles.toggleLabel}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        className={`${styles.toggle} ${value ? styles.active : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-checked={value}
        aria-labelledby={`toggle-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className={styles.toggleKnob} aria-hidden="true" />
      </button>
    </div>
  );
};
