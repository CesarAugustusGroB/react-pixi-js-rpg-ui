// Easing Functions and Animation Utilities
// For smooth map animations and transitions

// ============================================
// EASING FUNCTIONS
// ============================================

export type EasingFunction = (t: number) => number;

export const Easing = {
  // Linear
  linear: (t: number): number => t,

  // Quadratic
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quartic
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // Elastic
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Bounce
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },

  // Back (overshoot)
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  // Smooth step (good for fog transitions)
  smoothStep: (t: number): number => t * t * (3 - 2 * t),
  smootherStep: (t: number): number => t * t * t * (t * (t * 6 - 15) + 10),
} as const;

// ============================================
// SPRING PHYSICS
// ============================================

export interface SpringConfig {
  stiffness: number;  // Spring constant (default: 170)
  damping: number;    // Friction (default: 26)
  mass: number;       // Mass (default: 1)
  precision: number;  // When to consider settled (default: 0.01)
}

export const SPRING_PRESETS: Record<string, SpringConfig> = {
  default: { stiffness: 170, damping: 26, mass: 1, precision: 0.01 },
  gentle: { stiffness: 120, damping: 14, mass: 1, precision: 0.01 },
  wobbly: { stiffness: 180, damping: 12, mass: 1, precision: 0.01 },
  stiff: { stiffness: 210, damping: 20, mass: 1, precision: 0.01 },
  slow: { stiffness: 280, damping: 60, mass: 1, precision: 0.01 },
  molasses: { stiffness: 280, damping: 120, mass: 1, precision: 0.01 },
};

export class Spring {
  private config: SpringConfig;
  private position: number;
  private velocity: number;
  private target: number;

  constructor(initialValue: number = 0, config: Partial<SpringConfig> = {}) {
    this.config = { ...SPRING_PRESETS.default, ...config };
    this.position = initialValue;
    this.velocity = 0;
    this.target = initialValue;
  }

  setTarget(target: number): void {
    this.target = target;
  }

  setPosition(position: number): void {
    this.position = position;
    this.velocity = 0;
  }

  update(deltaTime: number): number {
    const { stiffness, damping, mass } = this.config;

    // Calculate spring force
    const springForce = -stiffness * (this.position - this.target);
    const dampingForce = -damping * this.velocity;
    const acceleration = (springForce + dampingForce) / mass;

    // Update velocity and position
    this.velocity += acceleration * deltaTime;
    this.position += this.velocity * deltaTime;

    return this.position;
  }

  isSettled(): boolean {
    const { precision } = this.config;
    return (
      Math.abs(this.position - this.target) < precision &&
      Math.abs(this.velocity) < precision
    );
  }

  getValue(): number {
    return this.position;
  }

  getTarget(): number {
    return this.target;
  }
}

// ============================================
// TWEEN ANIMATION
// ============================================

export interface TweenOptions {
  duration: number;
  easing?: EasingFunction;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export class Tween {
  private startValue: number;
  private endValue: number;
  private duration: number;
  private easing: EasingFunction;
  private onUpdate?: (value: number) => void;
  private onComplete?: () => void;
  private elapsed: number = 0;
  private isRunning: boolean = false;

  constructor(
    startValue: number,
    endValue: number,
    options: TweenOptions
  ) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.duration = options.duration;
    this.easing = options.easing ?? Easing.easeOutQuad;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
    this.isRunning = true;
  }

  update(deltaTime: number): number {
    if (!this.isRunning) return this.endValue;

    this.elapsed += deltaTime;
    const t = Math.min(this.elapsed / this.duration, 1);
    const easedT = this.easing(t);
    const value = this.startValue + (this.endValue - this.startValue) * easedT;

    this.onUpdate?.(value);

    if (t >= 1) {
      this.isRunning = false;
      this.onComplete?.();
    }

    return value;
  }

  isComplete(): boolean {
    return !this.isRunning;
  }

  stop(): void {
    this.isRunning = false;
  }
}

// ============================================
// ANIMATION HELPERS
// ============================================

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function damp(
  current: number,
  target: number,
  smoothing: number,
  deltaTime: number
): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * deltaTime));
}

export function oscillate(
  time: number,
  frequency: number,
  amplitude: number,
  offset: number = 0
): number {
  return Math.sin(time * frequency * Math.PI * 2) * amplitude + offset;
}

export function pulse(
  time: number,
  frequency: number,
  min: number = 0,
  max: number = 1
): number {
  const t = (Math.sin(time * frequency * Math.PI * 2) + 1) / 2;
  return lerp(min, max, t);
}
