// 所有金額都是整數（新台幣元）。
export type Money = number;
export type ProductId = string;

export type Category = '3C' | '居家' | '服飾' | '美妝' | '收藏' | '寵物' | '點數';

export interface Product {
  id: ProductId;
  name: string;
  category: Category;
  icon: string;
  basePrice: Money;
  /** 限量品：新品價格會逐日上漲，二手價高於新品價 */
  limited?: boolean;
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

export interface JobState {
  /** JOBS 陣列的索引 */
  level: number;
  /** 目前職位已上班的天數，達到門檻就升職 */
  daysAtLevel: number;
  workedToday: boolean;
}

/** 收入來源。之後加入小遊戲打工時，在這裡新增 'minigame'。 */
export type IncomeSource = 'salary' | 'resale';

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
  | 'already_worked_today';

export type GameEvent =
  | { type: 'orderPlaced'; orderId: string; total: Money }
  | { type: 'packagesArrived'; orderIds: string[] }
  | { type: 'unboxed'; orderId: string; productIds: ProductId[] }
  | { type: 'income'; source: IncomeSource; amount: Money }
  | { type: 'promoted'; level: number }
  | { type: 'couponReceived'; coupon: Coupon }
  | { type: 'rejected'; reason: RejectReason };

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
  job: JobState;
  nextOrderNo: number;
  nextUid: number;
  /** 最近一次 action 產生的事件，給 UI 顯示通知用 */
  events: GameEvent[];
}
