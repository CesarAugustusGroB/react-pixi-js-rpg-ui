# React + PixiJS RPG UI Kit

A DOM-based RPG game UI component kit built with React and TypeScript, designed to overlay on top of a PixiJS (v8) game canvas. React renders the HUD, menus, dialogue, inventory, and world map as a transparent overlay (pointer-events pass through to the canvas), while an event/store bridge keeps the UI in sync with the underlying game. State is managed with Zustand and animated with Framer Motion, with the architecture aimed at high-frequency updates without visual stuttering.

## Features

- **HUD** — Health / Mana / Stamina bars with damage-flash and ghost-bar effects (`components/hud/HealthManaBar`).
- **Dialogue system** — Dialogue box with typewriter text, NPC portrait, choice buttons, and a continue indicator (`components/dialogue`).
- **Inventory** — Inventory panel with category tabs, grid and list views, item slots, item tooltips, and a view toggle (`components/inventory`).
- **Menus** — Pause menu, settings menu (with tabs, sliders, and toggles), and a character sheet with stat bars (`components/menus`).
- **World map** — Map container with location tooltips, travel progress bar, and a travel event modal (`components/map`), backed by region/zone/location/path data models.
- **State stores (Zustand)** — Separate `playerStore`, `dialogueStore`, `inventoryStore`, `menuStore`, `mapStore`, and `gameStore`, each exposing fine-grained selectors plus non-React accessors/subscriptions for use from PixiJS code.
- **PixiJS integration bridge** — `integration/` provides `gameEvents` / `mapEvents` emitters and `useBridgeSync` / `useMapBridgeSync` hooks to wire game events to the React stores.
- **Custom hooks** — `useTypewriter`, `useAnimatedValue`, `useFocusTrap`, `useGameLoop`, `useReducedMotion`, `useThrottledState`.

## Tech Stack

- React 18 + TypeScript
- PixiJS 8 (game canvas the UI overlays)
- Zustand 5 (state management, with `subscribeWithSelector`)
- Framer Motion 12 (animations)
- Vite 6 (dev server / build)
- ESLint 9 + typescript-eslint
- CSS Modules for styling

## Getting Started

### Prerequisites

- Node.js (with npm)

### Install

```bash
npm install
```

### Run

```bash
npm run dev      # Start the Vite dev server
npm run build    # Type-check (tsc -b) and build for production
npm run preview  # Preview the production build
npm run lint     # Run ESLint
```

## Project Structure

```
ui-pixi-rpg/
├── index.html
├── package.json
├── eslint.config.js
└── src/
    ├── App.tsx              # Mounts the PixiJS container + GameUI overlay
    ├── GameUI.tsx           # Composes HUD, dialogue, inventory, menus, map
    ├── components/
    │   ├── common/
    │   ├── dialogue/        # DialogueBox, TypewriterText, NPCPortrait, ChoiceButtons, ContinueIndicator
    │   ├── hud/             # HealthManaBar (HealthBar, ManaBar, StaminaBar, GhostBar, DamageFlash)
    │   ├── inventory/       # InventoryPanel, CategoryTabs, GridView, ListView, ItemSlot, ItemTooltip, ViewToggle
    │   ├── menus/           # PauseMenu, SettingsMenu, CharacterSheet, MenuBackdrop
    │   └── map/             # MapContainer, LocationTooltip, TravelProgressBar, TravelEventModal
    ├── stores/             # playerStore, dialogueStore, inventoryStore, menuStore, mapStore, gameStore
    ├── integration/        # gameEvents, mapEvents, useBridgeSync, useMapBridgeSync (PixiJS bridge)
    ├── hooks/              # useTypewriter, useAnimatedValue, useFocusTrap, useGameLoop, ...
    ├── types/              # index, map, npc, rumor, time, travel
    ├── utils/              # animations, formatters
    └── assets/             # fonts, images
```
