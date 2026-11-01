import { describe, expect, it } from 'vitest';
import { allProducts } from '../catalog';
import { DAILY_SWING } from '../config';
import { currentPrice, rollPrices } from '../market';
import { createInitialState } from '../reducer';
import { createRng } from '../rng';

describe('rollPrices', () => {
  it('一般商品的價格在基準價 ±10% 內，而且是 10 的倍數', () => {
    const rng = createRng(3);
    for (let day = 1; day <= 30; day++) {
      const prices = rollPrices(day, rng);
      for (const p of allProducts().filter((p) => !p.limited && !p.fixedPrice)) {
        const price = prices[p.id];
        expect(price % 10).toBe(0);
        expect(price).toBeGreaterThanOrEqual(p.basePrice * (1 - DAILY_SWING) - 5);
        expect(price).toBeLessThanOrEqual(p.basePrice * (1 + DAILY_SWING) + 5);
      }
    }
  });

  it('限量品長期會漲價', () => {
    const limited = allProducts().find((p) => p.limited)!;
    const early = rollPrices(1, createRng(9))[limited.id];
    const late = rollPrices(60, createRng(9))[limited.id];
    expect(late).toBeGreaterThan(early * 1.5);
  });
});

describe('currentPrice', () => {
  it('限時特價商品套用折扣，其他商品維持牌價', () => {
    const s = createInitialState(11);
    const fs = s.flashSale!;
    const listed = s.prices[fs.productId];
    expect(currentPrice(s, fs.productId)).toBe(Math.round((listed * (100 - fs.discountPercent)) / 100 / 10) * 10);

    const other = allProducts().find((p) => p.id !== fs.productId)!;
    expect(currentPrice(s, other.id)).toBe(s.prices[other.id]);
  });

  it('不存在的商品回傳 undefined', () => {
    expect(currentPrice(createInitialState(1), 'no-such-item')).toBeUndefined();
  });
});
