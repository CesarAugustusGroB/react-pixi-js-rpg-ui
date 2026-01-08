// LocationNode - Visual representation of a map location
// Modern clean design with gradient effects and smooth animations

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { MapLocation, DiscoveryState } from '@/types';
import { COLORS, getDiscoveryColor, getLocationTypeColor, adjustBrightness } from '../utils/colors';
import { Spring, SPRING_PRESETS, pulse } from '../utils/easing';
import { GLOW_PRESETS, type GlowConfig } from '../utils/filters';

// ============================================
// CONSTANTS
// ============================================

const SIZES = {
  unknown: 10,
  rumored: 14,
  discovered: 18,
  visited: 18,
  current: 22,
} as const;

const ICON_SCALE = {
  unknown: 0.5,
  rumored: 0.7,
  discovered: 1.0,
  visited: 1.0,
} as const;

// Modern styling constants
const STYLE = {
  borderWidth: 2,
  innerHighlightOffset: -0.2, // Offset from center for inner highlight (fake gradient)
  innerHighlightScale: 0.6,
  outerGlowAlpha: 0.15,
  shadowOffsetY: 3,
  shadowBlur: 6,
  shadowAlpha: 0.25,
} as const;

// ============================================
// LOCATION NODE CLASS
// ============================================

export class LocationNode extends Container {
  private location: MapLocation;
  private shadow: Graphics;
  private outerGlow: Graphics;
  private background: Graphics;
  private innerHighlight: Graphics;
  private icon: Graphics;
  private glow: Graphics;
  private borderRing: Graphics;
  private nameLabel: Text;
  private questionMark: Text;

  // Animation springs
  private scaleSpring: Spring;
  private glowSpring: Spring;

  // State
  private isHoveredState: boolean = false;
  private isSelected: boolean = false;
  private isCurrent: boolean = false;
  private animationTime: number = 0;

