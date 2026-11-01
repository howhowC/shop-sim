import { describe, expect, it } from 'vitest';
import { allProducts } from '../catalog';
import { RETURN_WINDOW_DAYS } from '../config';
import { refundForOne } from '../orders';
import { createInitialState } from '../reducer';
import type { GameState, Order } from '../types';
import { run, times } from './helpers';

/** 自己組一筆訂單：兩項商品、用了 100 元折價券，金額除不盡，用來測分攤 */
function withOrder(deliveryInDays = 3): { s: GameState; order: Order } {
  const s0 = createInitialState(1);
  const order: Order = {
    id: 'A0001',
    lines: [
      { productId: 'kb-87', unitPrice: 333, qty: 2 },
      { productId: 'sticker', unitPrice: 101, qty: 3 },
    ],
    total: 333 * 2 + 101 * 3 - 100,
    placedDay: s0.day,
    deliveryDay: s0.day + deliveryInDays,
    opened: false,
  };
  return { s: { ...s0, orders: [order], nextOrderNo: 2 }, order };
}

/** 照正常流程買一件商品、等到貨、開箱；回傳開箱後的 state 和物品 uid */
function boughtAndOpened(): { s: GameState; uid: number; paid: number } {
  const s0 = createInitialState(3);
  const p = allProducts().find((x) => !x.limited && x.id !== s0.flashSale?.productId)!;
  let s = run(s0, { type: 'addToCart', productId: p.id }, { type: 'checkout' });
  const order = s.orders[0];
  s = run(s, ...times(order.deliveryDay - s.day, { type: 'nextDay' }), { type: 'unboxOrder', orderId: order.id });
  return { s, uid: s.inventory[0].uid, paid: order.total };
}

describe('到貨前取消', () => {
  it('取消一件：退款、記錄取消件數', () => {
    const { s: s0, order } = withOrder();
    const refund = refundForOne(order, 'sticker');
    const s = run(s0, { type: 'cancelOrderItem', orderId: order.id, productId: 'sticker' });
    expect(s.money).toBe(s0.money + refund);
    expect(s.orders[0].lines[1].cancelledQty).toBe(1);
    expect(s.events).toEqual([{ type: 'refunded', kind: 'cancel', orderId: order.id, productId: 'sticker', amount: refund }]);
  });

  it('用了優惠券的訂單全部退光，退款總和剛好等於實付金額', () => {
    const { s: s0, order } = withOrder();
    const cancelKb = { type: 'cancelOrderItem', orderId: order.id, productId: 'kb-87' } as const;
    const cancelSticker = { type: 'cancelOrderItem', orderId: order.id, productId: 'sticker' } as const;
    const s = run(s0, cancelSticker, cancelKb, cancelSticker, cancelKb, cancelSticker);
    expect(s.money).toBe(s0.money + order.total);
  });

  it('全部取消後訂單不會送達，也不能開箱', () => {
    const { s: s0, order } = withOrder(1);
    let s = run(
      s0,
      ...times(2, { type: 'cancelOrderItem', orderId: order.id, productId: 'kb-87' }),
      ...times(3, { type: 'cancelOrderItem', orderId: order.id, productId: 'sticker' }),
      { type: 'nextDay' },
    );
    expect(s.events.some((e) => e.type === 'packagesArrived')).toBe(false);
    s = run(s, { type: 'unboxOrder', orderId: order.id });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'order_cancelled' }]);
  });

  it('部分取消後開箱，只拿到沒取消的件數', () => {
    const { s: s0, order } = withOrder(1);
    const s = run(
      s0,
      { type: 'cancelOrderItem', orderId: order.id, productId: 'sticker' },
      { type: 'nextDay' },
      { type: 'unboxOrder', orderId: order.id },
    );
    expect(s.inventory.filter((it) => it.productId === 'sticker')).toHaveLength(2);
    expect(s.inventory.filter((it) => it.productId === 'kb-87')).toHaveLength(2);
  });

  it('已經取消光的商品不能再取消', () => {
    const { s: s0, order } = withOrder();
    const cancel = { type: 'cancelOrderItem', orderId: order.id, productId: 'kb-87' } as const;
    const s = run(s0, cancel, cancel, cancel);
    expect(s.events).toEqual([{ type: 'rejected', reason: 'item_not_returnable' }]);
  });

  it('已送達的訂單不能取消', () => {
    const { s: s0, order } = withOrder(1);
    const s = run(s0, { type: 'nextDay' }, { type: 'cancelOrderItem', orderId: order.id, productId: 'kb-87' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'order_already_delivered' }]);
  });
});

describe('開箱後退貨', () => {
  it('鑑賞期內退貨：物品從房間移除，退回實付金額', () => {
    const { s: s0, uid, paid } = boughtAndOpened();
    const s = run(s0, { type: 'returnItem', uid });
    expect(s.inventory).toHaveLength(0);
    expect(s.money).toBe(s0.money + paid);
    expect(s.orders[0].lines[0].returnedQty).toBe(1);
  });

  it('鑑賞期最後一天還能退，隔天就不行', () => {
    const { s: s0, uid } = boughtAndOpened();
    const last = run(s0, ...times(RETURN_WINDOW_DAYS, { type: 'nextDay' }));
    expect(run(last, { type: 'returnItem', uid }).inventory).toHaveLength(0);
    const expired = run(last, { type: 'nextDay' }, { type: 'returnItem', uid });
    expect(expired.events).toEqual([{ type: 'rejected', reason: 'return_window_expired' }]);
    expect(expired.inventory).toHaveLength(1);
  });

  it('舊存檔的物品（沒有來源訂單）不能退貨', () => {
    const { s: s0, uid } = boughtAndOpened();
    const old = { ...s0, inventory: s0.inventory.map(({ orderId: _o, ...it }) => it) };
    const s = run(old, { type: 'returnItem', uid });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'item_not_returnable' }]);
  });

  it('舊存檔的訂單（沒有開箱日期）不能退貨', () => {
    const { s: s0, uid } = boughtAndOpened();
    const old = { ...s0, orders: s0.orders.map(({ openedDay: _d, ...o }) => o) };
    const s = run(old, { type: 'returnItem', uid });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'item_not_returnable' }]);
  });
});

describe('補差價（虛擬商品）', () => {
  it('開箱後不會放進房間，其他商品照常放進去', () => {
    const s0 = createInitialState(1);
    let s = run(s0, { type: 'addToCart', productId: 'price-diff' }, { type: 'addToCart', productId: 'sticker' }, { type: 'checkout' });
    const order = s.orders[0];
    s = run(s, ...times(order.deliveryDay - s.day, { type: 'nextDay' }), { type: 'unboxOrder', orderId: order.id });
    expect(s.inventory.map((it) => it.productId)).toEqual(['sticker']);
    expect(s.events).toEqual([{ type: 'unboxed', orderId: order.id, productIds: ['sticker'] }]);
  });

  it('到貨前可以取消', () => {
    const s0 = createInitialState(1);
    let s = run(s0, { type: 'addToCart', productId: 'price-diff' }, { type: 'checkout' });
    s = run(s, { type: 'cancelOrderItem', orderId: s.orders[0].id, productId: 'price-diff' });
    expect(s.money).toBe(s0.money);
  });
});
