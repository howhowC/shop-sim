import type { Action } from './actions';
import { getProduct } from './catalog';
import { MAX_DELIVERY_DAYS, MIN_DELIVERY_DAYS, STARTING_MONEY, WELCOME_COUPON } from './config';
import { sellItem } from './income/resale';
import { work } from './income/salary';
import { addFromOrder } from './inventory';
import { currentPrice, maybeDropCoupon, rollFlashSale, rollPrices } from './market';
import { formatOrderId, getOrderStatus } from './orders';
import { createRng } from './rng';
import type { Coupon, GameEvent, GameState, Money, OrderLine, RejectReason } from './types';

export function createInitialState(seed: number): GameState {
  const rng = createRng(seed);
  const day = 1;
  const prices = rollPrices(day, rng);
  return {
    day,
    money: STARTING_MONEY,
    prices,
    prevPrices: prices,
    flashSale: rollFlashSale(day, rng),
    coupons: [
      {
        id: 'welcome',
        minSpend: WELCOME_COUPON.minSpend,
        discount: WELCOME_COUPON.discount,
        expiresDay: day + WELCOME_COUPON.validDays - 1,
      },
    ],
    cart: {},
    orders: [],
    inventory: [],
    job: { level: 0, daysAtLevel: 0, workedToday: false },
    nextOrderNo: 1,
    nextUid: 1,
    rngState: rng.state(),
    events: [],
  };
}

export interface CartSummary {
  lines: OrderLine[];
  subtotal: Money;
  discount: Money;
  total: Money;
}

/** 計算購物車金額；UI 顯示和結帳都用這個，確保數字一致 */
export function summarizeCart(state: GameState, coupon?: Coupon): CartSummary {
  const lines: OrderLine[] = [];
  for (const [productId, qty] of Object.entries(state.cart)) {
    const unitPrice = currentPrice(state, productId);
    if (unitPrice === undefined || qty <= 0) continue;
    lines.push({ productId, unitPrice, qty });
  }
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const discount = coupon && subtotal >= coupon.minSpend ? coupon.discount : 0;
  return { lines, subtotal, discount, total: subtotal - discount };
}

const reject = (state: GameState, reason: RejectReason): GameState => ({
  ...state,
  events: [{ type: 'rejected', reason }],
});

function setQty(state: GameState, productId: string, qty: number): GameState {
  if (!getProduct(productId)) return reject(state, 'unknown_product');
  const cart = { ...state.cart };
  if (qty <= 0) delete cart[productId];
  else cart[productId] = Math.floor(qty);
  return { ...state, cart, events: [] };
}

function checkout(state: GameState, couponId?: string): GameState {
  let coupon: Coupon | undefined;
  if (couponId !== undefined) {
    coupon = state.coupons.find((c) => c.id === couponId && c.expiresDay >= state.day);
    if (!coupon) return reject(state, 'invalid_coupon');
  }
  const summary = summarizeCart(state, coupon);
  if (summary.lines.length === 0) return reject(state, 'empty_cart');
  if (coupon && summary.discount === 0) return reject(state, 'coupon_threshold_not_met');
  if (summary.total > state.money) return reject(state, 'insufficient_funds');

  const rng = createRng(state.rngState);
  const id = formatOrderId(state.nextOrderNo);
  const order = {
    id,
    lines: summary.lines,
    total: summary.total,
    placedDay: state.day,
    deliveryDay: state.day + rng.int(MIN_DELIVERY_DAYS, MAX_DELIVERY_DAYS),
    opened: false,
  };
  return {
    ...state,
    money: state.money - summary.total,
    cart: {},
    coupons: coupon ? state.coupons.filter((c) => c.id !== coupon.id) : state.coupons,
    orders: [...state.orders, order],
    nextOrderNo: state.nextOrderNo + 1,
    rngState: rng.state(),
    events: [{ type: 'orderPlaced', orderId: id, total: summary.total }],
  };
}

function unboxOrder(state: GameState, orderId: string): GameState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return reject(state, 'unknown_order');
  if (order.opened) return reject(state, 'order_already_opened');
  if (getOrderStatus(order, state.day) !== 'delivered') return reject(state, 'order_not_delivered');

  const next = addFromOrder(state, order.lines);
  return {
    ...next,
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, opened: true } : o)),
    events: [{ type: 'unboxed', orderId, productIds: order.lines.map((l) => l.productId) }],
  };
}

function nextDay(state: GameState): GameState {
  const rng = createRng(state.rngState);
  const day = state.day + 1;
  const events: GameEvent[] = [];

  const coupons = state.coupons.filter((c) => c.expiresDay >= day);
  const dropped = maybeDropCoupon(day, rng, `c${day}`);
  if (dropped) {
    coupons.push(dropped);
    events.push({ type: 'couponReceived', coupon: dropped });
  }

  const arrived = state.orders.filter((o) => o.deliveryDay === day).map((o) => o.id);
  if (arrived.length > 0) events.push({ type: 'packagesArrived', orderIds: arrived });

  return {
    ...state,
    day,
    prevPrices: state.prices,
    prices: rollPrices(day, rng),
    flashSale: rollFlashSale(day, rng),
    coupons,
    job: { ...state.job, workedToday: false },
    rngState: rng.state(),
    events,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'addToCart':
      return setQty(state, action.productId, (state.cart[action.productId] ?? 0) + (action.qty ?? 1));
    case 'setCartQty':
      return setQty(state, action.productId, action.qty);
    case 'checkout':
      return checkout(state, action.couponId);
    case 'unboxOrder':
      return unboxOrder(state, action.orderId);
    case 'sellItem': {
      const r = sellItem(state, action.uid);
      return { ...r.state, events: r.events };
    }
    case 'work': {
      const r = work(state);
      return { ...r.state, events: r.events };
    }
    case 'nextDay':
      return nextDay(state);
  }
}
