// 遊戲平衡數值。調整難度和手感時只需要改這個檔案。
// 金額單位都是新台幣元（整數）。

// ── 開局 ──
export const STARTING_MONEY = 5000;
/** 開局送的優惠券；validDays 是含當天在內可以使用的天數 */
export const WELCOME_COUPON = { minSpend: 600, discount: 100, validDays: 3 };

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
/** 每天可能掉落的優惠券，掉落時平均挑一種。percent：打折券（50 = 打五折，沒有折抵上限），這時 discount 填 0 */
export const COUPON_TEMPLATES: readonly { minSpend: number; discount: number; percent?: number }[] = [
  { minSpend: 300, discount: 100 },
  { minSpend: 600, discount: 150 },
  { minSpend: 1800, discount: 600 },
  { minSpend: 300, discount: 0, percent: 50 },
];

// ── 物流 ──
export const MIN_DELIVERY_DAYS = 2;
export const MAX_DELIVERY_DAYS = 4;

// ── 取消與退貨 ──
/** 鑑賞期：開箱當天起算，第 openedDay + 這個天數 那天結束前都可以退貨（遊戲日） */
export const RETURN_WINDOW_DAYS = 7;

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

// ── 養蠶小遊戲（成長依現實日期，一天最多升一個階段）──
/** 階段編號：0 卵、1～5 一齡到五齡、6 繭、7 蛾 */
export const SILK_STAGE_EGG = 0;
export const SILK_STAGE_LAST_LARVA = 5;
export const SILK_STAGE_COCOON = 6;
export const SILK_STAGE_MOTH = 7;
/** 飼養盒一開始的容量（含卵、繭、蛾）；擴充後的容量見 silk.ts 的 silkCapacity() */
export const SILK_CAPACITY = 60;
/** 小店價格（元） */
export const SILK_PRICES = { egg: 60, premiumEgg: 180, leaf: 10, speedup: 50, habitat: 120 } as const;
/** 飼養盒擴充：每次增加幾格、最多擴充幾次 */
export const SILK_EXPANSION_SLOTS = 10;
export const SILK_MAX_EXPANSIONS = 4;
/** 親密度：餵食、摸摸各加多少；上限 */
export const SILK_FEED_AFFECTION = 10;
export const SILK_PET_AFFECTION = 5;
export const SILK_MAX_AFFECTION = 100;
/** 蠶寶寶名字最多幾個字（emoji 算一個字） */
export const SILK_NAME_MAX_LENGTH = 10;
/** 繭的品質：親密度 ≥ minAffection 就套用該倍率（由高到低檢查）。
 *  幼蟲期 5 天、每天餵食＋摸摸最多 +15，全勤照顧剛好 75 → 極品；只餵不摸 50 → 優良 */
export const SILK_COCOON_QUALITY: readonly { quality: 'great' | 'good' | 'normal'; minAffection: number; rate: number }[] = [
  { quality: 'great', minAffection: 70, rate: 1.8 },
  { quality: 'good', minAffection: 40, rate: 1.3 },
  { quality: 'normal', minAffection: 0, rate: 1 },
];
/** 幼蟲出售價 = 繭基礎價 × 齡數 × 這個比例（賣幼蟲比等結繭划不來） */
export const SILK_LARVA_SELL_RATE_PER_STAGE = 0.1;
/** 抽卵機率：每個稀有度的總機率（%），同稀有度的品種平分。
 *  加品種或改品種等級時不用改這裡；例如普通卵有 6 種普通品種，每種 75% ÷ 6 = 12.5% */
export const SILK_EGG_WEIGHTS = {
  egg: { common: 75, uncommon: 15, rare: 8, legendary: 2 },
  premiumEgg: { common: 35, uncommon: 25, rare: 25, legendary: 15 },
} as const;

// ── 郵件 ──
/** 每過一天收到隨機來信的機率 */
export const MAIL_RANDOM_CHANCE = 0.15;
/** 信箱最多保留幾封「已領取」的信，超過時刪掉最舊的（沒領的信不會被刪） */
export const MAIL_KEEP_CLAIMED = 30;

// ── 幸運輪盤（每天的次數依現實日期計算）──
/** 抽一次的價格（元）；每個獎品的價值都不能低於這個數（有測試檢查） */
export const ROULETTE_PRICE = 100;
/** 每天可以抽幾次 */
export const ROULETTE_DAILY_SPINS = 3;
