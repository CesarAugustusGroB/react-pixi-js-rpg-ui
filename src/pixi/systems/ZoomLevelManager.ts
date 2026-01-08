// ZoomLevelManager - Manages discrete zoom levels with content transitions
// Handles Region → Zone → Local hierarchy with smooth animations

// ============================================
// ZOOM LEVEL TYPES
// ============================================

export type ZoomLevel = 'region' | 'zone' | 'local';

export interface ZoomLevelConfig {
  /** Numeric zoom value for this level */
  zoomValue: number;
  /** Minimum zoom before transitioning to previous level */
  minThreshold: number;
  /** Maximum zoom before transitioning to next level */
  maxThreshold: number;
  /** What content is visible at this level */
  visibleContent: {
    majorLocations: boolean;
    minorLocations: boolean;
    paths: boolean;
    npcs: boolean;
    events: boolean;
    localDetails: boolean;
    zoneBoundaries: boolean;
  };
}

export interface HierarchyContext {
  regionId: string;
  zoneId: string | null;
  locationId: string | null;
}

// ============================================
// CONFIGURATION
// ============================================

const ZOOM_LEVELS: Record<ZoomLevel, ZoomLevelConfig> = {
  region: {
    zoomValue: 0.4,
    minThreshold: 0.3,
    maxThreshold: 0.6,
    visibleContent: {
      majorLocations: true,
      minorLocations: false,
      paths: false,
      npcs: false,
      events: false,
      localDetails: false,
      zoneBoundaries: true,
    },
  },
  zone: {
    zoomValue: 1.0,
    minThreshold: 0.6,
    maxThreshold: 1.5,
    visibleContent: {
      majorLocations: true,
      minorLocations: true,
      paths: true,
      npcs: true,
      events: true,
      localDetails: false,
      zoneBoundaries: false,
    },
  },
  local: {
    zoomValue: 2.0,
    minThreshold: 1.5,
    maxThreshold: 3.0,
    visibleContent: {
      majorLocations: true,
      minorLocations: true,
      paths: true,
      npcs: true,
      events: true,
      localDetails: true,
      zoneBoundaries: false,
    },
  },
};

export interface ZoomLevelManagerConfig {
  /** Enable automatic level transitions on zoom */
  autoTransition: boolean;
  /** Transition duration in seconds */
  transitionDuration: number;
  /** Enable snapping to discrete zoom values */
  snapToLevels: boolean;
  /** Snap threshold (how close before snapping) */
  snapThreshold: number;
}

const DEFAULT_CONFIG: ZoomLevelManagerConfig = {
  autoTransition: true,
  transitionDuration: 0.4,
  snapToLevels: true,
  snapThreshold: 0.15,
};

// ============================================
// ZOOM LEVEL MANAGER
// ============================================

export class ZoomLevelManager {
  private config: ZoomLevelManagerConfig;
  private currentLevel: ZoomLevel = 'zone';
  private hierarchyContext: HierarchyContext = {
    regionId: '',
    zoneId: null,
    locationId: null,
  };

  // Transition state
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionFrom: ZoomLevel | null = null;
  private transitionTo: ZoomLevel | null = null;

  // Callbacks
  private onLevelChange: ((level: ZoomLevel, context: HierarchyContext) => void) | null = null;
  private onTransitionStart: ((from: ZoomLevel, to: ZoomLevel) => void) | null = null;
  private onTransitionEnd: ((level: ZoomLevel) => void) | null = null;
  private onVisibilityChange: ((config: ZoomLevelConfig['visibleContent']) => void) | null = null;

