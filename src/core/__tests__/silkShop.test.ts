import { describe, expect, it } from 'vitest';
import { allProducts, getProduct } from '../catalog';
import { SILK_CAPACITY, SILK_EXPANSION_SLOTS, SILK_MAX_EXPANSIONS, SILK_PRICES } from '../config';
import { fillMissingPrices } from '../market';
import { createInitialState } from '../reducer';
import { silkCapacity, summarizeSilkCart } from '../silk';
import type { Coupon, GameState } from '../types';
import { run } from './helpers';

const TODAY = '2026-11-02';
const coupon: Coupon = { id: 'c-test', minSpend: 100, discount: 30, expiresDay: 99 };
const withCoupon = (s: GameState): GameState => ({ ...s, coupons: [coupon] });

describe('養蠶小店：購物車', () => {
  it('加入、改數量、數量 0 會移除', () => {
    let s = run(createInitialState(1), { type: 'silkCartSet', item: 'leaf', qty: 3 }, { type: 'silkCartSet', item: 'egg', qty: 1 });
    expect(summarizeSilkCart(s).subtotal).toBe(SILK_PRICES.leaf * 3 + SILK_PRICES.egg);
    s = run(s, { type: 'silkCartSet', item: 'leaf', qty: 0 });
    expect(s.silkCart).toEqual({ egg: 1 });
  });

  it('結帳：可以用優惠券，立即到貨，購物車清空、優惠券用掉', () => {
    const s0 = run(withCoupon(createInitialState(1)), { type: 'silkCartSet', item: 'leaf', qty: 5 }, { type: 'silkCartSet', item: 'speedup', qty: 2 });
    const subtotal = SILK_PRICES.leaf * 5 + SILK_PRICES.speedup * 2;
    const s = run(s0, { type: 'silkCheckout', couponId: coupon.id, today: TODAY });
    expect(s.money).toBe(s0.money - (subtotal - coupon.discount));
    expect(s.silk).toMatchObject({ leaves: 5, speedups: 2 });
    expect(s.silkCart).toEqual({});
    expect(s.coupons).toHaveLength(0);
    expect(s.events).toEqual([{ type: 'silkOrderPaid', total: subtotal - coupon.discount, discount: coupon.discount }]);
  });

  it('沒達到門檻的優惠券會被拒絕', () => {
    const s0 = run(withCoupon(createInitialState(1)), { type: 'silkCartSet', item: 'leaf', qty: 1 });
    const s = run(s0, { type: 'silkCheckout', couponId: coupon.id, today: TODAY });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'coupon_threshold_not_met' }]);
  });

  it('空購物車不能結帳', () => {
    const s = run(createInitialState(1), { type: 'silkCheckout', today: TODAY });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'empty_cart' }]);
  });

  it('發不出去（擴充超過上限）時整筆拒絕：不扣錢、購物車和優惠券都還在', () => {
    const s0 = run(withCoupon(createInitialState(1)), { type: 'silkCartSet', item: 'habitat', qty: SILK_MAX_EXPANSIONS + 1 });
    const s = run({ ...s0, money: 1_000_000 }, { type: 'silkCheckout', couponId: coupon.id, today: TODAY });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_box_max' }]);
    expect({ ...s, events: [] }).toEqual({ ...s0, money: 1_000_000, events: [] });
  });

  it('蠶卵結帳後收進庫存，飼養盒滿了也能買', () => {
    const s0 = run(createInitialState(1), { type: 'silkCartSet', item: 'egg', qty: SILK_CAPACITY + 1 });
    const s = run({ ...s0, money: 1_000_000 }, { type: 'silkCheckout', today: TODAY });
    expect(s.silk.eggStock.egg).toBe(SILK_CAPACITY + 1);
  });
});

describe('養蠶小店：飼養盒擴充', () => {
  it('擴充後容量增加，蠶卵可以放更多', () => {
    let s = run(createInitialState(1), { type: 'silkBuy', item: 'habitat', today: TODAY });
    expect(silkCapacity(s)).toBe(SILK_CAPACITY + SILK_EXPANSION_SLOTS);
    s = { ...s, money: 1_000_000 };
    s = run(
      s,
      { type: 'silkBuy', item: 'egg', qty: SILK_CAPACITY + 1, today: TODAY },
      { type: 'silkPlaceEggs', kind: 'egg', qty: SILK_CAPACITY + 1, today: TODAY },
    );
    expect(s.silk.worms).toHaveLength(SILK_CAPACITY + 1);
  });

  it('擴充到上限後不能再擴充', () => {
    const s0: GameState = { ...createInitialState(1), money: 1_000_000 };
    let s = run(s0, { type: 'silkBuy', item: 'habitat', qty: SILK_MAX_EXPANSIONS, today: TODAY });
    expect(s.silk.expansions).toBe(SILK_MAX_EXPANSIONS);
    s = run(s, { type: 'silkBuy', item: 'habitat', today: TODAY });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_box_max' }]);
  });
});

