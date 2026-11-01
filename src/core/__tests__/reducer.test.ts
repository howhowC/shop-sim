import { describe, expect, it } from 'vitest';
import { allProducts } from '../catalog';
import { resalePrice } from '../income/resale';
import { getOrderStatus } from '../orders';
import { CHECKIN_DAY7_COUPON, CHECKIN_REWARDS, STARTING_MONEY, WELCOME_COUPON } from '../config';
import { createInitialState, summarizeCart } from '../reducer';
import type { GameState } from '../types';
import { run, times } from './helpers';

/** 挑一個今天沒有限時特價的商品，讓金額好算 */
function regularProduct(s: GameState) {
  return allProducts().find((p) => p.id !== s.flashSale?.productId && !p.limited)!;
}

describe('購物車', () => {
  it('加入、改數量、數量設為 0 會移除', () => {
    const s0 = createInitialState(1);
    const p = regularProduct(s0);
    let s = run(s0, { type: 'addToCart', productId: p.id }, { type: 'addToCart', productId: p.id, qty: 2 });
    expect(s.cart[p.id]).toBe(3);
    s = run(s, { type: 'setCartQty', productId: p.id, qty: 0 });
    expect(s.cart[p.id]).toBeUndefined();
  });

  it('不存在的商品會被拒絕', () => {
    const s = run(createInitialState(1), { type: 'addToCart', productId: 'nope' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'unknown_product' }]);
    expect(s.cart).toEqual({});
  });
});

describe('結帳', () => {
  it('成功結帳：扣款、清空購物車、建立訂單', () => {
    const s0 = createInitialState(1);
    const p = regularProduct(s0);
    const s = run(s0, { type: 'addToCart', productId: p.id }, { type: 'checkout' });
    expect(s.money).toBe(STARTING_MONEY - s0.prices[p.id]);
    expect(s.cart).toEqual({});
    expect(s.orders).toHaveLength(1);
    expect(s.orders[0].id).toBe('A0001');
    expect(s.events[0]).toMatchObject({ type: 'orderPlaced', orderId: 'A0001' });
  });

  it('空購物車不能結帳', () => {
    const s = run(createInitialState(1), { type: 'checkout' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'empty_cart' }]);
  });

  it('錢不夠不能結帳，狀態不變', () => {
    const s0 = createInitialState(1);
    const s = run(s0, ...times(20, { type: 'addToCart', productId: 'cloud-chair' }), { type: 'checkout' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'insufficient_funds' }]);
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.orders).toHaveLength(0);
  });

  it('優惠券：未達門檻被拒絕；達到門檻會折抵並用掉', () => {
    const s0 = createInitialState(1);
    const cheap = allProducts().find((p) => p.id === 'lip-balm')!;
    const notEnough = run(s0, { type: 'addToCart', productId: cheap.id }, { type: 'checkout', couponId: 'welcome' });
    expect(notEnough.events).toEqual([{ type: 'rejected', reason: 'coupon_threshold_not_met' }]);

    // 挑一個低於門檻的商品，買到剛好超過門檻，總額不會超過初始金額
    const { minSpend, discount } = WELCOME_COUPON;
    const p = allProducts().find(
      (p) => p.id !== s0.flashSale?.productId && !p.limited && s0.prices[p.id] < minSpend && s0.prices[p.id] >= minSpend / 3,
    )!;
    const qty = Math.ceil(minSpend / s0.prices[p.id]);
    const withCart = run(s0, { type: 'addToCart', productId: p.id, qty });
    const { subtotal } = summarizeCart(withCart);
    expect(subtotal).toBeGreaterThanOrEqual(minSpend);
    const s = run(withCart, { type: 'checkout', couponId: 'welcome' });
    expect(s.money).toBe(STARTING_MONEY - (subtotal - discount));
    expect(s.coupons.find((c) => c.id === 'welcome')).toBeUndefined();
  });

  it('不存在或過期的優惠券被拒絕', () => {
    const s0 = createInitialState(1);
    const p = regularProduct(s0);
    const s = run(s0, { type: 'addToCart', productId: p.id }, { type: 'checkout', couponId: 'fake' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'invalid_coupon' }]);
  });
});

describe('物流與開箱', () => {
  it('訂單依日期推進狀態，送達後才能開箱，開箱後進入收藏', () => {
    const s0 = createInitialState(1);
    const p = regularProduct(s0);
    let s = run(s0, { type: 'addToCart', productId: p.id }, { type: 'checkout' });
    const order = s.orders[0];
    expect(getOrderStatus(order, s.day)).toBe('placed');

    s = run(s, { type: 'unboxOrder', orderId: order.id });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'order_not_delivered' }]);

    const seen = new Set<string>();
    while (s.day < order.deliveryDay) {
      s = run(s, { type: 'nextDay' });
      seen.add(getOrderStatus(order, s.day));
    }
    expect(seen.has('delivered')).toBe(true);
    expect(s.events).toContainEqual({ type: 'packagesArrived', orderIds: [order.id] });

    s = run(s, { type: 'unboxOrder', orderId: order.id });
    expect(s.inventory).toHaveLength(1);
    expect(s.inventory[0]).toMatchObject({ productId: p.id, paidPrice: s0.prices[p.id] });

    s = run(s, { type: 'unboxOrder', orderId: order.id });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'order_already_opened' }]);
  });

  it('到貨天數在 2 到 4 天之間', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s0 = createInitialState(seed);
      const s = run(s0, { type: 'addToCart', productId: regularProduct(s0).id }, { type: 'checkout' });
      const wait = s.orders[0].deliveryDay - s.orders[0].placedDay;
      expect(wait).toBeGreaterThanOrEqual(2);
      expect(wait).toBeLessThanOrEqual(4);
    }
  });
});

