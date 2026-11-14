/**
 * Deterministic pseudo-random number generation.
 * mulberry32: 1 multiply, 3 xor-shifts per call — no allocations.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive integer range. */
export const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const randFloat = (rng: Rng, min: number, max: number): number =>
  min + rng() * (max - min);

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** O(1) Fisher–Yates draw of one weighted item. */
export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | null {
  let total = 0;
  for (const item of items) total += weight(item);
  if (total <= 0) return null;
  let shot = rng() * total;
  for (const item of items) {
    shot -= weight(item);
    if (shot <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

/** Round to a "nice" auction number (nearest 10 / 25 / 50 depending on size). */
export function roundBid(value: number): number {
  const step = value < 1000 ? 5 : value < 10000 ? 25 : value < 100000 ? 100 : 500;
  return Math.round(value / step) * step;
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
