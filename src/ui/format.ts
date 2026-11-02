import { getMailTemplate, getProduct, getSilkBreed } from '../core';
import type { GameEvent, IncomeSource, MailReward, RejectReason, SilkShopItem } from '../core';

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
  silk_no_speedups: '沒有加速券了，去養蠶小店買吧',
  silk_cannot_speedup: '已經是蛾了，不能再長大囉',
  silk_name_too_long: '名字太長了，最多 10 個字',
  silk_box_max: '飼養盒已經擴充到最大了',
  silk_no_eggs: '蠶卵庫存不夠',
  unknown_mail: '找不到這封信',
  mail_already_claimed: '這封信已經領過了',
  no_mail_to_claim: '沒有可以領取的信',
  roulette_no_spins_left: '今天的 3 次已經抽完了，明天再來',
};

export const SILK_ITEM_NAME: Record<SilkShopItem, string> = {
  egg: '蠶卵',
  premiumEgg: '精選蠶卵',
  leaf: '桑葉',
  speedup: '加速券',
  habitat: '飼養盒擴充',
};

const INCOME_TEXT: Record<IncomeSource, (amount: string) => string> = {
  checkIn: (a) => `簽到成功，領到 ${a}`,
  resale: (a) => `賣出成功，入帳 ${a}`,
  silk: (a) => `賣給蠶農收購站，入帳 ${a}`,
  mail: (a) => `郵件獎勵入帳 ${a}`,
};

/** 郵件附件的簡短描述，例如「$300」「桑葉 ×5」 */
export function rewardText(r: MailReward): string {
  switch (r.kind) {
    case 'money':
      return fmt(r.amount);
    case 'coupon':
      return `優惠券 滿 ${fmt(r.minSpend)} 折 ${fmt(r.discount)}`;
    case 'silk':
      return `${SILK_ITEM_NAME[r.item]} ×${r.qty}`;
    case 'product':
      return `${getProduct(r.productId)?.name ?? r.productId} ×${r.qty}`;
  }
}

const breedName = (id: string) => getSilkBreed(id)?.name ?? id;
/**
 * 一群蠶的稱呼：有名字的列名字，沒名字的用數量帶過。
 * 例：[null] → 蠶寶寶；[null, null] → 2 隻蠶寶寶；['小白'] → 小白；['小白', null, null] → 小白和 2 隻蠶寶寶
 */
export function silkwormsLabel(names: readonly (string | null)[], fallback = '蠶寶寶'): string {
  const named = names.filter((n): n is string => n !== null);
  const unnamed = names.length - named.length;
  const others = unnamed === 0 ? '' : unnamed === 1 ? fallback : `${unnamed} 隻${fallback}`;
  if (named.length === 0) return others;
  if (others === '') return named.join('、');
  // 數字前後留空格，和其他「2 隻」的寫法一致
  return `${named.join('、')}和${unnamed > 1 ? ' ' : ''}${others}`;
}

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
    case 'silkOrderPaid':
      return `結帳成功，付款 ${fmt(ev.total)}${ev.discount > 0 ? `（折抵 ${fmt(ev.discount)}）` : ''}，已到貨`;
    case 'silkEggsPlaced':
      return `放了 ${ev.qty} 顆${SILK_ITEM_NAME[ev.kind]}進飼養盒，明天就會孵化`;
    case 'silkDelivered':
      return `養蠶用品已送達：${ev.items.map((i) => `${SILK_ITEM_NAME[i.item]} ×${i.qty}`).join('、')}`;
    case 'silkHatched':
      return ev.name === null ? `孵化了！是${breedName(ev.breed)}` : `${ev.name}孵化了！是${breedName(ev.breed)}`;
    case 'silkGrew':
      return `${silkwormsLabel(ev.names)}長大了一齡`;
    case 'silkCocooned':
      return `${silkwormsLabel(ev.names)}吐絲結繭了`;
    case 'silkEmerged':
      return `破繭而出！${silkwormsLabel(ev.names)}羽化成蛾，已登記圖鑑`;
    case 'silkFed':
      return `沙沙沙…${ev.name ?? ''}吃得好開心`;
    case 'silkPetted':
      return `${ev.name ?? '蠶寶寶'}扭了扭，好像很喜歡`;
    case 'silkSold':
      return `${ev.name === null ? '' : `和${ev.name}說再見，`}賣給蠶農收購站，入帳 ${fmt(ev.amount)}`;
    case 'silkRenamed':
      return ev.name === null ? '已清除名字' : `取好名字了：${ev.name}`;
    case 'silkReleased':
      return `${ev.name ?? '蛾寶寶'}飛走了，掰掰～`;
    case 'mailReceived':
      return `📮 收到 ${ev.count} 封新郵件`;
    case 'rouletteWon':
      // 輪盤停下來之後由 RouletteView 自己顯示結果，這裡回傳空字串讓 App 不要先跳通知
      return '';
    case 'mailClaimed': {
      const rewards = getMailTemplate(ev.templateId)?.rewards ?? [];
      return rewards.length > 0 ? `領取了：${rewards.map(rewardText).join('、')}` : '已讀取郵件';
    }
  }
}