  constructor(config: Partial<ZoomLevelManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // CALLBACKS
  // ============================================

  public setLevelChangeCallback(
    callback: (level: ZoomLevel, context: HierarchyContext) => void
  ): void {
    this.onLevelChange = callback;
  }

  public setTransitionStartCallback(
    callback: (from: ZoomLevel, to: ZoomLevel) => void
  ): void {
    this.onTransitionStart = callback;
  }

  public setTransitionEndCallback(callback: (level: ZoomLevel) => void): void {
    this.onTransitionEnd = callback;
  }

  public setVisibilityChangeCallback(
    callback: (config: ZoomLevelConfig['visibleContent']) => void
  ): void {
    this.onVisibilityChange = callback;
  }

  // ============================================
  // LEVEL MANAGEMENT
  // ============================================

  /**
   * Get the current zoom level
   */
  public getCurrentLevel(): ZoomLevel {
    return this.currentLevel;
  }

  /**
   * Get the current hierarchy context
   */
  public getHierarchyContext(): HierarchyContext {
    return { ...this.hierarchyContext };
  }

  /**
   * Get configuration for a zoom level
   */
  public getLevelConfig(level: ZoomLevel): ZoomLevelConfig {
    return ZOOM_LEVELS[level];
  }

  /**
   * Get the numeric zoom value for a level
   */
  public getLevelZoomValue(level: ZoomLevel): number {
    return ZOOM_LEVELS[level].zoomValue;
  }

  /**
   * Set the current zoom level directly (with optional animation)
   */
  public setLevel(level: ZoomLevel, animate: boolean = true): void {
    if (level === this.currentLevel) return;

    if (animate && this.config.autoTransition) {
      this.startTransition(this.currentLevel, level);
    } else {
      this.currentLevel = level;
      this.onLevelChange?.(level, this.hierarchyContext);
      this.onVisibilityChange?.(ZOOM_LEVELS[level].visibleContent);
    }
  }

  /**
   * Set the hierarchy context (what region/zone/location we're viewing)
   */
  public setHierarchyContext(context: Partial<HierarchyContext>): void {
    this.hierarchyContext = { ...this.hierarchyContext, ...context };
  }

  /**
   * Enter a specific context (zoom in to a zone or location)
   */
  public enterContext(type: 'zone' | 'location', id: string): void {
    if (type === 'zone') {
      this.hierarchyContext.zoneId = id;
      this.setLevel('zone');
    } else if (type === 'location') {
      this.hierarchyContext.locationId = id;
      this.setLevel('local');
    }
  }

  /**
   * Exit current context (zoom out)
   */
  public exitContext(): void {
    if (this.currentLevel === 'local') {
      this.hierarchyContext.locationId = null;
      this.setLevel('zone');
    } else if (this.currentLevel === 'zone') {
      this.hierarchyContext.zoneId = null;
      this.setLevel('region');
    }
  }

  // ============================================
  // ZOOM VALUE HANDLING
  // ============================================

  /**
   * Check if a zoom value should trigger a level change
   */
  public checkZoomTransition(zoomValue: number): ZoomLevel | null {
    if (!this.config.autoTransition || this.isTransitioning) {
      return null;
    }

    const currentConfig = ZOOM_LEVELS[this.currentLevel];

    // Check if we should zoom out
    if (zoomValue < currentConfig.minThreshold) {
      const prevLevel = this.getPreviousLevel(this.currentLevel);
      if (prevLevel) {
        return prevLevel;
      }
    }

    // Check if we should zoom in
    if (zoomValue > currentConfig.maxThreshold) {
      const nextLevel = this.getNextLevel(this.currentLevel);
      if (nextLevel) {
        return nextLevel;
      }
    }

    return null;
  }

  /**
   * Get the snapped zoom value if within threshold
   */
  public getSnappedZoom(zoomValue: number): number {
    if (!this.config.snapToLevels) {
      return zoomValue;
    }

    const targetZoom = ZOOM_LEVELS[this.currentLevel].zoomValue;
    const diff = Math.abs(zoomValue - targetZoom);

    if (diff < this.config.snapThreshold) {
      return targetZoom;
    }

    return zoomValue;
  }

  /**
   * Get zoom level from a zoom value
   */
  public getLevelFromZoom(zoomValue: number): ZoomLevel {
    if (zoomValue < ZOOM_LEVELS.region.maxThreshold) {
      return 'region';
    }
    if (zoomValue > ZOOM_LEVELS.zone.maxThreshold) {
      return 'local';
    }
    return 'zone';
  }

  // ============================================
  // TRANSITIONS
  // ============================================

  /**
   * Start a transition between levels
   */
  private startTransition(from: ZoomLevel, to: ZoomLevel): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionFrom = from;
    this.transitionTo = to;
    this.onTransitionStart?.(from, to);
  }

  /**
   * Update transition progress
   */
  public updateTransition(deltaTime: number): boolean {
    if (!this.isTransitioning || !this.transitionTo) {
      return false;
    }

    this.transitionProgress += deltaTime / this.config.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.completeTransition();
      return true;
    }

    return true;
  }

  /**
   * Complete the current transition
   */
  private completeTransition(): void {
    if (!this.transitionTo) return;

    this.currentLevel = this.transitionTo;
    this.isTransitioning = false;
    this.transitionProgress = 0;

    this.onLevelChange?.(this.currentLevel, this.hierarchyContext);
    this.onVisibilityChange?.(ZOOM_LEVELS[this.currentLevel].visibleContent);
    this.onTransitionEnd?.(this.currentLevel);

    this.transitionFrom = null;
    this.transitionTo = null;
  }

  /**
   * Get transition progress (0-1)
   */
  public getTransitionProgress(): number {
    return this.transitionProgress;
  }

  /**
   * Check if currently transitioning
   */
  public getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Get interpolated zoom value during transition
   */
  public getTransitionZoom(): number {
    if (!this.isTransitioning || !this.transitionFrom || !this.transitionTo) {
      return ZOOM_LEVELS[this.currentLevel].zoomValue;
    }

    const fromZoom = ZOOM_LEVELS[this.transitionFrom].zoomValue;
    const toZoom = ZOOM_LEVELS[this.transitionTo].zoomValue;

    // Ease out cubic for smooth feel
    const t = 1 - Math.pow(1 - this.transitionProgress, 3);

    return fromZoom + (toZoom - fromZoom) * t;
  }

  // ============================================
  // HELPERS
  // ============================================

  private getPreviousLevel(level: ZoomLevel): ZoomLevel | null {
    switch (level) {
      case 'local':
        return 'zone';
      case 'zone':
        return 'region';
      case 'region':
        return null;
    }
  }

  private getNextLevel(level: ZoomLevel): ZoomLevel | null {
    switch (level) {
      case 'region':
        return 'zone';
      case 'zone':
        return 'local';
      case 'local':
        return null;
    }
  }

  /**
   * Get visibility config for the current level
   */
  public getCurrentVisibility(): ZoomLevelConfig['visibleContent'] {
    return ZOOM_LEVELS[this.currentLevel].visibleContent;
  }

  /**
   * Check if a specific content type is visible at current level
   */
  public isVisible(content: keyof ZoomLevelConfig['visibleContent']): boolean {
    return ZOOM_LEVELS[this.currentLevel].visibleContent[content];
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  public setConfig(config: Partial<ZoomLevelManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): ZoomLevelManagerConfig {
    return { ...this.config };
  }
}

// ============================================
// FACTORY
// ============================================

export function createZoomLevelManager(
  config?: Partial<ZoomLevelManagerConfig>
): ZoomLevelManager {
  return new ZoomLevelManager(config);
}
