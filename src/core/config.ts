// 遊戲平衡數值。調整難度和手感時只需要改這個檔案。
// 金額單位都是新台幣元（整數）。

// ── 開局 ──
export const STARTING_MONEY = 5000;
/** 開局送的優惠券；validDays 是含當天在內可以使用的天數 */
export const WELCOME_COUPON = { minSpend: 1000, discount: 100, validDays: 3 };

// ── 市場價格 ──
/** 每日價格在基準價的 ±10% 內波動 */
export const DAILY_SWING = 0.1;
/** 限量品每天漲 2% */
export const LIMITED_DAILY_GROWTH = 0.02;
/** 每天的限時特價會從這些折扣（百分比）中隨機挑一個 */
export const FLASH_SALE_DISCOUNTS: readonly number[] = [20, 30, 40];

// ── 優惠券 ──
/** 每天獲得優惠券的機率 */
export const COUPON_DROP_CHANCE = 0.35;
/** 優惠券含當天在內可以使用的天數 */
export const COUPON_LIFETIME_DAYS = 3;
export const COUPON_TEMPLATES: readonly { minSpend: number; discount: number }[] = [
  { minSpend: 500, discount: 50 },
  { minSpend: 1000, discount: 100 },
  { minSpend: 3000, discount: 400 },
];

// ── 物流 ──
export const MIN_DELIVERY_DAYS = 2;
export const MAX_DELIVERY_DAYS = 4;

// ── 每日簽到（依現實日期，一天一次）──
/** 連續簽到第 1～7 天的獎勵；第 8 天起從頭循環。斷簽會回到第 1 天 */
export const CHECKIN_REWARDS: readonly number[] = [600, 700, 800, 900, 1000, 1100, 1500];
/** 每連續簽到滿 7 天加送的優惠券 */
export const CHECKIN_DAY7_COUPON = { minSpend: 600, discount: 120 };

// ── 二手轉賣 ──
/** 一般商品依今日牌價的比例回收 */
export const RESALE_RATE = 0.55;
/** 限量品的二手價 = 買價 × (1 + 持有天數 × 這個比例)，持有越久越值錢 */
export const LIMITED_RESALE_GROWTH_PER_DAY = 0.02;
/** 限量品二手價最多是買價的幾倍（0.02 × 25 天就會到上限） */
export const LIMITED_RESALE_MAX_RATE = 1.5;
