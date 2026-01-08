// CaravanSprite - Animated moving caravan marker for merchant events
// Handles smooth movement between locations and visual effects

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Vector2, WorldEvent, MapLocation } from '@/types';
import { COLORS } from '../utils/colors';
import { Spring, SPRING_PRESETS, pulse, oscillate } from '../utils/easing';

// ============================================
// CONSTANTS
// ============================================

const CARAVAN_SIZE = 16;
const WAGON_LENGTH = 20;
const WHEEL_RADIUS = 4;

// ============================================
// CARAVAN SPRITE CLASS
// ============================================

export class CaravanSprite extends Container {
  private event: WorldEvent;
  private wagon: Graphics;
  private wheels: Graphics;
  private goods: Graphics;
  private flag: Graphics;
  private statusIndicator: Graphics;
  private labelText: Text;

  // Animation
  private positionSpring: { x: Spring; y: Spring };
  private scaleSpring: Spring;
  private animationTime: number = 0;
  private wheelRotation: number = 0;

  // State
  private currentPosition: Vector2 = { x: 0, y: 0 };
  private isMoving: boolean = false;
  private direction: number = 0;
  private isHovered: boolean = false;

  // Route tracking
  private locations: Map<string, MapLocation> = new Map();

  constructor(event: WorldEvent, initialPosition: Vector2) {
    super();
    this.event = event;

    // Initialize springs
    this.positionSpring = {
      x: new Spring(initialPosition.x, SPRING_PRESETS.gentle),
      y: new Spring(initialPosition.y, SPRING_PRESETS.gentle),
    };
    this.scaleSpring = new Spring(0, SPRING_PRESETS.wobbly);
    this.scaleSpring.setTarget(1); // Spawn animation

    // Create visual components
    this.wheels = new Graphics();
    this.wagon = new Graphics();
    this.goods = new Graphics();
    this.flag = new Graphics();
    this.statusIndicator = new Graphics();
    this.labelText = this.createLabel();

    // Add in render order
    this.addChild(this.wheels);
    this.addChild(this.wagon);
    this.addChild(this.goods);
    this.addChild(this.flag);
    this.addChild(this.statusIndicator);
    this.addChild(this.labelText);

    // Set position
    this.currentPosition = { ...initialPosition };
    this.position.set(initialPosition.x, initialPosition.y);

    // Enable interaction
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Initial render
    this.render();
  }

  // ============================================
  // VISUAL CREATION
  // ============================================

  private createLabel(): Text {
    const style = new TextStyle({
      fontSize: 10,
      fill: COLORS.UI_TEXT,
      fontWeight: 'bold',
    });

    const text = new Text({ text: '🛒', style });
    text.anchor.set(0.5, 2.5);

    return text;
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    this.renderWagon();
    this.renderWheels();
    this.renderGoods();
    this.renderFlag();
    this.renderStatusIndicator();
  }

  private renderWagon(): void {
    this.wagon.clear();

    // Main wagon body
    this.wagon.roundRect(
      -WAGON_LENGTH / 2,
      -CARAVAN_SIZE / 2,
      WAGON_LENGTH,
      CARAVAN_SIZE,
      3
    );
    this.wagon.fill({ color: 0x8b4513, alpha: 1 }); // Brown wood
    this.wagon.stroke({ width: 2, color: 0x5d3a1a });

    // Wagon cover (tarp)
    this.wagon.moveTo(-WAGON_LENGTH / 2 + 2, -CARAVAN_SIZE / 2);
    this.wagon.lineTo(-WAGON_LENGTH / 2 + 2, -CARAVAN_SIZE);
    this.wagon.lineTo(WAGON_LENGTH / 2 - 2, -CARAVAN_SIZE);
    this.wagon.lineTo(WAGON_LENGTH / 2 - 2, -CARAVAN_SIZE / 2);
    this.wagon.fill({ color: 0xdeb887, alpha: 0.9 }); // Tan cover
  }

  private renderWheels(): void {
    this.wheels.clear();

    const wheelPositions = [
      { x: -WAGON_LENGTH / 3, y: CARAVAN_SIZE / 2 },
      { x: WAGON_LENGTH / 3, y: CARAVAN_SIZE / 2 },
    ];

    for (const pos of wheelPositions) {
      // Wheel
      this.wheels.circle(pos.x, pos.y, WHEEL_RADIUS);
      this.wheels.fill({ color: 0x4a3520 });
      this.wheels.stroke({ width: 1.5, color: 0x2a1a10 });

      // Spokes
      for (let i = 0; i < 4; i++) {
        const angle = this.wheelRotation + (i * Math.PI) / 2;
        this.wheels.moveTo(pos.x, pos.y);
        this.wheels.lineTo(
          pos.x + Math.cos(angle) * (WHEEL_RADIUS - 1),
          pos.y + Math.sin(angle) * (WHEEL_RADIUS - 1)
        );
      }
      this.wheels.stroke({ width: 1, color: 0x2a1a10 });
    }
  }

  private renderGoods(): void {
    this.goods.clear();

    // Stacked goods on wagon
    const goodsColors = [0xffc107, 0x4caf50, 0x9c27b0]; // Gold, green, purple
    const boxSize = 5;

    for (let i = 0; i < 3; i++) {
      this.goods.rect(
        -WAGON_LENGTH / 4 + i * (boxSize + 2),
        -CARAVAN_SIZE - boxSize,
        boxSize,
        boxSize
      );
      this.goods.fill({ color: goodsColors[i % goodsColors.length], alpha: 0.8 });
    }
  }

