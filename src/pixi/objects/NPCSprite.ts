// NPCSprite - Visual representation of moving NPCs
// Renders caravans, patrols, travelers, and beasts on the map

import { Container, Graphics } from 'pixi.js';
import type { Vector2 } from '@/types';
import type { NPCEntity, NPCEntityType, NPCState } from '@/types/npc';
import { COLORS } from '../utils/colors';

// ============================================
// STYLE CONSTANTS
// ============================================

const STYLE = {
  // Base sizes per NPC type
  sizes: {
    caravan: 16,
    patrol: 12,
    traveler: 10,
    beast: 14,
  } as Record<NPCEntityType, number>,

  // Colors per NPC type
  colors: {
    caravan: {
      primary: COLORS.ACCENT_YELLOW,
      secondary: COLORS.ACCENT_ORANGE,
      glow: COLORS.ACCENT_YELLOW,
    },
    patrol: {
      primary: COLORS.ACCENT_BLUE,
      secondary: COLORS.LOCATION_VISITED,
      glow: COLORS.ACCENT_BLUE,
    },
    traveler: {
      primary: COLORS.ACCENT_GREEN,
      secondary: COLORS.LOCATION_DISCOVERED,
      glow: COLORS.ACCENT_GREEN,
    },
    beast: {
      primary: COLORS.DANGER,
      secondary: COLORS.WARNING,
      glow: COLORS.DANGER,
    },
  } as Record<NPCEntityType, { primary: number; secondary: number; glow: number }>,

  // Animation
  bobAmplitude: 2,
  bobSpeed: 3,
  glowPulseSpeed: 2,
  glowPulseMin: 0.3,
  glowPulseMax: 0.6,

  // Direction indicator
  directionLength: 8,
  directionWidth: 3,

  // Shadow
  shadowOffset: 3,
  shadowAlpha: 0.3,
} as const;

// ============================================
// NPC SPRITE CLASS
// ============================================

export class NPCSprite extends Container {
  private entityId: string;
  private entityType: NPCEntityType;

  // Graphics layers
  private shadow: Graphics;
  private glow: Graphics;
  private body: Graphics;
  private directionIndicator: Graphics;
  private interactionRing: Graphics;

  // State
  private currentState: NPCState = 'idle';
  private currentDirection: Vector2 = { x: 1, y: 0 };
  private animationTime: number = 0;
  private targetAlpha: number = 1;
  private isInteractable: boolean = false;
  private isHovered: boolean = false;

  // Visual modifiers
  private tintColor: number | undefined;
  private sizeScale: number = 1;

  constructor(entity: NPCEntity) {
    super();

    this.entityId = entity.id;
    this.entityType = entity.type;
    this.tintColor = entity.tint;
    this.sizeScale = entity.scale ?? 1;
    this.isInteractable = entity.isInteractable;

    // Create layers (order matters)
    this.shadow = new Graphics();
    this.glow = new Graphics();
    this.body = new Graphics();
    this.directionIndicator = new Graphics();
    this.interactionRing = new Graphics();

    this.addChild(this.shadow);
    this.addChild(this.glow);
    this.addChild(this.interactionRing);
    this.addChild(this.body);
    this.addChild(this.directionIndicator);

    // Initial render
    this.render();

    // Set up interactivity
    if (this.isInteractable) {
      this.eventMode = 'static';
      this.cursor = 'pointer';

      this.on('pointerover', () => {
        this.isHovered = true;
        this.renderInteractionRing();
      });

      this.on('pointerout', () => {
        this.isHovered = false;
        this.renderInteractionRing();
      });
    }

    // Set initial position
    this.position.set(entity.position.x, entity.position.y);
    this.currentDirection = entity.direction;
    this.alpha = entity.alpha;
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    this.renderShadow();
    this.renderGlow();
    this.renderBody();
    this.renderDirectionIndicator();
    this.renderInteractionRing();
  }

  private renderShadow(): void {
    const size = this.getNPCSize();
    this.shadow.clear();

    this.shadow.ellipse(
      STYLE.shadowOffset,
      STYLE.shadowOffset,
      size * 0.8,
      size * 0.4
    );
    this.shadow.fill({ color: 0x000000, alpha: STYLE.shadowAlpha });
  }

  private renderGlow(): void {
    const size = this.getNPCSize();
    const colors = this.getColors();

    this.glow.clear();

    // Outer glow
    const glowSize = size * 1.8;
    this.glow.circle(0, 0, glowSize);
    this.glow.fill({
      color: colors.glow,
      alpha: STYLE.glowPulseMin,
    });
  }

