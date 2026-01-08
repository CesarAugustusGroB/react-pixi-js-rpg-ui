// SeededRandom - Deterministic random number generator
// Uses Mulberry32 algorithm for reproducible procedural generation

// ============================================
// MULBERRY32 PRNG
// ============================================

/**
 * Mulberry32 is a simple, fast 32-bit PRNG with good distribution.
 * Perfect for game world generation where reproducibility is needed.
 */
export class SeededRandom {
  private state: number;
  private initialSeed: number;

  constructor(seed: number | string) {
    this.initialSeed = this.hashSeed(seed);
    this.state = this.initialSeed;
  }

  /**
   * Convert string or number seed to 32-bit integer
   */
  private hashSeed(seed: number | string): number {
    if (typeof seed === 'number') {
      return seed >>> 0; // Convert to unsigned 32-bit
    }

    // Hash string using djb2 algorithm
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    }
    return hash >>> 0;
  }

  /**
   * Get the next random number [0, 1)
   */
  public next(): number {
    // Mulberry32 algorithm
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in range [min, max] (inclusive)
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max)
   */
  public nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Get random boolean with optional probability
   */
  public nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick a random item from array
   */
  public pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Pick multiple unique random items from array
   */
  public pickMultiple<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error('Cannot pick more items than array length');
    }

    const copy = [...array];
    const result: T[] = [];

    for (let i = 0; i < count; i++) {
      const index = this.nextInt(0, copy.length - 1);
      result.push(copy[index]);
      copy.splice(index, 1);
    }

    return result;
  }

  /**
   * Shuffle array in place using Fisher-Yates
   */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get random point within bounds
   */
  public nextPoint(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): { x: number; y: number } {
    return {
      x: this.nextFloat(minX, maxX),
      y: this.nextFloat(minY, maxY),
    };
  }

  /**
   * Get random point within circle
   */
  public nextPointInCircle(
    centerX: number,
    centerY: number,
    radius: number
  ): { x: number; y: number } {
    const angle = this.next() * Math.PI * 2;
    const r = Math.sqrt(this.next()) * radius;
    return {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
    };
  }

  /**
   * Get weighted random selection
   */
  public weightedPick<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights must have same length');
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Get Gaussian (normal) distributed random number
   * Uses Box-Muller transform
   */
  public nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Reset to initial seed state
   */
  public reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Get current state (for save/load)
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Set state directly (for save/load)
   */
  public setState(state: number): void {
    this.state = state >>> 0;
  }

  /**
   * Fork a new PRNG with derived seed
   */
  public fork(modifier: string = ''): SeededRandom {
    const derivedSeed = this.hashSeed(`${this.initialSeed}_${modifier}_${this.next()}`);
    return new SeededRandom(derivedSeed);
  }
}

// ============================================
// NOISE HELPERS
// ============================================

/**
 * Simple 1D noise function
 */
export function noise1D(rng: SeededRandom, x: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    // Use deterministic sampling based on position
    const ix = Math.floor(x * frequency);
    rng.setState(ix >>> 0);
    const sample = rng.next() * 2 - 1;

    value += sample * amplitude;
    maxValue += amplitude;

    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Simple 2D value noise
 */
export function noise2D(
  rng: SeededRandom,
  x: number,
  y: number,
  scale: number = 1
): number {
  const sx = x * scale;
  const sy = y * scale;

  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  // Get corner values
  const getValue = (px: number, py: number): number => {
    rng.setState(((px * 12345 + py * 67890) >>> 0) % 2147483647);
    return rng.next();
  };

  const v00 = getValue(ix, iy);
  const v10 = getValue(ix + 1, iy);
  const v01 = getValue(ix, iy + 1);
  const v11 = getValue(ix + 1, iy + 1);

  // Smooth interpolation
  const smoothFx = fx * fx * (3 - 2 * fx);
  const smoothFy = fy * fy * (3 - 2 * fy);

  const i0 = v00 * (1 - smoothFx) + v10 * smoothFx;
  const i1 = v01 * (1 - smoothFx) + v11 * smoothFx;

  return i0 * (1 - smoothFy) + i1 * smoothFy;
}