  private renderFlag(): void {
    this.flag.clear();

    // Flag pole
    this.flag.moveTo(WAGON_LENGTH / 2 - 3, -CARAVAN_SIZE);
    this.flag.lineTo(WAGON_LENGTH / 2 - 3, -CARAVAN_SIZE - 15);
    this.flag.stroke({ width: 1.5, color: 0x8b4513 });

    // Flag (animated wave)
    const waveOffset = Math.sin(this.animationTime * 3) * 2;
    this.flag.moveTo(WAGON_LENGTH / 2 - 3, -CARAVAN_SIZE - 15);
    this.flag.lineTo(WAGON_LENGTH / 2 + 8 + waveOffset, -CARAVAN_SIZE - 12);
    this.flag.lineTo(WAGON_LENGTH / 2 - 3, -CARAVAN_SIZE - 9);
    this.flag.fill({ color: COLORS.EVENT_CARAVAN });
  }

  private renderStatusIndicator(): void {
    this.statusIndicator.clear();

    if (!this.event.isInterceptable || this.event.wasIntercepted) {
      return;
    }

    // Pulsing intercept indicator
    const pulseScale = pulse(this.animationTime, 1, 0.8, 1.2);
    const radius = 4 * pulseScale;

    this.statusIndicator.circle(0, -CARAVAN_SIZE - 20, radius);
    this.statusIndicator.fill({ color: 0x00ff00, alpha: 0.8 });
  }

  // ============================================
  // LOCATION MANAGEMENT
  // ============================================

  public setLocations(locations: Map<string, MapLocation>): void {
    this.locations = locations;
    this.updatePositionFromRoute();
  }

  public updateEvent(event: WorldEvent): void {
    this.event = event;
    this.updatePositionFromRoute();
  }

  private updatePositionFromRoute(): void {
    if (!this.event.route || this.event.route.length === 0) return;

    const locationId = this.event.route[this.event.currentLocationIndex ?? 0];
    const location = this.locations.get(locationId);

    if (location) {
      this.setTargetPosition(location.position);
    }
  }

  // ============================================
  // POSITION UPDATES
  // ============================================

  public setTargetPosition(pos: Vector2): void {
    // Calculate direction
    const dx = pos.x - this.currentPosition.x;
    const dy = pos.y - this.currentPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      this.direction = Math.atan2(dy, dx);
      this.isMoving = true;
    }

    this.positionSpring.x.setTarget(pos.x);
    this.positionSpring.y.setTarget(pos.y);
  }

  public setPosition(pos: Vector2, immediate: boolean = false): void {
    if (immediate) {
      this.currentPosition = { ...pos };
      this.positionSpring.x.setPosition(pos.x);
      this.positionSpring.y.setPosition(pos.y);
      this.position.set(pos.x, pos.y);
    } else {
      this.setTargetPosition(pos);
    }
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  public setHovered(hovered: boolean): void {
    if (this.isHovered === hovered) return;
    this.isHovered = hovered;
    this.scaleSpring.setTarget(hovered ? 1.2 : 1);
  }

  // ============================================
  // ANIMATION
  // ============================================

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update position springs
    const newX = this.positionSpring.x.update(deltaTime);
    const newY = this.positionSpring.y.update(deltaTime);

    // Check if still moving
    const dx = newX - this.currentPosition.x;
    const dy = newY - this.currentPosition.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed > 0.5) {
      this.isMoving = true;
      this.direction = Math.atan2(dy, dx);

      // Rotate wheels based on movement
      this.wheelRotation += speed * 0.1;
    } else {
      this.isMoving = false;
    }

    this.currentPosition = { x: newX, y: newY };
    this.position.set(newX, newY);

    // Update rotation to face direction of movement
    this.wagon.rotation = this.direction;
    this.wheels.rotation = this.direction;
    this.goods.rotation = this.direction;
    this.flag.rotation = this.direction;

    // Update scale
    const scale = this.scaleSpring.update(deltaTime);
    this.scale.set(scale);

    // Bobbing animation while moving
    if (this.isMoving) {
      const bob = oscillate(this.animationTime, 6, 1);
      this.wagon.position.y = bob;
      this.goods.position.y = bob;
    } else {
      this.wagon.position.y = 0;
      this.goods.position.y = 0;
    }

    // Re-render animated elements
    this.renderWheels();
    this.renderFlag();
    this.renderStatusIndicator();
  }

  // ============================================
  // HELPERS
  // ============================================

  public getEvent(): WorldEvent {
    return this.event;
  }

  public getEventId(): string {
    return this.event.id;
  }

  public getCurrentPosition(): Vector2 {
    return { ...this.currentPosition };
  }

  public isAtTarget(): boolean {
    return (
      this.positionSpring.x.isSettled() && this.positionSpring.y.isSettled()
    );
  }

  public canIntercept(): boolean {
    return this.event.isInterceptable && !this.event.wasIntercepted;
  }

  // ============================================
  // EFFECTS
  // ============================================

  public playSpawnEffect(): void {
    this.scaleSpring.setPosition(0);
    this.scaleSpring.setTarget(1);
  }

  public playDespawnEffect(): void {
    this.scaleSpring.setTarget(0);
  }

  public playInterceptEffect(): void {
    // Quick scale bounce
    this.scaleSpring.setPosition(1.5);
    this.scaleSpring.setTarget(1);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createCaravanSprite(
  event: WorldEvent,
  position: Vector2
): CaravanSprite {
  return new CaravanSprite(event, position);
}
