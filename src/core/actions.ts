import type { ProductId, SilkShopItem } from './types';

/** 玩家能做的所有事。UI 只能透過 dispatch 這些 action 改變遊戲狀態。 */
export type Action =
  | { type: 'addToCart'; productId: ProductId; qty?: number }
  | { type: 'setCartQty'; productId: ProductId; qty: number }
  | { type: 'checkout'; couponId?: string }
  | { type: 'unboxOrder'; orderId: string }
  /** 到貨前取消訂單裡的一件商品 */
  | { type: 'cancelOrderItem'; orderId: string; productId: ProductId }
  /** 鑑賞期內退回房間裡的一件物品 */
  | { type: 'returnItem'; uid: number }
  | { type: 'sellItem'; uid: number }
  /** today 是玩家當地的現實日期 'YYYY-MM-DD'，由 UI 傳入，core 才能維持純函式 */
  | { type: 'checkIn'; today: string }
  | { type: 'nextDay' }
  // ── 養蠶：today 同樣是當地現實日期；每個養蠶 action 都會先依 today 讓蠶成長 ──
  | { type: 'silkSync'; today: string }
  | { type: 'silkBuy'; item: SilkShopItem; qty?: number; today: string }
  | { type: 'silkFeed'; uid: number; today: string }
  | { type: 'silkPet'; uid: number; today: string }
  | { type: 'silkSell'; uid: number; today: string }
  | { type: 'silkRelease'; uid: number; today: string }
  /** 用一張加速券讓一隻蠶立刻升一階 */
  | { type: 'silkSpeedup'; uid: number; today: string }
  // ── 郵件：today 是當地現實日期（公告信依它寄出、信裡的蠶卵用它當放進飼養盒的日期）──
  | { type: 'mailSync'; today: string }
  | { type: 'claimMail'; mailId: string; today: string }
  | { type: 'claimAllMail'; today: string };
