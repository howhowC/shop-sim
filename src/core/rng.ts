// Mulberry32：小而快的 seeded PRNG。同一個 seed 一定產生同一串數字。

export interface Rng {
  /** 回傳 [0, 1) 的亂數 */
  next(): number;
  /** 回傳 [min, max] 的整數 */
  int(min: number, max: number): number;
  /** 從陣列隨機挑一個 */
  pick<T>(items: readonly T[]): T;
  /** 目前的內部狀態，存回 GameState.rngState */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() from empty array');
      return items[Math.floor(next() * items.length)];
    },
    state: () => s,
  };
}
