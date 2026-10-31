import type { Order, OrderStatus } from './types';

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
