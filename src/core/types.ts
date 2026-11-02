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
  /** 虛擬商品：可以下單、到貨前可以取消，但開箱後不會變成房間裡的物品（例如補差價） */
  virtual?: boolean;
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
  /** 下單時的數量（取消、退貨後也不變，方便顯示紀錄） */
  qty: number;
  /** 到貨前取消的件數；舊存檔沒有這個欄位，視為 0 */
  cancelledQty?: number;
  /** 開箱後退貨的件數；舊存檔沒有這個欄位，視為 0 */
  returnedQty?: number;
}

export interface Order {
  id: string;
  lines: OrderLine[];
  total: Money;
  placedDay: number;
  deliveryDay: number;
  opened: boolean;
  /** 開箱的遊戲日，用來計算鑑賞期；舊存檔沒有，代表不能退貨 */
  openedDay?: number;
}

export type OrderStatus = 'placed' | 'shipped' | 'in_transit' | 'delivered';

export interface OwnedItem {
  uid: number;
  productId: ProductId;
  paidPrice: Money;
  acquiredDay: number;
  /** 來自哪一筆訂單（可以退貨時用）；舊存檔沒有，代表不能退貨 */
  orderId?: string;
}

/** 每日簽到；依現實世界的日期，和遊戲內的 day 無關 */
export interface CheckInState {
  /** 最近一次簽到的當地日期，格式 'YYYY-MM-DD'；從沒簽過是 null */
  lastDate: string | null;
  /** 連續簽到天數 */
  streak: number;
}

/** 收入來源。新增小遊戲時在這裡加上名稱。 */
export type IncomeSource = 'checkIn' | 'resale' | 'silk' | 'mail';

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
  /** rainbow：每節身體不同顏色（body/pattern 只當底色）；crescent：月牙紋 */
  patternType: 'none' | 'stripes' | 'spots' | 'swirl' | 'rainbow' | 'crescent';
  /** 頭上戴的帽子（幼蟲和蛾會畫出來） */
  hat?: 'bunny' | 'hamster' | 'bear' | 'strawberry' | 'chick';
  /** 整隻有柔和光暈 */
  glow?: boolean;
  /** 普通品質的繭賣價（元） */
  cocoonPrice: Money;
}

export type SilkEggKind = 'egg' | 'premiumEgg';
/** speedup：加速券，讓一隻蠶立刻升一階 */
export type SilkShopItem = SilkEggKind | 'leaf' | 'speedup';

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
  /** 加速券張數 */
  speedups: number;
  /** 圖鑑；沒出現過的品種不會有 key */
  dex: Record<SilkBreedId, SilkDexEntry>;
}

// ── 郵件 ──
export type MailReward =
  | { kind: 'money'; amount: Money }
  /** validDays：含領取當天在內可以使用的天數 */
  | { kind: 'coupon'; minSpend: Money; discount: Money; validDays: number }
  | { kind: 'silk'; item: SilkShopItem; qty: number }
  | { kind: 'product'; productId: ProductId; qty: number };

/** 信件內容（寫在 data/mail.ts）；存檔只存 templateId */
export interface MailTemplate {
  id: string;
  from: string;
  title: string;
  body: string;
  rewards: MailReward[];
}

/** 開發者公告／禮物信：現實日期到了就寄給所有玩家，每封只寄一次 */
export interface AnnouncementTemplate extends MailTemplate {
  /** 開放日期（當地現實日期 'YYYY-MM-DD'） */
  availableFrom: string;
}

/** 里程碑條件：數量達到 count 就寄信，每封只寄一次 */
export type MilestoneCondition =
  | { kind: 'orders'; count: number }
  | { kind: 'unboxed'; count: number }
  | { kind: 'moths'; count: number }
  | { kind: 'dexHatched'; count: number }
  | { kind: 'checkInStreak'; count: number };

export interface MilestoneTemplate extends MailTemplate {
  condition: MilestoneCondition;
}

/** 輪盤獎品；同時也是一封信的模板（飼養盒放不下時改寄到信箱） */
export interface RoulettePrize extends MailTemplate {
  /** 輪盤上顯示的短名稱和圖示 */
  label: string;
  icon: string;
  /** 抽中權重（全部加總後換算機率） */
  weight: number;
}

/** 幸運輪盤；每天的次數依現實日期計算 */
export interface RouletteState {
  /** 最近一次抽的當地日期 'YYYY-MM-DD' */
  date: string | null;
  /** date 那天已經抽了幾次 */
  spinsToday: number;
  /** 最近一次抽中的獎品 id（UI 用來決定輪盤停在哪一格） */
  lastPrizeId: string | null;
  /** 累計抽獎次數（UI 用來偵測「剛抽了一次」） */
  totalSpins: number;
}

export interface Mail {
  id: string;
  templateId: string;
  receivedDay: number;
  claimed: boolean;
}

export interface MailState {
  inbox: Mail[];
  /** 已經寄過的公告和里程碑 templateId，避免重複寄 */
  delivered: string[];
  nextMailNo: number;
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
  | 'order_already_delivered'
  | 'order_cancelled'
  | 'item_not_returnable'
  | 'return_window_expired'
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
  | 'silk_cannot_release'
  | 'silk_no_speedups'
  | 'silk_cannot_speedup'
  | 'unknown_mail'
  | 'mail_already_claimed'
  | 'no_mail_to_claim'
  | 'roulette_no_spins_left';

export type GameEvent =
  | { type: 'orderPlaced'; orderId: string; total: Money }
  | { type: 'packagesArrived'; orderIds: string[] }
  | { type: 'unboxed'; orderId: string; productIds: ProductId[] }
  | { type: 'income'; source: IncomeSource; amount: Money }
  | { type: 'couponReceived'; coupon: Coupon }
  | { type: 'rejected'; reason: RejectReason }
  /** 退款不算收入，所以不走 earn() 的 income 事件 */
  | { type: 'refunded'; kind: 'cancel' | 'return'; orderId: string; productId: ProductId; amount: Money }
  | { type: 'silkBought'; item: SilkShopItem; qty: number; total: Money }
  | { type: 'silkHatched'; uid: number; breed: SilkBreedId }
  | { type: 'silkGrew'; uids: number[] }
  | { type: 'silkCocooned'; uids: number[] }
  | { type: 'silkEmerged'; uids: number[] }
  | { type: 'silkFed'; uid: number }
  | { type: 'silkPetted'; uid: number }
  | { type: 'silkReleased'; uid: number }
  | { type: 'mailReceived'; count: number }
  | { type: 'mailClaimed'; mailId: string; templateId: string }
  /** toMail：飼養盒放不下，獎品改寄到信箱 */
  | { type: 'rouletteWon'; prizeId: string; toMail: boolean };

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
  mail: MailState;
  roulette: RouletteState;
  nextOrderNo: number;
  nextUid: number;
  /** 最近一次 action 產生的事件，給 UI 顯示通知用 */
  events: GameEvent[];
}
