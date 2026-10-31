import { getProduct } from '../core';
import type { GameEvent, RejectReason } from '../core';

export const fmt = (n: number): string => '$' + n.toLocaleString('zh-TW');

const REJECT_TEXT: Record<RejectReason, string> = {
  unknown_product: '找不到這個商品',
  empty_cart: '購物車是空的',
  insufficient_funds: '錢包餘額不足',
  invalid_coupon: '這張優惠券已失效',
  coupon_threshold_not_met: '還沒達到優惠券的使用門檻',
  unknown_order: '找不到這筆訂單',
  order_not_delivered: '包裹還沒送達',
  order_already_opened: '這個包裹已經開過了',
  unknown_item: '找不到這件物品',
  already_worked_today: '今天已經打過卡了，明天再來',
};

const productName = (id: string) => getProduct(id)?.name ?? id;

/** 把 core 回傳的事件轉成給玩家看的文字 */
export function eventText(ev: GameEvent): string {
  switch (ev.type) {
    case 'orderPlaced':
      return `下單成功，付款 ${fmt(ev.total)}`;
    case 'packagesArrived':
      return `有 ${ev.orderIds.length} 個包裹送達，去訂單開箱吧`;
    case 'unboxed':
      return `拿到了：${ev.productIds.map(productName).join('、')}`;
    case 'income':
      return ev.source === 'salary' ? `打卡完成，領到 ${fmt(ev.amount)}` : `賣出成功，入帳 ${fmt(ev.amount)}`;
    case 'promoted':
      return '升職了！日薪提高';
    case 'couponReceived':
      return `獲得優惠券：滿 ${fmt(ev.coupon.minSpend)} 折 ${fmt(ev.coupon.discount)}`;
    case 'rejected':
      return REJECT_TEXT[ev.reason];
  }
}