describe('收入', () => {
  it('同一個現實日期只能簽到一次；遊戲裡按下一天也不能再簽', () => {
    let s = run(createInitialState(1), { type: 'checkIn', today: '2026-11-01' });
    expect(s.money).toBe(STARTING_MONEY + CHECKIN_REWARDS[0]);
    s = run(s, { type: 'checkIn', today: '2026-11-01' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'already_checked_in_today' }]);
    s = run(s, { type: 'nextDay' }, { type: 'checkIn', today: '2026-11-01' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'already_checked_in_today' }]);
    expect(s.money).toBe(STARTING_MONEY + CHECKIN_REWARDS[0]);
  });

  it('連續簽到獎勵遞增，跨月也算連續', () => {
    let s = run(createInitialState(1), { type: 'checkIn', today: '2026-10-31' });
    s = run(s, { type: 'checkIn', today: '2026-11-01' });
    expect(s.checkIn).toEqual({ lastDate: '2026-11-01', streak: 2 });
    expect(s.money).toBe(STARTING_MONEY + CHECKIN_REWARDS[0] + CHECKIN_REWARDS[1]);
  });

  it('斷簽會從第 1 天重新開始', () => {
    let s = run(createInitialState(1), { type: 'checkIn', today: '2026-11-01' });
    s = run(s, { type: 'checkIn', today: '2026-11-02' });
    const before = s.money;
    s = run(s, { type: 'checkIn', today: '2026-11-04' });
    expect(s.checkIn.streak).toBe(1);
    expect(s.money - before).toBe(CHECKIN_REWARDS[0]);
  });

  it('日期比上次簽到還早（調過時鐘）會被拒絕', () => {
    let s = run(createInitialState(1), { type: 'checkIn', today: '2026-11-05' });
    s = run(s, { type: 'checkIn', today: '2026-11-04' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'already_checked_in_today' }]);
  });

  it('連續第 7 天加送優惠券，第 8 天回到第 1 天的獎勵', () => {
    let s = createInitialState(1);
    for (let d = 1; d <= 7; d++) s = run(s, { type: 'checkIn', today: `2026-11-0${d}` });
    expect(s.events).toContainEqual(expect.objectContaining({ type: 'couponReceived' }));
    expect(s.coupons).toContainEqual(expect.objectContaining({ id: 'checkin-2026-11-07', ...CHECKIN_DAY7_COUPON }));
    const before = s.money;
    s = run(s, { type: 'checkIn', today: '2026-11-08' });
    expect(s.checkIn.streak).toBe(8);
    expect(s.money - before).toBe(CHECKIN_REWARDS[0]);
  });

  it('二手轉賣：一般商品低於買價回收；限量品剛到手賣不會賺', () => {
    const s0 = createInitialState(1);
    let s = run(
      s0,
      { type: 'addToCart', productId: 'steel-cup' },
      { type: 'addToCart', productId: 'moon-rabbit' },
      { type: 'checkout' },
    );
    while (getOrderStatus(s.orders[0], s.day) !== 'delivered') s = run(s, { type: 'nextDay' });
    s = run(s, { type: 'unboxOrder', orderId: s.orders[0].id });

    const cup = s.inventory.find((i) => i.productId === 'steel-cup')!;
    const rabbit = s.inventory.find((i) => i.productId === 'moon-rabbit')!;

    const afterCup = run(s, { type: 'sellItem', uid: cup.uid });
    const cupGain = afterCup.money - s.money;
    expect(cupGain).toBeLessThan(cup.paidPrice);
    expect(afterCup.events).toEqual([{ type: 'income', source: 'resale', amount: cupGain }]);

    const afterRabbit = run(afterCup, { type: 'sellItem', uid: rabbit.uid });
    expect(afterRabbit.money - afterCup.money).toBe(rabbit.paidPrice);
    expect(afterRabbit.inventory).toHaveLength(0);
  });

  it('限量品持有越久二手價越高，最多 1.5 倍買價', () => {
    const s0 = createInitialState(1);
    let s = run(s0, { type: 'addToCart', productId: 'moon-rabbit' }, { type: 'checkout' });
    while (getOrderStatus(s.orders[0], s.day) !== 'delivered') s = run(s, { type: 'nextDay' });
    s = run(s, { type: 'unboxOrder', orderId: s.orders[0].id });
    const rabbit = s.inventory[0];

    s = run(s, ...times(10, { type: 'nextDay' }));
    expect(resalePrice(s, rabbit)).toBe(Math.round((rabbit.paidPrice * 1.2) / 10) * 10);

    s = run(s, ...times(100, { type: 'nextDay' }));
    expect(resalePrice(s, rabbit)).toBe(Math.round((rabbit.paidPrice * 1.5) / 10) * 10);
  });

  it('賣不存在的物品被拒絕', () => {
    const s = run(createInitialState(1), { type: 'sellItem', uid: 999 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'unknown_item' }]);
  });
});

describe('可重現性', () => {
  it('同一個 seed、同一串 action，結果完全相同', () => {
    const actions = [
      { type: 'addToCart', productId: 'kb-87' },
      { type: 'checkout' },
      ...times(10, { type: 'nextDay' }),
    ] as const;
    expect(run(createInitialState(123), ...actions)).toEqual(run(createInitialState(123), ...actions));
  });

  it('過期的優惠券在隔天被移除', () => {
    let s = createInitialState(1);
    const welcome = s.coupons.find((c) => c.id === 'welcome')!;
    while (s.day <= welcome.expiresDay) s = run(s, { type: 'nextDay' });
    expect(s.coupons.find((c) => c.id === 'welcome')).toBeUndefined();
  });
});
