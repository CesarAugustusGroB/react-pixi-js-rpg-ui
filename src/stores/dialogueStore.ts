import { create } from 'zustand';
import type { DialogueLine, DialogueChoice } from '@/types';

// Stable empty array to prevent infinite re-renders
const EMPTY_CHOICES: DialogueChoice[] = [];

export interface DialogueState {
  // State
  isOpen: boolean;
  currentDialogue: DialogueLine | null;
  dialogueQueue: DialogueLine[];
  isTyping: boolean;
  displayedText: string;

  // Actions
  startDialogue: (lines: DialogueLine[]) => void;
  advanceDialogue: () => void;
  selectChoice: (choiceId: string) => void;
  closeDialogue: () => void;
  setDisplayedText: (text: string) => void;
  setIsTyping: (isTyping: boolean) => void;
  skipTypewriter: () => void;
}

export const useDialogueStore = create<DialogueState>((set, get) => ({
  isOpen: false,
  currentDialogue: null,
  dialogueQueue: [],
  isTyping: false,
  displayedText: '',

  startDialogue: (lines) => {
    if (lines.length === 0) return;

    set({
      isOpen: true,
      currentDialogue: lines[0],
      dialogueQueue: lines.slice(1),
      displayedText: '',
      isTyping: true,
    });

    // Emit event for PixiJS
    window.dispatchEvent(
      new CustomEvent('dialogue:start', { detail: { lines } })
    );
  },

  advanceDialogue: () => {
    const { dialogueQueue, isTyping, currentDialogue } = get();

    // If still typing, skip to full text
    if (isTyping && currentDialogue) {
      set({
        displayedText: currentDialogue.text,
        isTyping: false,
      });
      return;
    }

    // If choices exist, don't auto-advance (wait for choice selection)
    if (currentDialogue?.choices && currentDialogue.choices.length > 0) {
      return;
    }

    // Advance to next line
    if (dialogueQueue.length > 0) {
      set({
        currentDialogue: dialogueQueue[0],
        dialogueQueue: dialogueQueue.slice(1),
        displayedText: '',
        isTyping: true,
      });
    } else {
      get().closeDialogue();
    }
  },

  selectChoice: (choiceId) => {
    const { currentDialogue } = get();
    const choice = currentDialogue?.choices?.find(
      (c: DialogueChoice) => c.id === choiceId
    );

    if (choice?.action) {
      // Emit event for PixiJS to handle
      window.dispatchEvent(
        new CustomEvent('dialogue:choice', {
          detail: { action: choice.action, choiceId },
        })
      );
    }

    // Close dialogue after choice
    get().closeDialogue();
  },

  closeDialogue: () => {
    set({
      isOpen: false,
      currentDialogue: null,
      dialogueQueue: [],
      displayedText: '',
      isTyping: false,
    });

    // Emit event for PixiJS
    window.dispatchEvent(new CustomEvent('dialogue:end'));
  },

  setDisplayedText: (text) => set({ displayedText: text }),

  setIsTyping: (isTyping) => set({ isTyping }),

  skipTypewriter: () => {
    const { currentDialogue } = get();
    if (currentDialogue) {
      set({
        displayedText: currentDialogue.text,
        isTyping: false,
      });
    }
  },
}));

// Selectors
export const selectIsDialogueOpen = (state: DialogueState) => state.isOpen;
export const selectCurrentDialogue = (state: DialogueState) => state.currentDialogue;
export const selectDisplayedText = (state: DialogueState) => state.displayedText;
export const selectIsTyping = (state: DialogueState) => state.isTyping;
export const selectHasChoices = (state: DialogueState) =>
  (state.currentDialogue?.choices?.length ?? 0) > 0;
export const selectChoices = (state: DialogueState) =>
  state.currentDialogue?.choices ?? EMPTY_CHOICES;
export const selectSpeaker = (state: DialogueState) =>
  state.currentDialogue?.speaker ?? '';
export const selectPortrait = (state: DialogueState) =>
  state.currentDialogue?.portrait ?? null;

// Non-React access
export const getDialogueState = () => useDialogueStore.getState();
export const subscribeToDialogueStore = useDialogueStore.subscribe;
