import { RETURN_WINDOW_DAYS } from './config';
import type { Money, Order, OrderLine, OrderStatus, ProductId } from './types';

/** 物流狀態完全由日期推算，不另外存。 */
export function getOrderStatus(order: Order, day: number): OrderStatus {
  if (day >= order.deliveryDay) return 'delivered';
  if (day === order.deliveryDay - 1 && day > order.placedDay) return 'in_transit';
  if (day > order.placedDay) return 'shipped';
  return 'placed';
}

export function formatOrderId(no: number): string {
  return `A${String(no).padStart(4, '0')}`;
}

// ── 取消與退貨的計算 ──

/** 這一項目前還有效（沒取消、沒退貨）的件數 */
export function activeQty(line: OrderLine): number {
  return line.qty - (line.cancelledQty ?? 0) - (line.returnedQty ?? 0);
}

/** 會送到的件數（扣掉到貨前取消的） */
export function shippedQty(line: OrderLine): number {
  return line.qty - (line.cancelledQty ?? 0);
}

/** 全部商品都在到貨前取消了 */
export function isOrderCancelled(order: Order): boolean {
  return order.lines.every((l) => shippedQty(l) === 0);
}

/**
 * 退一件商品可以拿回多少錢。
 * 優惠券折扣依金額比例分攤：剩下的商品「算是付了」round(剩餘小計 × 實付 / 原小計)，
 * 退款 = 退之前算是付了 − 退之後算是付了。逐件相減會互相抵銷，所以全部退光時退款總和剛好等於實付金額。
 */
export function refundForOne(order: Order, productId: ProductId): Money {
  const line = order.lines.find((l) => l.productId === productId);
  if (!line || activeQty(line) <= 0) return 0;
  const subtotal = order.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  if (subtotal === 0) return 0;
  const remaining = order.lines.reduce((sum, l) => sum + l.unitPrice * activeQty(l), 0);
  const paidFor = (sub: number) => Math.round((sub * order.total) / subtotal);
  return paidFor(remaining) - paidFor(remaining - line.unitPrice);
}

/** 鑑賞期還剩幾天（今天是最後一天回傳 0）；沒開箱、舊存檔或已過期回傳 null */
export function returnDaysLeft(order: Order, day: number): number | null {
  if (order.openedDay === undefined) return null;
  const left = order.openedDay + RETURN_WINDOW_DAYS - day;
  return left >= 0 ? left : null;
}
