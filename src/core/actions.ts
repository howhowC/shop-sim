import type { ProductId, SilkEggKind, SilkShopItem } from './types';

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
  /** 養蠶小店購物車：設定數量（0 以下移除）、結帳（可用優惠券，立即到貨） */
  | { type: 'silkCartSet'; item: SilkShopItem; qty: number }
  | { type: 'silkCheckout'; couponId?: string; today: string }
  /** 從蠶卵庫存放 qty 顆進飼養盒，開始孵化 */
  | { type: 'silkPlaceEggs'; kind: SilkEggKind; qty: number; today: string }
  | { type: 'silkFeed'; uid: number; today: string }
  | { type: 'silkPet'; uid: number; today: string }
  | { type: 'silkSell'; uid: number; today: string }
  | { type: 'silkRelease'; uid: number; today: string }
  /** 用一張加速券讓一隻蠶立刻升一階 */
  | { type: 'silkSpeedup'; uid: number; today: string }
  /** 取名或改名；空字串代表清除名字 */
  | { type: 'silkRename'; uid: number; name: string; today: string }
  // ── 郵件：mailSync 的 today 是當地現實日期，公告信依它寄出 ──
  | { type: 'mailSync'; today: string }
  | { type: 'claimMail'; mailId: string }
  | { type: 'claimAllMail' }
  /** 幸運輪盤抽一次；today 用來計算每天的次數 */
  | { type: 'spinRoulette'; today: string };
