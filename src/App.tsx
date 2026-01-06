import React from 'react';
import { GameUI } from './GameUI';
import { useBridgeSync } from '@integration/index';
import styles from './App.module.css';

/**
 * Main App component with PixiJS integration.
 *
 * Architecture:
 * - #pixi-container: Where PixiJS canvas mounts (managed externally)
 * - GameUI: React overlay with pointer-events: none (children have auto)
 *
 * PixiJS Integration:
 * - gameEvents.emit() to send events to React
 * - storeAccessors to read current state
 * - storeSubscriptions for reactive updates
 *
 * Example PixiJS usage:
 * ```ts
 * import { gameEvents, storeAccessors, GameEvents } from './integration';
 *
 * // Read state
 * const health = storeAccessors.getHealth();
 *
 * // Emit events
 * GameEvents.playerDamage(25);
 * GameEvents.startDialogue([...]);
 *
 * // Listen to events
 * gameEvents.on('inventory:useItem', ({ item }) => {
 *   console.log('Player used:', item.name);
 * });
 * ```
 */
const App: React.FC = () => {
  // Connect stores to PixiJS event bridge
  useBridgeSync();

  return (
    <div className={styles.appContainer}>
      {/* PixiJS canvas mounts here */}
      <div id="pixi-container" className={styles.pixiContainer} />

      {/* React UI overlay */}
      <GameUI />
    </div>
  );
};

export default App;
