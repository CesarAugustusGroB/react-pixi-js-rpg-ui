// UILayer - On-canvas UI elements
// Renders minimap indicators, compass, time display, etc.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { GameTime, Vector2 } from '@/types';
import { COLORS, getTimeOfDayTint } from '../utils/colors';
import { getTimeOfDay } from '@/types/time';

// ============================================
// CONSTANTS
// ============================================

const UI_PADDING = 16;
const COMPASS_SIZE = 40;
const TIME_PANEL_WIDTH = 120;
const TIME_PANEL_HEIGHT = 50;

// ============================================
// UI LAYER CLASS
// ============================================

export class UILayer extends Container {
  private compass!: Container;
  private compassRose!: Graphics;
  private compassNeedle!: Graphics;

  private timePanel!: Container;
  private timePanelBg!: Graphics;
  private timeText!: Text;
  private dayText!: Text;
  private timeIndicator!: Graphics;

  private zoomIndicator!: Container;
  private zoomText!: Text;

  private screenSize: Vector2 = { x: 800, y: 600 };

  constructor() {
    super();

    // Create UI elements
    this.compass = this.createCompass();
    this.timePanel = this.createTimePanel();
    this.zoomIndicator = this.createZoomIndicator();

    this.addChild(this.compass);
    this.addChild(this.timePanel);
    this.addChild(this.zoomIndicator);

    // Position UI elements
    this.updateLayout();
  }

  // ============================================
  // COMPASS
  // ============================================

  private createCompass(): Container {
    const container = new Container();

    // Rose background
    this.compassRose = new Graphics();
    this.compassRose.circle(0, 0, COMPASS_SIZE / 2);
    this.compassRose.fill({ color: COLORS.UI_PANEL, alpha: 0.8 });
    this.compassRose.circle(0, 0, COMPASS_SIZE / 2);
    this.compassRose.stroke({ width: 2, color: COLORS.UI_BORDER });

    // Cardinal directions
    const directions = ['N', 'E', 'S', 'W'];
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: COLORS.UI_TEXT_DIM,
    });

    const directionLabels: Text[] = [];
    directions.forEach((dir, i) => {
      const angle = (i * Math.PI) / 2 - Math.PI / 2;
      const radius = COMPASS_SIZE / 2 - 8;
      const text = new Text({ text: dir, style });
      text.anchor.set(0.5);
      text.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
      if (dir === 'N') {
        text.style.fill = COLORS.UI_HIGHLIGHT;
      }
      directionLabels.push(text);
    });

    // Needle
    this.compassNeedle = new Graphics();
    this.compassNeedle.moveTo(0, -COMPASS_SIZE / 2 + 12);
    this.compassNeedle.lineTo(-4, 0);
    this.compassNeedle.lineTo(0, 4);
    this.compassNeedle.lineTo(4, 0);
    this.compassNeedle.closePath();
    this.compassNeedle.fill({ color: COLORS.UI_HIGHLIGHT });

    container.addChild(this.compassRose);
    directionLabels.forEach(label => container.addChild(label));
    container.addChild(this.compassNeedle);

    return container;
  }

  public setCameraRotation(rotation: number): void {
    this.compassNeedle.rotation = -rotation;
  }

  // ============================================
  // TIME PANEL
  // ============================================

  private createTimePanel(): Container {
    const container = new Container();

    // Background
    this.timePanelBg = new Graphics();
    this.timePanelBg.roundRect(0, 0, TIME_PANEL_WIDTH, TIME_PANEL_HEIGHT, 8);
    this.timePanelBg.fill({ color: COLORS.UI_PANEL, alpha: 0.8 });
    this.timePanelBg.roundRect(0, 0, TIME_PANEL_WIDTH, TIME_PANEL_HEIGHT, 8);
    this.timePanelBg.stroke({ width: 2, color: COLORS.UI_BORDER });

    // Day text
    const dayStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: COLORS.UI_TEXT_DIM,
    });
    this.dayText = new Text({ text: 'Day 1', style: dayStyle });
    this.dayText.position.set(8, 6);

    // Time text
    const timeStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      fill: COLORS.UI_TEXT,
    });
    this.timeText = new Text({ text: '06:00', style: timeStyle });
    this.timeText.position.set(8, 22);

    // Time of day indicator
    this.timeIndicator = new Graphics();
    this.timeIndicator.circle(TIME_PANEL_WIDTH - 20, TIME_PANEL_HEIGHT / 2, 8);
    this.timeIndicator.fill({ color: getTimeOfDayTint('morning') });

    container.addChild(this.timePanelBg);
    container.addChild(this.dayText);
    container.addChild(this.timeText);
    container.addChild(this.timeIndicator);

    return container;
  }

  public updateGameTime(gameTime: GameTime): void {
    // Update day
    this.dayText.text = `Day ${gameTime.day}`;

    // Update time (HH:MM format)
    const hours = gameTime.hour.toString().padStart(2, '0');
    const minutes = gameTime.minute.toString().padStart(2, '0');
    this.timeText.text = `${hours}:${minutes}`;

    // Update time indicator color
    const timeOfDay = getTimeOfDay(gameTime.hour);
    const tint = getTimeOfDayTint(timeOfDay);
    this.timeIndicator.clear();
    this.timeIndicator.circle(TIME_PANEL_WIDTH - 20, TIME_PANEL_HEIGHT / 2, 8);
    this.timeIndicator.fill({ color: tint });
  }

  // ============================================
  // ZOOM INDICATOR
  // ============================================

  private createZoomIndicator(): Container {
    const container = new Container();

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: COLORS.UI_TEXT_DIM,
    });

    this.zoomText = new Text({ text: '100%', style });
    this.zoomText.anchor.set(1, 1);

    container.addChild(this.zoomText);

    return container;
  }

  public updateZoom(zoom: number): void {
    const percentage = Math.round(zoom * 100);
    this.zoomText.text = `${percentage}%`;
  }

  // ============================================
  // LAYOUT
  // ============================================

  public setScreenSize(width: number, height: number): void {
    this.screenSize = { x: width, y: height };
    this.updateLayout();
  }

  private updateLayout(): void {
    // Compass - top right
    this.compass.position.set(
      this.screenSize.x - COMPASS_SIZE / 2 - UI_PADDING,
      COMPASS_SIZE / 2 + UI_PADDING
    );

    // Time panel - top left
    this.timePanel.position.set(UI_PADDING, UI_PADDING);

    // Zoom indicator - bottom right
    this.zoomIndicator.position.set(
      this.screenSize.x - UI_PADDING,
      this.screenSize.y - UI_PADDING
    );
  }

  // ============================================
  // VISIBILITY
  // ============================================

  public setCompassVisible(visible: boolean): void {
    this.compass.visible = visible;
  }

  public setTimePanelVisible(visible: boolean): void {
    this.timePanel.visible = visible;
  }

  public setZoomIndicatorVisible(visible: boolean): void {
    this.zoomIndicator.visible = visible;
  }

  // ============================================
  // UPDATE
  // ============================================

  public update(_deltaTime: number): void {
    // UI layer doesn't need continuous updates currently
    // But keeping the method for future animated elements
  }

  // ============================================
  // CLEANUP
  // ============================================

  public destroy(): void {
    super.destroy({ children: true });
  }
}
