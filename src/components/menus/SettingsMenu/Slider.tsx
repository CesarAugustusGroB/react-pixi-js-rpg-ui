import React, { useCallback, useRef } from 'react';
import styles from './SettingsMenu.module.css';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

/**
 * Volume/scale slider component.
 */
export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const calculateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + percent * (max - min));
    },
    [min, max, value]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      const newValue = calculateValue(e.clientX);
      onChange(newValue);

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
          const newValue = calculateValue(e.clientX);
          onChange(newValue);
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [calculateValue, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          onChange(Math.min(max, value + step));
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          onChange(Math.max(min, value - step));
          break;
        case 'Home':
          e.preventDefault();
          onChange(min);
          break;
        case 'End':
          e.preventDefault();
          onChange(max);
          break;
      }
    },
    [value, min, max, onChange]
  );

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.sliderContainer}>
      <span id={`slider-label-${label.replace(/\s+/g, '-').toLowerCase()}`} className={styles.sliderLabel}>
        {label}
      </span>
      <div
        ref={trackRef}
        className={styles.sliderTrack}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-labelledby={`slider-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.sliderFill} style={{ width: `${percent}%` }} />
        <div className={styles.sliderThumb} style={{ left: `${percent}%` }} aria-hidden="true" />
      </div>
      <span className={styles.sliderValue} aria-hidden="true">{value}</span>
    </div>
  );
};
