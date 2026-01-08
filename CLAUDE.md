# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOM-based RPG game UI system built with React, designed to overlay on PixiJS game canvases. Uses Zustand for state management and Framer Motion for animations, optimized for 15-60 updates per second without visual stuttering.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript compile + Vite build
npm run lint     # ESLint check
npm run preview  # Preview production build
npx tsc --noEmit # Type check without emit
```

## Architecture

### State Management (Zustand)

Five specialized stores in `src/stores/`:
- **playerStore** - Health, mana, stamina, XP, level (uses `subscribeWithSelector` middleware)
- **dialogueStore** - Conversation state and dialogue lines
- **inventoryStore** - Item slots and inventory state
- **menuStore** - Pause, settings, character sheet screens
- **gameStore** - Global game state

**Critical pattern**: Use fine-grained selectors to prevent cascade re-renders:
```tsx
// Good - subscribes only to health
const health = usePlayerStore(state => state.health);

// Bad - re-renders on any state change
const { health, mana } = usePlayerStore();
```

Each store exports selector functions (e.g., `selectHealth`, `selectHealthPercent`) and non-React accessors (`getPlayerState()`, `subscribeToPlayerStore()`) for PixiJS integration.

### PixiJS Integration (`src/integration/`)

- **gameEvents.ts** - Type-safe event bus using `window.CustomEvent` for bidirectional React-PixiJS communication
- **useBridgeSync.ts** - Hook for syncing store state with game engine

Event naming: `domain:action` (e.g., `player:damage`, `inventory:addItem`, `dialogue:start`)

### Component Structure

```
src/components/
├── hud/          # HealthManaBar with ghost bar damage effect
├── dialogue/     # TypewriterText, NPCPortrait, ChoiceButtons
├── inventory/    # ItemSlot, ItemTooltip, GridView, ListView, CategoryTabs
├── menus/        # PauseMenu, SettingsMenu, CharacterSheet
└── common/       # Shared primitives
```

Components use CSS Modules (`.module.css` files colocated with components).

### Path Aliases

Configured in both `vite.config.ts` and `tsconfig.json`:
- `@/*` → `src/*`
- `@components/*`, `@stores/*`, `@hooks/*`, `@styles/*`, `@types/*`, `@utils/*`, `@assets/*`, `@integration/*`

### Types

Core interfaces in `src/types/index.ts`: `Item`, `InventorySlot`, `DialogueLine`, `DialogueChoice`, `PlayerStats`, `ItemRarity`, `ItemCategory`, `MenuScreen`

## Code Conventions

- Immutable state updates: `{ ...state, updated: value }` - no mutations
- Use TypeScript enums/union types, not string literals for fixed values
- Keep game logic pure and testable (no React dependencies in non-UI code)
- CSS animations use `transform` and `opacity` only (GPU-accelerated)
- Spring-based animations via Framer Motion for natural motion
