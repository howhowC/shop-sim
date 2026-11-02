import type { RoulettePrize } from '../core/types';

// 幸運輪盤的獎品。id 一旦上線就不要改。順序就是輪盤上順時針的排列（第一格在指針正下方）。
// 每個獎品的價值都要 ≥ 一次的價格（config.ts 的 ROULETTE_PRICE），測試會檢查：
//   金錢 = 金額；優惠券 = 折抵金額；養蠶用品 = 小店價格 × 數量；商品 = 基準價 × 數量。
// from / title / body 只在獎品改寄到信箱時顯示。

const mailText = { from: '幸運輪盤', body: '飼養盒放不下，獎品先寄到信箱，有空位再來領喔。' };

export const ROULETTE_PRIZES: readonly RoulettePrize[] = [
  { id: 'roulette-speedup', label: '加速券 ×2', icon: '⏩', weight: 22, title: '輪盤獎品：加速券 ×2', ...mailText, rewards: [{ kind: 'silk', item: 'speedup', qty: 2 }] },
  { id: 'roulette-leaves', label: '桑葉 ×10', icon: '🍃', weight: 20, title: '輪盤獎品：桑葉 ×10', ...mailText, rewards: [{ kind: 'silk', item: 'leaf', qty: 10 }] },
  { id: 'roulette-eggs', label: '蠶卵 ×2', icon: '🥚', weight: 15, title: '輪盤獎品：蠶卵 ×2', ...mailText, rewards: [{ kind: 'silk', item: 'egg', qty: 2 }] },
  { id: 'roulette-coupon', label: '滿600折150', icon: '🎟️', weight: 12, title: '輪盤獎品：優惠券', ...mailText, rewards: [{ kind: 'coupon', minSpend: 600, discount: 150, validDays: 5 }] },
  { id: 'roulette-cash', label: '$150', icon: '💰', weight: 12, title: '輪盤獎品：$150', ...mailText, rewards: [{ kind: 'money', amount: 150 }] },
  { id: 'roulette-candle', label: '香氛蠟燭', icon: '🕯️', weight: 8, title: '輪盤獎品：香氛蠟燭', ...mailText, rewards: [{ kind: 'product', productId: 'cedar-candle', qty: 1 }] },
  { id: 'roulette-premium-egg', label: '精選蠶卵', icon: '✨', weight: 8, title: '輪盤獎品：精選蠶卵', ...mailText, rewards: [{ kind: 'silk', item: 'premiumEgg', qty: 1 }] },
  { id: 'roulette-jackpot', label: '大獎 $500', icon: '💎', weight: 3, title: '輪盤獎品：大獎 $500', ...mailText, rewards: [{ kind: 'money', amount: 500 }] },
];
