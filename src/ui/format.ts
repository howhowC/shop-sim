import { getProduct, getSilkBreed } from '../core';
import type { GameEvent, IncomeSource, RejectReason, SilkShopItem } from '../core';

export const fmt = (n: number): string => '$' + n.toLocaleString('zh-TW');

/** 當地日期 'YYYY-MM-DD'，給每日簽到和養蠶用 */
export function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const REJECT_TEXT: Record<RejectReason, string> = {
  unknown_product: '找不到這個商品',
  empty_cart: '購物車是空的',
  insufficient_funds: '錢包餘額不足',
  invalid_coupon: '這張優惠券已失效',
  coupon_threshold_not_met: '還沒達到優惠券的使用門檻',
  unknown_order: '找不到這筆訂單',
  order_not_delivered: '包裹還沒送達',
  order_already_opened: '這個包裹已經開過了',
  order_already_delivered: '包裹已經送達，不能取消了；開箱後可以在鑑賞期內退貨',
  order_cancelled: '這筆訂單已經全部取消了',
  item_not_returnable: '這件商品不能退貨',
  return_window_expired: '已經超過 7 天鑑賞期，不能退貨了',
  unknown_item: '找不到這件物品',
  already_checked_in_today: '今天已經簽到過了，明天再來',
  silk_unknown: '找不到這隻蠶寶寶',
  silk_unknown_item: '小店沒有這個東西',
  silk_capacity_full: '飼養盒滿了，先賣掉或放飛一些吧',
  silk_no_leaves: '桑葉吃完了，去小店補貨吧',
  silk_already_fed: '今天已經餵過了，牠吃得飽飽的',
  silk_already_petted: '今天已經摸過了，明天再來',
  silk_cannot_feed: '現在不用餵食',
  silk_cannot_pet: '現在摸不到牠喔',
  silk_cannot_sell: '這個階段不能出售',
  silk_cannot_release: '還沒羽化，不能放飛',
};

export const SILK_ITEM_NAME: Record<SilkShopItem, string> = {
  egg: '蠶卵',
  premiumEgg: '精選蠶卵',
  leaf: '桑葉',
};

const INCOME_TEXT: Record<IncomeSource, (amount: string) => string> = {
  checkIn: (a) => `簽到成功，領到 ${a}`,
  resale: (a) => `賣出成功，入帳 ${a}`,
  silk: (a) => `賣給蠶農收購站，入帳 ${a}`,
};

const breedName = (id: string) => getSilkBreed(id)?.name ?? id;
const count = (uids: readonly number[]) => (uids.length > 1 ? ` ${uids.length} 隻` : '');

const productName = (id: string) => getProduct(id)?.name ?? id;

/** 把 core 回傳的事件轉成給玩家看的文字 */
export function eventText(ev: GameEvent): string {
  switch (ev.type) {
    case 'orderPlaced':
      return `下單成功，付款 ${fmt(ev.total)}`;
    case 'packagesArrived':
      return `有 ${ev.orderIds.length} 個包裹送達，去訂單開箱吧`;
    case 'unboxed':
      return ev.productIds.length > 0 ? `拿到了：${ev.productIds.map(productName).join('、')}` : '開箱完成（補差價不是實體商品）';
    case 'income':
      return INCOME_TEXT[ev.source](fmt(ev.amount));
    case 'couponReceived':
      return `獲得優惠券：滿 ${fmt(ev.coupon.minSpend)} 折 ${fmt(ev.coupon.discount)}`;
    case 'rejected':
      return REJECT_TEXT[ev.reason];
    case 'refunded':
      return `${ev.kind === 'cancel' ? '已取消' : '已退貨'}：${productName(ev.productId)}，退款 ${fmt(ev.amount)}`;
    case 'silkBought':
      return `買了 ${SILK_ITEM_NAME[ev.item]} ×${ev.qty}，付款 ${fmt(ev.total)}`;
    case 'silkHatched':
      return `孵化了！是${breedName(ev.breed)}`;
    case 'silkGrew':
      return `蠶寶寶${count(ev.uids)}長大了一齡`;
    case 'silkCocooned':
      return `蠶寶寶${count(ev.uids)}吐絲結繭了`;
    case 'silkEmerged':
      return `破繭而出！${count(ev.uids)}羽化成蛾，已登記圖鑑`;
    case 'silkFed':
      return '沙沙沙…吃得好開心';
    case 'silkPetted':
      return '蠶寶寶扭了扭，好像很喜歡';
    case 'silkReleased':
      return '蛾寶寶飛走了，掰掰～';
  }
}