describe('主商城的養蠶用品', () => {
  it('商品價格和養蠶小店一致，而且是固定價', () => {
    for (const p of allProducts()) {
      if (!p.silk) continue;
      expect(p.basePrice, p.id).toBe(SILK_PRICES[p.silk.item] * p.silk.qty);
      expect(p.fixedPrice, p.id).toBe(true);
    }
  });

  it('只買養蠶用品：結帳立即到貨（蠶卵進庫存），訂單直接標成已到貨、已開箱，不會進房間', () => {
    const s = run(createInitialState(1), { type: 'addToCart', productId: 'silkworm', qty: 2 }, { type: 'checkout' });
    expect(s.silk.eggStock.egg).toBe(2);
    expect(s.orders[0]).toMatchObject({ deliveryDay: s.day, opened: true });
    expect(s.events).toContainEqual({ type: 'silkDelivered', items: [{ item: 'egg', qty: 2 }] });
    expect(s.inventory).toHaveLength(0);
  });

  it('混合購物車：養蠶用品立即到貨，其他商品照常物流', () => {
    const s = run(
      createInitialState(1),
      { type: 'addToCart', productId: 'mulberry-leaf', qty: 3 },
      { type: 'addToCart', productId: 'sticker' },
      { type: 'checkout' },
    );
    expect(s.silk.leaves).toBe(3);
    expect(s.orders[0].deliveryDay).toBeGreaterThan(s.day);
    expect(s.orders[0].opened).toBe(false);
  });

  it('養蠶用品不能取消', () => {
    const s0 = run(
      createInitialState(1),
      { type: 'addToCart', productId: 'mulberry-leaf' },
      { type: 'addToCart', productId: 'sticker' },
      { type: 'checkout' },
    );
    const s = run(s0, { type: 'cancelOrderItem', orderId: s0.orders[0].id, productId: 'mulberry-leaf' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'item_not_returnable' }]);
  });

  it('飼養盒擴充超過上限時整張訂單不成立', () => {
    const s0 = run(createInitialState(1), { type: 'addToCart', productId: 'silkworm-habitat', qty: SILK_MAX_EXPANSIONS + 1 });
    const s = run({ ...s0, money: 1_000_000 }, { type: 'checkout' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_box_max' }]);
    expect(s.orders).toHaveLength(0);
    expect(s.cart).toEqual(s0.cart);
  });

  it('舊存檔裡改成固定價的商品，讀檔時校正成基準價', () => {
    const s = createInitialState(1);
    const fixed = fillMissingPrices({ ...s, prices: { ...s.prices, silkworm: 90 }, prevPrices: { ...s.prevPrices, silkworm: 95 } });
    expect(fixed.prices.silkworm).toBe(getProduct('silkworm')!.basePrice);
    expect(fixed.prevPrices.silkworm).toBe(getProduct('silkworm')!.basePrice);
  });
});

describe('打折券', () => {
  const half: Coupon = { id: 'half', minSpend: 300, discount: 0, percent: 50, expiresDay: 99 };

  it('主商城：折掉小計的一半，沒有上限', () => {
    const s0 = run({ ...createInitialState(1), coupons: [half], money: 1_000_000 }, { type: 'addToCart', productId: 'silkworm', qty: 100 });
    const s = run(s0, { type: 'checkout', couponId: 'half' });
    expect(s.money).toBe(s0.money - 3000);
  });

  it('養蠶小店：一樣可以用，金額無條件捨去成整數', () => {
    const s0 = run({ ...createInitialState(1), coupons: [half] }, { type: 'silkCartSet', item: 'leaf', qty: 31 });
    expect(summarizeSilkCart(s0, half)).toMatchObject({ subtotal: 310, discount: 155, total: 155 });
  });

  it('沒達到門檻不能用', () => {
    const s0 = run({ ...createInitialState(1), coupons: [half] }, { type: 'silkCartSet', item: 'leaf', qty: 29 });
    const s = run(s0, { type: 'silkCheckout', couponId: 'half', today: TODAY });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'coupon_threshold_not_met' }]);
  });

  it('從郵件領到的打折券保留 percent', () => {
    const s0 = createInitialState(1);
    const withGift: GameState = { ...s0, mail: { ...s0.mail, inbox: [{ id: 'M9', templateId: 'gift-2026-11-04', receivedDay: 1, claimed: false }] } };
    const s = run(withGift, { type: 'claimMail', mailId: 'M9' });
    expect(s.coupons.at(-1)).toMatchObject({ minSpend: 300, percent: 50 });
  });
});