  private renderBody(): void {
    const size = this.getNPCSize();
    const colors = this.getColors();

    this.body.clear();

    switch (this.entityType) {
      case 'caravan':
        this.renderCaravanBody(size, colors);
        break;
      case 'patrol':
        this.renderPatrolBody(size, colors);
        break;
      case 'traveler':
        this.renderTravelerBody(size, colors);
        break;
      case 'beast':
        this.renderBeastBody(size, colors);
        break;
    }
  }

  private renderCaravanBody(
    size: number,
    colors: { primary: number; secondary: number }
  ): void {
    // Cart shape - rectangle with rounded corners
    const width = size * 1.4;
    const height = size * 0.9;

    // Main cart body
    this.body.roundRect(-width / 2, -height / 2, width, height, 4);
    this.body.fill({ color: colors.primary });

    // Top highlight
    this.body.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height * 0.3, 2);
    this.body.fill({ color: 0xffffff, alpha: 0.3 });

    // Wheels
    const wheelSize = size * 0.25;
    this.body.circle(-width / 3, height / 2, wheelSize);
    this.body.fill({ color: colors.secondary });
    this.body.circle(width / 3, height / 2, wheelSize);
    this.body.fill({ color: colors.secondary });

    // Border
    this.body.roundRect(-width / 2, -height / 2, width, height, 4);
    this.body.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
  }

  private renderPatrolBody(
    size: number,
    colors: { primary: number; secondary: number }
  ): void {
    // Shield shape
    this.body.moveTo(0, -size * 0.6);
    this.body.lineTo(size * 0.5, -size * 0.2);
    this.body.lineTo(size * 0.5, size * 0.3);
    this.body.lineTo(0, size * 0.6);
    this.body.lineTo(-size * 0.5, size * 0.3);
    this.body.lineTo(-size * 0.5, -size * 0.2);
    this.body.closePath();
    this.body.fill({ color: colors.primary });

    // Inner detail
    this.body.circle(0, 0, size * 0.25);
    this.body.fill({ color: colors.secondary });

    // Border
    this.body.moveTo(0, -size * 0.6);
    this.body.lineTo(size * 0.5, -size * 0.2);
    this.body.lineTo(size * 0.5, size * 0.3);
    this.body.lineTo(0, size * 0.6);
    this.body.lineTo(-size * 0.5, size * 0.3);
    this.body.lineTo(-size * 0.5, -size * 0.2);
    this.body.closePath();
    this.body.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
  }

  private renderTravelerBody(
    size: number,
    colors: { primary: number; secondary: number }
  ): void {
    // Simple circle for traveler
    this.body.circle(0, 0, size * 0.5);
    this.body.fill({ color: colors.primary });

    // Inner highlight
    this.body.circle(-size * 0.1, -size * 0.1, size * 0.2);
    this.body.fill({ color: 0xffffff, alpha: 0.3 });

    // Border
    this.body.circle(0, 0, size * 0.5);
    this.body.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });

    // Pack/bag indicator
    this.body.circle(size * 0.3, size * 0.2, size * 0.2);
    this.body.fill({ color: colors.secondary });
  }

  private renderBeastBody(
    size: number,
    colors: { primary: number; secondary: number }
  ): void {
    // Diamond/aggressive shape
    this.body.moveTo(0, -size * 0.6);
    this.body.lineTo(size * 0.6, 0);
    this.body.lineTo(0, size * 0.6);
    this.body.lineTo(-size * 0.6, 0);
    this.body.closePath();
    this.body.fill({ color: colors.primary });

    // Inner cross
    this.body.moveTo(-size * 0.2, -size * 0.2);
    this.body.lineTo(size * 0.2, size * 0.2);
    this.body.moveTo(size * 0.2, -size * 0.2);
    this.body.lineTo(-size * 0.2, size * 0.2);
    this.body.stroke({ color: colors.secondary, width: 2 });

    // Border
    this.body.moveTo(0, -size * 0.6);
    this.body.lineTo(size * 0.6, 0);
    this.body.lineTo(0, size * 0.6);
    this.body.lineTo(-size * 0.6, 0);
    this.body.closePath();
    this.body.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
  }

  private renderDirectionIndicator(): void {
    this.directionIndicator.clear();

    // Only show when moving
    if (this.currentState !== 'moving' && this.currentState !== 'fleeing') {
      return;
    }

    const size = this.getNPCSize();
    const angle = Math.atan2(this.currentDirection.y, this.currentDirection.x);

    // Arrow pointing in direction of movement
    const tipX = Math.cos(angle) * (size * 0.8 + STYLE.directionLength);
    const tipY = Math.sin(angle) * (size * 0.8 + STYLE.directionLength);

    const baseX = Math.cos(angle) * size * 0.6;
    const baseY = Math.sin(angle) * size * 0.6;

    // Arrow body
    this.directionIndicator.moveTo(baseX, baseY);
    this.directionIndicator.lineTo(tipX, tipY);
    this.directionIndicator.stroke({
      color: this.getColors().primary,
      width: STYLE.directionWidth,
      alpha: 0.8,
    });

    // Arrow head
    const headSize = 4;
    const headAngle1 = angle + Math.PI * 0.8;
    const headAngle2 = angle - Math.PI * 0.8;

    this.directionIndicator.moveTo(tipX, tipY);
    this.directionIndicator.lineTo(
      tipX + Math.cos(headAngle1) * headSize,
      tipY + Math.sin(headAngle1) * headSize
    );
    this.directionIndicator.moveTo(tipX, tipY);
    this.directionIndicator.lineTo(
      tipX + Math.cos(headAngle2) * headSize,
      tipY + Math.sin(headAngle2) * headSize
    );
    this.directionIndicator.stroke({
      color: this.getColors().primary,
      width: STYLE.directionWidth,
      alpha: 0.8,
    });
  }

  private renderInteractionRing(): void {
    this.interactionRing.clear();

    if (!this.isInteractable) return;

    const size = this.getNPCSize();
    const ringSize = size * 1.3;

    if (this.isHovered) {
      // Filled ring on hover
      this.interactionRing.circle(0, 0, ringSize);
      this.interactionRing.fill({ color: 0xffffff, alpha: 0.15 });
      this.interactionRing.circle(0, 0, ringSize);
      this.interactionRing.stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
    } else {
      // Subtle dashed ring when not hovered
      this.interactionRing.circle(0, 0, ringSize);
      this.interactionRing.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
    }
  }

  // ============================================
  // UPDATE
  // ============================================

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Bob animation when moving
    if (this.currentState === 'moving' || this.currentState === 'fleeing') {
      const bob = Math.sin(this.animationTime * STYLE.bobSpeed) * STYLE.bobAmplitude;
      this.body.y = bob;
      this.directionIndicator.y = bob;
    } else {
      this.body.y = 0;
      this.directionIndicator.y = 0;
    }

    // Glow pulse
    const pulse =
      STYLE.glowPulseMin +
      (STYLE.glowPulseMax - STYLE.glowPulseMin) *
        (0.5 + 0.5 * Math.sin(this.animationTime * STYLE.glowPulseSpeed));
    this.glow.alpha = pulse;

    // Fleeing effect - faster pulse and red tint
    if (this.currentState === 'fleeing') {
      this.glow.alpha = pulse * 1.5;
    }

    // Alpha fade
    const alphaDiff = this.targetAlpha - this.alpha;
    if (Math.abs(alphaDiff) > 0.01) {
      this.alpha += alphaDiff * deltaTime * 4;
    }
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  public updateFromEntity(entity: NPCEntity): void {
    // Update position
    this.position.set(entity.position.x, entity.position.y);

    // Update direction
    this.currentDirection = entity.direction;

    // Update state
    if (this.currentState !== entity.state) {
      this.currentState = entity.state;
      this.renderDirectionIndicator();
    }

    // Update alpha target
    this.targetAlpha = entity.alpha;

    // Update interactability
    if (this.isInteractable !== entity.isInteractable) {
      this.isInteractable = entity.isInteractable;
      this.renderInteractionRing();
    }
  }

  public setPosition(pos: Vector2): void {
    this.position.set(pos.x, pos.y);
  }

  public setDirection(dir: Vector2): void {
    this.currentDirection = dir;
    this.renderDirectionIndicator();
  }

  public setState(state: NPCState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.renderDirectionIndicator();
    }
  }

  public setTargetAlpha(alpha: number): void {
    this.targetAlpha = alpha;
  }

  // ============================================
  // HELPERS
  // ============================================

  private getNPCSize(): number {
    return STYLE.sizes[this.entityType] * this.sizeScale;
  }

  private getColors(): { primary: number; secondary: number; glow: number } {
    const baseColors = STYLE.colors[this.entityType];
    if (this.tintColor !== undefined) {
      return {
        primary: this.tintColor,
        secondary: baseColors.secondary,
        glow: this.tintColor,
      };
    }
    return baseColors;
  }

  public getId(): string {
    return this.entityId;
  }

  public getType(): NPCEntityType {
    return this.entityType;
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    this.shadow.destroy();
    this.glow.destroy();
    this.body.destroy();
    this.directionIndicator.destroy();
    this.interactionRing.destroy();
    super.destroy({ children: true });
  }
}
