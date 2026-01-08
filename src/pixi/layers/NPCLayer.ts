// NPCLayer - Manages rendering of all NPCs on the map
// Coordinates with NPCMovementSystem for position updates

import { Container } from 'pixi.js';
import type { NPCEntity, NPCPositionUpdate } from '@/types/npc';
import { NPCSprite } from '../objects/NPCSprite';

// ============================================
// NPC LAYER EVENTS
// ============================================

export interface NPCLayerEvents {
  onNPCClick: (npcId: string) => void;
  onNPCHover: (npcId: string | null) => void;
  onNPCRightClick: (npcId: string) => void;
}

// ============================================
// NPC LAYER CLASS
// ============================================

export class NPCLayer extends Container {
  private sprites: Map<string, NPCSprite> = new Map();
  private events: NPCLayerEvents;
  private hoveredNPCId: string | null = null;

  constructor(events: NPCLayerEvents) {
    super();
    this.events = events;
  }

  // ============================================
  // NPC MANAGEMENT
  // ============================================

  /**
   * Add a new NPC sprite to the layer
   */
  public addNPC(entity: NPCEntity): void {
    if (this.sprites.has(entity.id)) {
      console.warn(`NPCLayer: NPC ${entity.id} already exists`);
      return;
    }

    const sprite = new NPCSprite(entity);

    // Set up event handlers
    sprite.on('pointerdown', (e: PointerEvent) => {
      if (e.button === 0) {
        this.events.onNPCClick(entity.id);
      } else if (e.button === 2) {
        this.events.onNPCRightClick(entity.id);
      }
    });

    sprite.on('pointerover', () => {
      this.hoveredNPCId = entity.id;
      this.events.onNPCHover(entity.id);
    });

    sprite.on('pointerout', () => {
      if (this.hoveredNPCId === entity.id) {
        this.hoveredNPCId = null;
        this.events.onNPCHover(null);
      }
    });

    this.sprites.set(entity.id, sprite);
    this.addChild(sprite);
  }

  /**
   * Remove an NPC sprite from the layer
   */
  public removeNPC(npcId: string): void {
    const sprite = this.sprites.get(npcId);
    if (sprite) {
      this.removeChild(sprite);
      sprite.destroy();
      this.sprites.delete(npcId);

      if (this.hoveredNPCId === npcId) {
        this.hoveredNPCId = null;
        this.events.onNPCHover(null);
      }
    }
  }

  /**
   * Update all NPCs from entity data
   */
  public updateNPCs(entities: NPCEntity[]): void {
    for (const entity of entities) {
      const sprite = this.sprites.get(entity.id);
      if (sprite) {
        sprite.updateFromEntity(entity);
      } else {
        // New NPC, add it
        this.addNPC(entity);
      }
    }
  }

  /**
   * Apply position updates from movement system
   */
  public applyPositionUpdates(updates: NPCPositionUpdate[]): void {
    for (const update of updates) {
      const sprite = this.sprites.get(update.id);
      if (sprite) {
        sprite.setPosition(update.position);
        sprite.setDirection(update.direction);
        sprite.setState(update.state);
      }
    }
  }

  /**
   * Clear all NPCs
   */
  public clearNPCs(): void {
    for (const sprite of this.sprites.values()) {
      this.removeChild(sprite);
      sprite.destroy();
    }
    this.sprites.clear();
    this.hoveredNPCId = null;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get an NPC sprite by ID
   */
  public getNPCSprite(npcId: string): NPCSprite | undefined {
    return this.sprites.get(npcId);
  }

  /**
   * Get all NPC sprites
   */
  public getAllSprites(): NPCSprite[] {
    return Array.from(this.sprites.values());
  }

  /**
   * Get currently hovered NPC ID
   */
  public getHoveredNPCId(): string | null {
    return this.hoveredNPCId;
  }

  /**
   * Check if NPC exists
   */
  public hasNPC(npcId: string): boolean {
    return this.sprites.has(npcId);
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  public update(deltaTime: number): void {
    for (const sprite of this.sprites.values()) {
      sprite.update(deltaTime);
    }
  }

  // ============================================
  // VISIBILITY
  // ============================================

  /**
   * Set visibility of a specific NPC
   */
  public setNPCVisible(npcId: string, visible: boolean): void {
    const sprite = this.sprites.get(npcId);
    if (sprite) {
      sprite.visible = visible;
    }
  }

  /**
   * Fade out an NPC (for despawning)
   */
  public fadeOutNPC(npcId: string): void {
    const sprite = this.sprites.get(npcId);
    if (sprite) {
      sprite.setTargetAlpha(0);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.clearNPCs();
    super.destroy({ children: true });
  }
}
