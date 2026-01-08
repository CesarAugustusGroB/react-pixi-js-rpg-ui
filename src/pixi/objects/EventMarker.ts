// EventMarker - Visual representation of world events on the map
// Handles caravans, raids, festivals, storms, etc.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { WorldEvent, WorldEventType, Vector2 } from '@/types';
import { COLORS } from '../utils/colors';
import { Spring, SPRING_PRESETS, pulse, oscillate } from '../utils/easing';

// ============================================
// CONSTANTS
// ============================================

const EVENT_COLORS: Record<WorldEventType, number> = {
  merchant_caravan: COLORS.EVENT_CARAVAN,
  bandit_raid: COLORS.EVENT_RAID,
  festival: COLORS.EVENT_FESTIVAL,
  beast_migration: COLORS.EVENT_BEAST,
  storm: COLORS.EVENT_STORM,
  plague: 0x8b0000,
  pilgrimage: COLORS.EVENT_PILGRIMAGE,
};

const EVENT_ICONS: Record<WorldEventType, string> = {
  merchant_caravan: '🛒',
  bandit_raid: '⚔️',
  festival: '🎉',
  beast_migration: '🦁',
  storm: '⛈️',
  plague: '☠️',
  pilgrimage: '🙏',
};

const EVENT_SIZE = 14;

// ============================================
// EVENT MARKER CLASS
// ============================================

export class EventMarker extends Container {
  private event: WorldEvent;
  private background: Graphics;
  private glow: Graphics;
  private icon: Text;
  private progressRing: Graphics;

  // Animation
  private scaleSpring: Spring;
  private animationTime: number = 0;

  // State
  private isHovered: boolean = false;
  private isInterceptable: boolean = false;

  constructor(event: WorldEvent, position: Vector2) {
    super();
    this.event = event;

    // Initialize spring
    this.scaleSpring = new Spring(0, SPRING_PRESETS.wobbly);
    this.scaleSpring.setTarget(1); // Animate in

    // Create visual elements
    this.glow = new Graphics();
    this.progressRing = new Graphics();
    this.background = new Graphics();
    this.icon = this.createIcon();

    this.addChild(this.glow);
    this.addChild(this.progressRing);
    this.addChild(this.background);
    this.addChild(this.icon);

    // Set position
    this.position.set(position.x, position.y);

    // Enable interaction
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Initial render
    this.render();
  }

  // ============================================
  // VISUAL CREATION
  // ============================================

  private createIcon(): Text {
    const style = new TextStyle({
      fontSize: 16,
    });

    const icon = EVENT_ICONS[this.event.type];
    const text = new Text({ text: icon, style });
    text.anchor.set(0.5, 0.5);

    return text;
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    this.renderBackground();
    this.renderGlow();
    this.renderProgressRing();
  }

  private renderBackground(): void {
    this.background.clear();

    const color = EVENT_COLORS[this.event.type];

    // Outer ring
    this.background.circle(0, 0, EVENT_SIZE);
    this.background.stroke({ width: 2, color, alpha: 1 });

    // Fill
    this.background.circle(0, 0, EVENT_SIZE - 2);
    this.background.fill({ color, alpha: 0.3 });
  }

  private renderGlow(): void {
    this.glow.clear();

    const color = EVENT_COLORS[this.event.type];
    const glowSize = EVENT_SIZE + 6;

    this.glow.circle(0, 0, glowSize);
    this.glow.fill({ color, alpha: 0.2 });
  }

  private renderProgressRing(): void {
    this.progressRing.clear();

    // Calculate progress based on event timing
    const progress = this.calculateEventProgress();

    if (progress <= 0 || progress >= 1) return;

    const color = EVENT_COLORS[this.event.type];
    const radius = EVENT_SIZE + 4;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;

    // Draw arc
    this.progressRing.arc(0, 0, radius, startAngle, endAngle);
    this.progressRing.stroke({
      width: 3,
      color,
      alpha: 0.8,
      cap: 'round',
    });
  }

  private calculateEventProgress(): number {
    const { startTime, duration } = this.event;
    const elapsed = Date.now() - startTime;
    return Math.max(0, Math.min(1, elapsed / duration));
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  public updateEvent(event: WorldEvent): void {
    this.event = event;
    this.isInterceptable = event.isInterceptable && !event.wasIntercepted;
    this.render();
  }

  public updatePosition(position: Vector2): void {
    this.position.set(position.x, position.y);
  }

  public setHovered(hovered: boolean): void {
    if (this.isHovered === hovered) return;
    this.isHovered = hovered;
    this.scaleSpring.setTarget(hovered ? 1.2 : 1);
  }

  public setInterceptable(interceptable: boolean): void {
    this.isInterceptable = interceptable;
  }

  // ============================================
  // ANIMATION
  // ============================================

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update scale
    const scale = this.scaleSpring.update(deltaTime);
    this.scale.set(scale);

    // Type-specific animations
    switch (this.event.type) {
      case 'merchant_caravan':
        this.animateCaravan();
        break;
      case 'bandit_raid':
        this.animateRaid();
        break;
      case 'storm':
        this.animateStorm();
        break;
      case 'festival':
        this.animateFestival();
        break;
      default:
        this.animateDefault();
    }

    // Update progress ring
    this.renderProgressRing();
  }

  private animateCaravan(): void {
    // Gentle bobbing motion
    const bob = oscillate(this.animationTime, 0.5, 2);
    this.icon.position.y = bob;
  }

  private animateRaid(): void {
    // Aggressive shaking
    const shake = oscillate(this.animationTime, 8, 1);
    this.icon.position.x = shake;

    // Red pulse glow
    const glowIntensity = pulse(this.animationTime, 2, 0.2, 0.5);
    this.glow.alpha = glowIntensity;
  }

  private animateStorm(): void {
    // Rotation
    this.icon.rotation = this.animationTime * 0.5;

    // Flicker
    const flicker = Math.random() > 0.95 ? 0.5 : 1;
    this.icon.alpha = flicker;
  }

  private animateFestival(): void {
    // Spin and pulse
    this.icon.rotation = Math.sin(this.animationTime * 2) * 0.1;
    const colorPulse = pulse(this.animationTime, 1, 0.8, 1);
    this.icon.scale.set(colorPulse);
  }

  private animateDefault(): void {
    // Subtle pulse
    const pulseScale = pulse(this.animationTime, 0.8, 0.9, 1.1);
    this.glow.scale.set(pulseScale);
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

  public getEventType(): WorldEventType {
    return this.event.type;
  }

  public canIntercept(): boolean {
    return this.isInterceptable;
  }

  public isActive(): boolean {
    return this.event.state === 'active';
  }

  public playInterceptEffect(): void {
    this.scaleSpring.setPosition(1.5);
    this.scaleSpring.setTarget(0);
  }

  public playSpawnEffect(): void {
    this.scaleSpring.setPosition(0);
    this.scaleSpring.setTarget(1);
  }
}