  constructor(location: MapLocation) {
    super();
    this.location = location;

    // Initialize springs
    this.scaleSpring = new Spring(1, SPRING_PRESETS.wobbly);
    this.glowSpring = new Spring(0, SPRING_PRESETS.gentle);

    // Create visual elements (order matters for layering)
    this.shadow = new Graphics();
    this.outerGlow = new Graphics();
    this.glow = new Graphics();
    this.background = new Graphics();
    this.innerHighlight = new Graphics();
    this.icon = new Graphics();
    this.borderRing = new Graphics();
    this.nameLabel = this.createLabel();
    this.questionMark = this.createQuestionMark();

    // Add children in render order (back to front)
    this.addChild(this.shadow);
    this.addChild(this.outerGlow);
    this.addChild(this.glow);
    this.addChild(this.background);
    this.addChild(this.innerHighlight);
    this.addChild(this.icon);
    this.addChild(this.borderRing);
    this.addChild(this.nameLabel);
    this.addChild(this.questionMark);

    // Set position
    this.position.set(location.position.x, location.position.y);

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
      fontFamily: 'Arial',
      fontSize: 11,
      fill: COLORS.UI_TEXT,
      stroke: { color: COLORS.BACKGROUND_DARK, width: 2 },
      align: 'center',
    });

    const text = new Text({ text: '', style });
    text.anchor.set(0.5, 0);
    text.position.y = 20;
    text.visible = false;

    return text;
  }

  private createQuestionMark(): Text {
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 'bold',
      fill: COLORS.UI_TEXT_DIM,
    });

    const text = new Text({ text: '?', style });
    text.anchor.set(0.5, 0.5);
    text.visible = false;

    return text;
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    const state = this.location.discoveryState;
    const size = this.getNodeSize();
    const color = this.getColor();

    this.renderShadow(size, state);
    this.renderOuterGlow(size, color, state);
    this.renderBackground(size, color, state);
    this.renderInnerHighlight(size, color, state);
    this.renderIcon(state);
    this.renderBorder(size, color, state);
    this.renderGlow(size, color);
    this.updateNameLabel();
  }

  private renderShadow(size: number, state: DiscoveryState): void {
    this.shadow.clear();

    // Only show shadow for visible nodes
    if (state === 'unknown') return;

    // Soft drop shadow
    this.shadow.circle(0, STYLE.shadowOffsetY, size + 2);
    this.shadow.fill({
      color: 0x000000,
      alpha: STYLE.shadowAlpha * (state === 'rumored' ? 0.5 : 1),
    });
  }

  private renderOuterGlow(size: number, color: number, state: DiscoveryState): void {
    this.outerGlow.clear();

    // Subtle ambient glow ring around the node
    if (state === 'unknown') return;

    const glowRadius = size + 4;

    // Multiple layers for soft glow effect
    for (let i = 3; i >= 1; i--) {
      const layerRadius = glowRadius + i * 2;
      this.outerGlow.circle(0, 0, layerRadius);
      this.outerGlow.fill({
        color,
        alpha: STYLE.outerGlowAlpha / i,
      });
    }
  }

  private renderBackground(size: number, color: number, state: DiscoveryState): void {
    this.background.clear();

    if (state === 'unknown') {
      // Minimal placeholder for unknown
      this.background.circle(0, 0, size);
      this.background.fill({
        color: COLORS.BACKGROUND_SURFACE,
        alpha: 0.4,
      });
      return;
    }

    // Main fill with darkened base color
    const baseColor = adjustBrightness(color, 0.4);
    this.background.circle(0, 0, size);
    this.background.fill({
      color: baseColor,
      alpha: state === 'rumored' ? 0.6 : 0.9,
    });
  }

  private renderInnerHighlight(size: number, color: number, state: DiscoveryState): void {
    this.innerHighlight.clear();

    if (state === 'unknown' || state === 'rumored') return;

    // Inner highlight circle offset upward for fake gradient effect
    const highlightSize = size * STYLE.innerHighlightScale;
    const highlightY = size * STYLE.innerHighlightOffset;

    this.innerHighlight.circle(0, highlightY, highlightSize);
    this.innerHighlight.fill({
      color: adjustBrightness(color, 1.4),
      alpha: 0.35,
    });

    // Additional center highlight for current/visited
    if (state === 'visited' || this.isCurrent) {
      this.innerHighlight.circle(0, highlightY * 0.5, highlightSize * 0.5);
      this.innerHighlight.fill({
        color: 0xffffff,
        alpha: 0.2,
      });
    }
  }

  private renderBorder(size: number, color: number, state: DiscoveryState): void {
    this.borderRing.clear();

    // Clean border ring
    const borderColor = state === 'unknown' ? COLORS.UI_BORDER : color;
    const borderAlpha = state === 'unknown' ? 0.3 : 0.9;

    this.borderRing.circle(0, 0, size);
    this.borderRing.stroke({
      width: STYLE.borderWidth,
      color: adjustBrightness(borderColor, 1.2),
      alpha: borderAlpha,
    });

    // Inner subtle dark line for depth
    if (state !== 'unknown') {
      this.borderRing.circle(0, 0, size - 1);
      this.borderRing.stroke({
        width: 1,
        color: adjustBrightness(color, 0.5),
        alpha: 0.3,
      });
    }
  }

  private renderIcon(state: DiscoveryState): void {
    this.icon.clear();
    this.questionMark.visible = false;

    if (state === 'unknown') {
      return;
    }

    if (state === 'rumored') {
      this.questionMark.visible = true;
      return;
    }

    // Draw location type icon with modern styling
    const size = this.getNodeSize();
    const iconSize = Math.max(4, size * 0.35) * ICON_SCALE[state];
    const typeColor = getLocationTypeColor(this.location.locationType);

    // Icon background
    this.icon.circle(0, 0, iconSize + 2);
    this.icon.fill({
      color: adjustBrightness(typeColor, 0.3),
      alpha: 0.6,
    });

    // Icon foreground
    this.icon.circle(0, 0, iconSize);
    this.icon.fill({ color: typeColor });

    // Tiny highlight on icon
    this.icon.circle(-iconSize * 0.3, -iconSize * 0.3, iconSize * 0.3);
    this.icon.fill({ color: 0xffffff, alpha: 0.3 });
  }

  private renderGlow(size: number, color: number): void {
    this.glow.clear();

    const glowIntensity = this.glowSpring.getValue();
    if (glowIntensity <= 0.01) return;

    // Use preset-based glow configuration
    const glowConfig: GlowConfig = this.isSelected
      ? { ...GLOW_PRESETS.selected, color, intensity: GLOW_PRESETS.selected.intensity * glowIntensity }
      : { ...GLOW_PRESETS.hover, color, intensity: GLOW_PRESETS.hover.intensity * glowIntensity };

    // Draw layered glow
    const layers = 4;
    for (let i = layers; i >= 1; i--) {
      const layerRadius = size + (glowConfig.radius * i) / layers;
      const layerAlpha = (glowConfig.alpha / layers) * glowIntensity;

      this.glow.circle(0, 0, layerRadius);
      this.glow.fill({ color: glowConfig.color, alpha: layerAlpha });
    }
  }

  private updateNameLabel(): void {
    const state = this.location.discoveryState;

    if (state === 'unknown') {
      this.nameLabel.visible = false;
      return;
    }

    // Show vague name for rumored, actual name for discovered/visited
    if (state === 'rumored') {
      this.nameLabel.text = '???';
      this.nameLabel.style.fill = COLORS.UI_TEXT_DIM;
    } else {
      this.nameLabel.text = this.location.name;
      this.nameLabel.style.fill = COLORS.UI_TEXT;
    }

    // Only show label when hovered or selected
    this.nameLabel.visible = this.isHoveredState || this.isSelected;
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  public updateLocation(location: MapLocation): void {
    const stateChanged = this.location.discoveryState !== location.discoveryState;
    this.location = location;

    if (stateChanged) {
      // Animate scale when discovery state changes
      this.scaleSpring.setPosition(0.5);
      this.scaleSpring.setTarget(1);
    }

    this.render();
  }

  public setHovered(hovered: boolean): void {
    if (this.isHoveredState === hovered) return;
    this.isHoveredState = hovered;

    this.scaleSpring.setTarget(hovered ? 1.2 : 1);
    this.glowSpring.setTarget(hovered ? 1 : 0);
    this.updateNameLabel();
  }

  public setSelected(selected: boolean): void {
    if (this.isSelected === selected) return;
    this.isSelected = selected;

    this.glowSpring.setTarget(selected ? 1.5 : this.isHoveredState ? 1 : 0);
    this.updateNameLabel();
  }

  public setCurrent(current: boolean): void {
    if (this.isCurrent === current) return;
    this.isCurrent = current;
    this.render();
  }

  // ============================================
  // ANIMATION UPDATE
  // ============================================

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update springs
    this.scaleSpring.update(deltaTime);
    this.glowSpring.update(deltaTime);

    // Apply scale
    const scale = this.scaleSpring.getValue();
    this.scale.set(scale);

    // Pulse effect for current location
    if (this.isCurrent) {
      const pulseScale = 1 + pulse(this.animationTime, 0.5, 0, 0.1);
      this.scale.set(scale * pulseScale);
    }

    // Re-render glow if animating
    if (!this.glowSpring.isSettled()) {
      const size = this.getNodeSize();
      const color = this.getColor();
      this.renderGlow(size, color);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private getNodeSize(): number {
    if (this.isCurrent) return SIZES.current;
    return SIZES[this.location.discoveryState];
  }

  private getColor(): number {
    if (this.isCurrent) return COLORS.LOCATION_CURRENT;
    if (this.isSelected) return COLORS.LOCATION_SELECTED;
    return getDiscoveryColor(this.location.discoveryState);
  }

  public getLocation(): MapLocation {
    return this.location;
  }

  public getLocationId(): string {
    return this.location.id;
  }

  public canInteract(): boolean {
    // Can only interact with discovered or visited locations
    return (
      this.location.discoveryState === 'discovered' ||
      this.location.discoveryState === 'visited'
    );
  }
}
