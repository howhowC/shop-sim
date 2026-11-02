import type { Action } from './actions';
import { getProduct } from './catalog';
import { MAX_DELIVERY_DAYS, MIN_DELIVERY_DAYS, STARTING_MONEY, WELCOME_COUPON } from './config';
import { sellItem } from './income/resale';
import { checkIn } from './income/checkin';
import { sellSilkworm } from './income/silk';
import { addFromOrder, findItem, removeItem } from './inventory';
import { claimAllMail, claimMail, createMailState, deliverMilestones, rollRandomMail, syncAnnouncements } from './mail';
import { currentPrice, maybeDropCoupon, rollFlashSale, rollPrices } from './market';
import { activeQty, formatOrderId, getOrderStatus, isOrderCancelled, refundForOne, returnDaysLeft, shippedQty } from './orders';
import { createRng } from './rng';
import { createRouletteState, spinRoulette } from './roulette';
import { buySilk, createSilkState, feedSilkworm, petSilkworm, releaseMoth, speedupSilkworm, syncSilk, type SilkResult } from './silk';
import type { Coupon, GameEvent, GameState, Money, Order, OrderLine, RejectReason } from './types';

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
    checkIn: { lastDate: null, streak: 0 },
    silk: createSilkState(),
    mail: createMailState(),
    roulette: createRouletteState(),
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
  if (isOrderCancelled(order)) return reject(state, 'order_cancelled');
  if (getOrderStatus(order, state.day) !== 'delivered') return reject(state, 'order_not_delivered');

  const next = addFromOrder(state, order);
  return {
    ...next,
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, opened: true, openedDay: state.day } : o)),
    events: [
      {
        type: 'unboxed',
        orderId,
        productIds: order.lines.filter((l) => shippedQty(l) > 0 && !getProduct(l.productId)?.virtual).map((l) => l.productId),
      },
    ],
  };
}

/** 把一筆訂單的某一項更新後放回 state，並退款 */
function refund(state: GameState, order: Order, productId: string, kind: 'cancel' | 'return'): GameState {
  const amount = refundForOne(order, productId);
  const field = kind === 'cancel' ? 'cancelledQty' : 'returnedQty';
  const lines = order.lines.map((l) => (l.productId === productId ? { ...l, [field]: (l[field] ?? 0) + 1 } : l));
  return {
    ...state,
    money: state.money + amount,
    orders: state.orders.map((o) => (o.id === order.id ? { ...o, lines } : o)),
    events: [{ type: 'refunded', kind, orderId: order.id, productId, amount }],
  };
}

/** 到貨前取消訂單裡的一件商品 */
function cancelOrderItem(state: GameState, orderId: string, productId: string): GameState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return reject(state, 'unknown_order');
  if (getOrderStatus(order, state.day) === 'delivered') return reject(state, 'order_already_delivered');
  const line = order.lines.find((l) => l.productId === productId);
  if (!line || activeQty(line) <= 0) return reject(state, 'item_not_returnable');
  return refund(state, order, productId, 'cancel');
}

/** 鑑賞期內退回房間裡的一件物品 */
function returnItem(state: GameState, uid: number): GameState {
  const item = findItem(state, uid);
  if (!item) return reject(state, 'unknown_item');
  const order = item.orderId === undefined ? undefined : state.orders.find((o) => o.id === item.orderId);
  const line = order?.lines.find((l) => l.productId === item.productId);
  if (!order || !line || order.openedDay === undefined || activeQty(line) <= 0) return reject(state, 'item_not_returnable');
  if (returnDaysLeft(order, state.day) === null) return reject(state, 'return_window_expired');
  return refund(removeItem(state, uid), order, item.productId, 'return');
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

  const arrived = state.orders.filter((o) => o.deliveryDay === day && !isOrderCancelled(o)).map((o) => o.id);
  if (arrived.length > 0) events.push({ type: 'packagesArrived', orderIds: arrived });

  const advanced: GameState = {
    ...state,
    day,
    prevPrices: state.prices,
    prices: rollPrices(day, rng),
    flashSale: rollFlashSale(day, rng),
    coupons,
  };
  // 隨機來信放在最後抽，前面價格、特價的亂數順序才不會因為加了郵件而改變
  const mail = rollRandomMail(advanced, rng);
  return { ...mail.state, rngState: rng.state(), events: [...events, ...mail.events] };
}

/**
 * 養蠶 action：先依今天日期成長，再做玩家的動作。
 * 動作被拒絕時整個 state 不變（成長會在下一次 action 補上），只回傳拒絕原因。
 */
function silkAction(state: GameState, today: string, op: (s: GameState) => SilkResult): GameState {
  const synced = syncSilk(state, today);
  const r = op(synced.state);
  if (r.events.some((e) => e.type === 'rejected')) return { ...state, events: r.events };
  return { ...r.state, events: [...synced.events, ...r.events] };
}

/** 處理 action；成功的 action 之後再檢查有沒有達成里程碑要寄信 */
export function reducer(state: GameState, action: Action): GameState {
  const next = applyAction(state, action);
  return next.events.some((e) => e.type === 'rejected') ? next : deliverMilestones(next);
}

const withEvents = (r: SilkResult): GameState => ({ ...r.state, events: r.events });

function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'addToCart':
      return setQty(state, action.productId, (state.cart[action.productId] ?? 0) + (action.qty ?? 1));
    case 'setCartQty':
      return setQty(state, action.productId, action.qty);
    case 'checkout':
      return checkout(state, action.couponId);
    case 'unboxOrder':
      return unboxOrder(state, action.orderId);
    case 'cancelOrderItem':
      return cancelOrderItem(state, action.orderId, action.productId);
    case 'returnItem':
      return returnItem(state, action.uid);
    case 'sellItem': {
      const r = sellItem(state, action.uid);
      return { ...r.state, events: r.events };
    }
    case 'checkIn': {
      const r = checkIn(state, action.today);
      return { ...r.state, events: r.events };
    }
    case 'nextDay':
      return nextDay(state);
    case 'silkSync':
      return silkAction(state, action.today, (s) => ({ state: s, events: [] }));
    case 'silkBuy':
      return silkAction(state, action.today, (s) => buySilk(s, action.item, action.qty ?? 1, action.today));
    case 'silkFeed':
      return silkAction(state, action.today, (s) => feedSilkworm(s, action.uid, action.today));
    case 'silkPet':
      return silkAction(state, action.today, (s) => petSilkworm(s, action.uid, action.today));
    case 'silkSell':
      return silkAction(state, action.today, (s) => sellSilkworm(s, action.uid));
    case 'silkRelease':
      return silkAction(state, action.today, (s) => releaseMoth(s, action.uid));
    case 'silkSpeedup':
      return silkAction(state, action.today, (s) => speedupSilkworm(s, action.uid, action.today));
    case 'mailSync':
      return withEvents(syncAnnouncements(state, action.today));
    case 'claimMail':
      return withEvents(claimMail(state, action.mailId, action.today));
    case 'claimAllMail':
      return withEvents(claimAllMail(state, action.today));
    case 'spinRoulette':
      return withEvents(spinRoulette(state, action.today));
  }
}
