import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useDialogueStore,
  selectIsDialogueOpen,
  selectCurrentDialogue,
  selectIsTyping,
  selectHasChoices,
  selectChoices,
} from '@stores/dialogueStore';
import { dialogueVariants } from '@utils/animations';
import { TypewriterText } from '../TypewriterText';
import { NPCPortrait } from '../NPCPortrait';
import { ChoiceButtons } from '../ChoiceButtons';
import { ContinueIndicator } from '../ContinueIndicator';
import styles from './DialogueBox.module.css';

/**
 * Main dialogue box container with typewriter effect, portraits, and choices.
 * Handles keyboard input for advancing dialogue and selecting choices.
 */
export const DialogueBox: React.FC = () => {
  const isOpen = useDialogueStore(selectIsDialogueOpen);
  const currentDialogue = useDialogueStore(selectCurrentDialogue);
  const isTyping = useDialogueStore(selectIsTyping);
  const hasChoices = useDialogueStore(selectHasChoices);
  const choices = useDialogueStore(selectChoices);

  const advanceDialogue = useDialogueStore((state) => state.advanceDialogue);
  const selectChoice = useDialogueStore((state) => state.selectChoice);
  const setIsTyping = useDialogueStore((state) => state.setIsTyping);

  // Track typing completion internally
  const [typingComplete, setTypingComplete] = useState(false);

  // Reset typing state when dialogue changes
  useEffect(() => {
    setTypingComplete(false);
  }, [currentDialogue?.id]);

  // Handle click to advance
  const handleClick = useCallback(() => {
    if (hasChoices) return; // Don't advance if choices are shown
    advanceDialogue();
  }, [advanceDialogue, hasChoices]);

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!hasChoices) {
          advanceDialogue();
        }
      }

      // Escape to skip typewriter
      if (e.key === 'Escape' && isTyping) {
        e.preventDefault();
        setIsTyping(false);
        setTypingComplete(true);
      }
    },
    [isOpen, hasChoices, isTyping, advanceDialogue, setIsTyping]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle typing completion
  const handleTypingComplete = useCallback(() => {
    setIsTyping(false);
    setTypingComplete(true);
  }, [setIsTyping]);

  // Handle choice selection
  const handleChoiceSelect = useCallback(
    (choiceId: string) => {
      selectChoice(choiceId);
    },
    [selectChoice]
  );

  // Show continue indicator when not typing and no choices
  const showContinue = !isTyping && typingComplete && !hasChoices;

  return (
    <AnimatePresence>
      {isOpen && currentDialogue && (
        <motion.div
          className={styles.container}
          variants={dialogueVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClick}
        >
          {/* Portrait (if provided) */}
          {currentDialogue.portrait && (
            <NPCPortrait
              src={currentDialogue.portrait}
              name={currentDialogue.speaker}
              isSpeaking={isTyping}
            />
          )}

          <div className={styles.content}>
            {/* Speaker name */}
            <div className={styles.speakerName}>{currentDialogue.speaker}</div>

            {/* Dialogue text with typewriter effect */}
            <div className={styles.textContainer}>
              <TypewriterText
                text={currentDialogue.text}
                speed={30}
                onComplete={handleTypingComplete}
                isActive={isTyping}
              />
            </div>

            {/* Footer: Choices or Continue indicator */}
            <div className={styles.footer}>
              {hasChoices && typingComplete ? (
                <ChoiceButtons
                  choices={choices}
                  onSelect={handleChoiceSelect}
                />
              ) : (
                <ContinueIndicator visible={showContinue} />
              )}
            </div>
          </div>

          {/* Decorative corners */}
          <div className={styles.cornerTL} />
          <div className={styles.cornerTR} />
          <div className={styles.cornerBL} />
          <div className={styles.cornerBR} />

          {/* Inner glow */}
          <div className={styles.innerGlow} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
