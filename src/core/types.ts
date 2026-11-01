// 所有金額都是整數（新台幣元）。
export type Money = number;
export type ProductId = string;

export type Category = '3C' | '居家' | '服飾' | '美妝' | '收藏' | '寵物' | '點數' | '其他';

export interface Product {
  id: ProductId;
  name: string;
  category: Category;
  icon: string;
  basePrice: Money;
  /** 限量品：新品價格會逐日上漲，二手價高於新品價 */
  limited?: boolean;
  /** 固定價格：價格永遠是 basePrice，不受每日波動和取整影響，也不會被抽中限時特價（例如 $1 補差價） */
  fixedPrice?: boolean;
}

export interface FlashSale {
  productId: ProductId;
  /** 折扣百分比，例如 30 代表打七折 */
  discountPercent: number;
  /** 特價在這一天結束時失效 */
  endsDay: number;
}

export interface Coupon {
  id: string;
  minSpend: Money;
  discount: Money;
  /** 這一天結束後失效 */
  expiresDay: number;
}

export interface OrderLine {
  productId: ProductId;
  unitPrice: Money;
  qty: number;
}

export interface Order {
  id: string;
  lines: OrderLine[];
  total: Money;
  placedDay: number;
  deliveryDay: number;
  opened: boolean;
}

export type OrderStatus = 'placed' | 'shipped' | 'in_transit' | 'delivered';

export interface OwnedItem {
  uid: number;
  productId: ProductId;
  paidPrice: Money;
  acquiredDay: number;
}

/** 每日簽到；依現實世界的日期，和遊戲內的 day 無關 */
export interface CheckInState {
  /** 最近一次簽到的當地日期，格式 'YYYY-MM-DD'；從沒簽過是 null */
  lastDate: string | null;
  /** 連續簽到天數 */
  streak: number;
}

/** 收入來源。新增小遊戲時在這裡加上名稱。 */
export type IncomeSource = 'checkIn' | 'resale' | 'silk';

// ── 養蠶小遊戲 ──
export type SilkBreedId = string;
export type SilkRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface SilkBreed {
  id: SilkBreedId;
  name: string;
  rarity: SilkRarity;
  /** SVG 用的身體顏色與花紋顏色 */
  body: string;
  pattern: string;
  patternType: 'none' | 'stripes' | 'spots' | 'swirl';
  /** 頭上戴的帽子（幼蟲和蛾會畫出來） */
  hat?: 'bunny' | 'hamster';
  /** 普通品質的繭賣價（元） */
  cocoonPrice: Money;
}

export type SilkEggKind = 'egg' | 'premiumEgg';
export type SilkShopItem = SilkEggKind | 'leaf';

export interface Silkworm {
  uid: number;
  /** 買卵時就抽好，孵化後才給玩家看 */
  breed: SilkBreedId;
  /** 0 卵、1～5 齡、6 繭、7 蛾（見 config.ts） */
  stage: number;
  /** 進入目前階段的現實日期 'YYYY-MM-DD' */
  stageSince: string;
  /** 最近一次餵食／摸摸的現實日期 */
  fedOn: string | null;
  pettedOn: string | null;
  /** 親密度 0～100，影響繭的品質 */
  affection: number;
}

export interface SilkDexEntry {
  hatched: boolean;
  moth: boolean;
}

export interface SilkState {
  worms: Silkworm[];
  /** 桑葉剩幾份；一份餵一次 */
  leaves: number;
  /** 圖鑑；沒出現過的品種不會有 key */
  dex: Record<SilkBreedId, SilkDexEntry>;
}

export type RejectReason =
  | 'unknown_product'
  | 'empty_cart'
  | 'insufficient_funds'
  | 'invalid_coupon'
  | 'coupon_threshold_not_met'
  | 'unknown_order'
  | 'order_not_delivered'
  | 'order_already_opened'
  | 'unknown_item'
  | 'already_checked_in_today'
  | 'silk_unknown'
  | 'silk_unknown_item'
  | 'silk_capacity_full'
  | 'silk_no_leaves'
  | 'silk_already_fed'
  | 'silk_already_petted'
  | 'silk_cannot_feed'
  | 'silk_cannot_pet'
  | 'silk_cannot_sell'
  | 'silk_cannot_release';

export type GameEvent =
  | { type: 'orderPlaced'; orderId: string; total: Money }
  | { type: 'packagesArrived'; orderIds: string[] }
  | { type: 'unboxed'; orderId: string; productIds: ProductId[] }
  | { type: 'income'; source: IncomeSource; amount: Money }
  | { type: 'couponReceived'; coupon: Coupon }
  | { type: 'rejected'; reason: RejectReason }
  | { type: 'silkBought'; item: SilkShopItem; qty: number; total: Money }
  | { type: 'silkHatched'; uid: number; breed: SilkBreedId }
  | { type: 'silkGrew'; uids: number[] }
  | { type: 'silkCocooned'; uids: number[] }
  | { type: 'silkEmerged'; uids: number[] }
  | { type: 'silkFed'; uid: number }
  | { type: 'silkPetted'; uid: number }
  | { type: 'silkReleased'; uid: number };

export interface GameState {
  day: number;
  money: Money;
  /** seeded RNG 的目前狀態；所有亂數都由它產生，才能重現 */
  rngState: number;
  /** 今天的牌價（未含限時特價） */
  prices: Record<ProductId, Money>;
  /** 昨天的牌價，用來顯示漲跌 */
  prevPrices: Record<ProductId, Money>;
  flashSale: FlashSale | null;
  coupons: Coupon[];
  cart: Record<ProductId, number>;
  orders: Order[];
  inventory: OwnedItem[];
  checkIn: CheckInState;
  silk: SilkState;
  nextOrderNo: number;
  nextUid: number;
  /** 最近一次 action 產生的事件，給 UI 顯示通知用 */
  events: GameEvent[];
}
