# Visual Design

Colors, sizes, fonts, and animation utilities.

## Table of Contents

1. [Colors](#colors)
2. [Sizes](#sizes)
3. [Fonts](#fonts)
4. [Easing Functions](#easing-functions)
5. [Spring Physics](#spring-physics)

---

## Colors

```typescript
// src/pixi/utils/colors.ts

export const COLORS = {
  // Backgrounds
  background: 0x1a1a2e,
  backgroundLight: 0x232342,

  // Discovery states
  discovered: 0xeaeaea,
  visited: 0x4ecdc4,
  rumored: 0x6a6a8a,
  rumoredText: 0x9a9aba,

  // Paths
  road: 0x8a8aaa,
  trail: 0x6a6a7a,
  wilderness: 0x4a4a5a,
  pathHidden: 0x3a3a4a,

  // States
  selected: 0x4ecdc4,
  hover: 0x7eddd4,
  danger: 0xff6b6b,
  warning: 0xffd93d,
  safe: 0x51cf66,

  // Events
  caravan: 0xffd93d,
  raid: 0xff6b6b,
  festival: 0xcc99ff,
  storm: 0x74b9ff,

  // UI
  text: 0xeaeaea,
  textMuted: 0x9a9aba,
  border: 0x4a4a6a,
  accent: 0x4ecdc4,

  // Icons
  iconFill: 0x2a2a4e,
  iconStroke: 0xeaeaea,
};
```

## Sizes

```typescript
export const SIZES = {
  // Nodes
  nodeRadius: 20,
  nodeRadiusSmall: 14,
  nodeRadiusLarge: 28,
  iconSize: 8,

  // Paths
  pathWidth: 4,
  pathWidthThin: 2,
  pathWidthThick: 6,

  // Player
  playerSize: 12,

  // Events
  eventMarkerSize: 16,

  // UI
  tooltipPadding: 12,
  labelOffset: 8,
};
```

## Fonts

```typescript
export const FONTS = {
  label: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '400',
  },
};
```

## Easing Functions

```typescript
// src/pixi/utils/easing.ts

export const easing = {
  // Standard easings
  linear: (t: number) => t,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5
    ? 4 * t * t * t
    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Elastic (for UI feedback)
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },

  // Back (overshoot)
  easeOutBack: (t: number) => {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  },

  // Bounce
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};
```

## Spring Physics

Natural motion with spring dynamics.

```typescript
export class Spring {
  position: number = 0;
  velocity: number = 0;
  target: number = 0;

  stiffness: number;
  damping: number;

  constructor(stiffness = 100, damping = 10) {
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target: number): void {
    this.target = target;
  }

  update(deltaSeconds: number): number {
    const force = (this.target - this.position) * this.stiffness;
    const dampingForce = this.velocity * this.damping;

    this.velocity += (force - dampingForce) * deltaSeconds;
    this.position += this.velocity * deltaSeconds;

    return this.position;
  }

  isSettled(threshold = 0.01): boolean {
    return Math.abs(this.position - this.target) < threshold &&
           Math.abs(this.velocity) < threshold;
  }
}
```

### Spring Presets

```typescript
// Common spring configurations
export const SPRING_PRESETS = {
  // Snappy UI interactions
  snappy: { stiffness: 400, damping: 30 },

  // Bouncy item pickups
  bouncy: { stiffness: 300, damping: 10 },

  // Smooth camera/health bar
  smooth: { stiffness: 100, damping: 20 },

  // Very soft transitions
  gentle: { stiffness: 50, damping: 15 },
};
```

### Day/Night Lighting

```typescript
// TimeVisualizer lighting tints
export const TIME_TINTS = {
  dawn: 0xffd4a3,      // Warm orange
  morning: 0xffffff,    // Full brightness
  afternoon: 0xfff8e7,  // Slight yellow
  dusk: 0xff9966,       // Orange-red
  evening: 0x6677aa,    // Blue tint
  night: 0x334466,      // Dark blue
};

export const TIME_AMBIENT = {
  dawn: 0.6,
  morning: 1.0,
  afternoon: 0.95,
  dusk: 0.7,
  evening: 0.5,
  night: 0.3,
};
```
