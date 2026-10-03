// Mulberry32 seeded Pseudo-Random Number Generator (PRNG)
export class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  // Returns float between 0 (inclusive) and 1 (exclusive)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Range inclusive [min, max]
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Integer range inclusive [min, max]
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Pick random item from array
  pick<T>(items: T[]): T {
    const idx = this.rangeInt(0, items.length - 1);
    return items[idx];
  }

  // Boolean probability chance (0.0 to 1.0)
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}
