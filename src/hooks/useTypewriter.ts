import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypewriterOptions {
  speed?: number; // ms per character
  startDelay?: number; // ms before starting
  onComplete?: () => void;
  onCharacter?: (char: string, index: number) => void;
}

interface UseTypewriterReturn {
  displayedText: string;
  isTyping: boolean;
  skip: () => void;
  reset: () => void;
  restart: () => void;
}

export const useTypewriter = (
  text: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn => {
  const { speed = 30, startDelay = 0, onComplete, onCharacter } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    clearTimer();
    isRunningRef.current = false;
    setDisplayedText(text);
    setIsTyping(false);
    onComplete?.();
  }, [text, onComplete, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    isRunningRef.current = false;
    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(false);
  }, [clearTimer]);

  const restart = useCallback(() => {
    reset();
    // Trigger effect to restart typing
    setTimeout(() => {
      isRunningRef.current = true;
      setIsTyping(true);
    }, 0);
  }, [reset]);

  useEffect(() => {
    // Reset when text changes
    clearTimer();
    indexRef.current = 0;
    setDisplayedText('');
    isRunningRef.current = false;

    if (!text) {
      setIsTyping(false);
      return;
    }

    const startTyping = () => {
      isRunningRef.current = true;
      setIsTyping(true);

      const typeNextChar = () => {
        if (!isRunningRef.current) return;

        if (indexRef.current < text.length) {
          const char = text[indexRef.current];
          indexRef.current += 1;

          setDisplayedText(text.slice(0, indexRef.current));
          onCharacter?.(char, indexRef.current - 1);

          // Vary speed slightly for natural feel
          const variance = Math.random() * 10 - 5;
          const adjustedSpeed = Math.max(10, speed + variance);

          // Pause longer on punctuation
          const punctuationDelay = /[.!?]/.test(char) ? 200 : /[,;:]/.test(char) ? 100 : 0;

          timeoutRef.current = setTimeout(
            typeNextChar,
            adjustedSpeed + punctuationDelay
          );
        } else {
          isRunningRef.current = false;
          setIsTyping(false);
          onComplete?.();
        }
      };

      timeoutRef.current = setTimeout(typeNextChar, speed);
    };

    if (startDelay > 0) {
      timeoutRef.current = setTimeout(startTyping, startDelay);
    } else {
      startTyping();
    }

    return () => {
      clearTimer();
      isRunningRef.current = false;
    };
  }, [text, speed, startDelay, onComplete, onCharacter, clearTimer]);

  return { displayedText, isTyping, skip, reset, restart };
};
