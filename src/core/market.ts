import { allProducts, getProduct, round10 } from './catalog';
import {
  COUPON_DROP_CHANCE,
  COUPON_LIFETIME_DAYS,
  COUPON_TEMPLATES,
  DAILY_SWING,
  FLASH_SALE_DISCOUNTS,
  LIMITED_DAILY_GROWTH,
} from './config';
import type { Rng } from './rng';
import type { Coupon, FlashSale, GameState, Money, ProductId } from './types';

export function rollPrices(day: number, rng: Rng): Record<ProductId, Money> {
  const prices: Record<ProductId, Money> = {};
  for (const p of allProducts()) {
    const growth = p.limited ? 1 + LIMITED_DAILY_GROWTH * (day - 1) : 1;
    const swing = 1 - DAILY_SWING + rng.next() * DAILY_SWING * 2;
    prices[p.id] = Math.max(10, round10(p.basePrice * growth * swing));
  }
  return prices;
}

export function rollFlashSale(day: number, rng: Rng): FlashSale {
  const product = rng.pick(allProducts());
  return { productId: product.id, discountPercent: rng.pick(FLASH_SALE_DISCOUNTS), endsDay: day };
}

export function maybeDropCoupon(day: number, rng: Rng, id: string): Coupon | null {
  if (rng.next() >= COUPON_DROP_CHANCE) return null;
  const t = rng.pick(COUPON_TEMPLATES);
  return { id, ...t, expiresDay: day + COUPON_LIFETIME_DAYS - 1 };
}

/** 實際售價：牌價再套用限時特價 */
export function currentPrice(state: GameState, id: ProductId): Money | undefined {
  const listed = state.prices[id];
  if (listed === undefined || !getProduct(id)) return undefined;
  const fs = state.flashSale;
  if (fs && fs.productId === id && fs.endsDay >= state.day) {
    return round10((listed * (100 - fs.discountPercent)) / 100);
  }
  return listed;
}
