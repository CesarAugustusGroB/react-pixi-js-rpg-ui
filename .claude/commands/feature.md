# Feature Implementation - SHINOBI WAY

Implement a new feature for SHINOBI WAY: THE INFINITE TOWER following this 5-phase workflow.

**Feature Request:** $ARGUMENTS

---

## Phase 1: Research

Investigate how this feature should be implemented within the existing architecture:

### Codebase Analysis

- Search for similar patterns in existing systems
- Check `src/game/systems/` for relevant game logic
- Review `src/components/` for reusable UI patterns
- Look at `src/scenes/` for scene structure if adding new views

### Architecture Considerations

- **Game Logic** belongs in `src/game/systems/` (no React dependencies)
- **Combat features** use dual-system architecture:
  - `CombatCalculationSystem.ts` - Pure math, no side effects
  - `CombatWorkflowSystem.ts` - State management and orchestration
- **Types** go in `src/game/types.ts`
- **Constants/data** go in `src/game/constants/`

### Key Files to Reference

- `src/App.tsx` - Game state flow and scene transitions
- `src/game/types.ts` - Core type definitions (GameState, Player, Skill, etc.)
- `src/game/constants/index.ts` - CLAN_STATS, SKILLS, equipment data

**Summarize findings before proceeding.**

---

## Phase 2: Plan

Create a detailed implementation plan:

### Task Breakdown

- List specific files to create/modify
- Define new types or interfaces needed
- Identify which systems need updates

### Game Balance Considerations

- How does this affect stat calculations?
- Does this change combat flow or damage?
- Will enemy AI need to handle this?

### Edge Cases

- Multi-floor progression implications
- Save/load compatibility (if applicable)
- Interaction with existing skills/equipment

**Present the plan and wait for approval before proceeding.**

---

## Phase 3: Implementation

Build the feature following project conventions:

### Code Standards

- Use TypeScript enums (e.g., `PrimaryStat.STRENGTH`) not string literals
- Create new objects with spread `{ ...old, updated: value }` - no mutations
- Keep game logic pure and testable in `/game/systems/`
- Pass data down, callbacks up in React components

### File Organization

- New scenes → `src/scenes/`
- Reusable UI → `src/components/`
- Game systems → `src/game/systems/`
- Type definitions → `src/game/types.ts`

### Naming Conventions

- Systems: `XxxSystem.ts` with functions like `calculateXxx()`, `applyXxx()`
- Components: PascalCase matching their purpose
- Events/constants: SCREAMING_SNAKE_CASE

---

## Phase 4: Review & Polish

Self-review the implementation:

### Code Quality

- No `any` types - use proper TypeScript
- No hardcoded balance values in components
- Remove console.logs and debug code
- Ensure immutable state updates

### Game Integration

- Verify state flows correctly through `App.tsx`
- Check GameState transitions work properly
- Test interactions with existing mechanics

### Type Safety

- Run `npx tsc --noEmit` to verify no type errors
- Ensure all new types are properly exported

---

## Phase 5: UI & UX Polish

Ensure the feature feels native to the game:

### Visual Consistency

- Match existing dark/ninja aesthetic
- Use consistent color palette (chakra blue, blood red, etc.)
- Follow existing component styling patterns

### Game Feel

- Add appropriate feedback for player actions
- Include combat log messages if combat-related
- Consider adding sound effect hooks (if system exists)

### Accessibility

- Tooltips for complex mechanics
- Clear visual indicators for buffs/debuffs
- Readable text contrast

---

## Checklist Before Complete

- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Feature works in dev (`npm run dev`)
- [ ] No console errors in browser
- [ ] Integrates with existing game flow
- [ ] Code follows project patterns
