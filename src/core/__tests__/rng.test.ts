import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';

describe('createRng', () => {
  it('同一個 seed 產生同一串數字', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('從存下來的 state 可以接續同一串數字', () => {
    const a = createRng(7);
    a.next();
    const resumed = createRng(a.state());
    expect(resumed.next()).toBe(a.next());
  });

  it('next() 落在 [0, 1)，int() 落在 [min, max]', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = r.int(2, 4);
      expect([2, 3, 4]).toContain(n);
    }
  });
});
