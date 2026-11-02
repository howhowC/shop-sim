import type { AnnouncementTemplate, MailTemplate, MilestoneTemplate } from '../core/types';

// 郵件內容。id 一旦上線就不要改（存檔用 id 記錄寄過哪些信）。
// 新增公告信：在 ANNOUNCEMENTS 加一筆、設定 availableFrom，push 部署後玩家打開網頁就會收到。

/** 開發者公告／禮物信：availableFrom（當地現實日期）當天起，玩家打開遊戲就會收到，每封只寄一次 */
export const ANNOUNCEMENTS: readonly AnnouncementTemplate[] = [
  {
    id: 'welcome-mailbox',
    availableFrom: '2026-11-02',
    from: '鈺鈺商城',
    title: '郵件功能上線囉！',
    body: '以後有活動、禮物或驚喜，都會寄到這個信箱。先送你一點零用錢和兩張蠶寶寶加速券，祝你購物愉快！',
    rewards: [
      { kind: 'money', amount: 5000 },
      { kind: 'silk', item: 'speedup', qty: 2 },
    ],
  },
  {
    id: 'roulette-launch',
    availableFrom: '2026-11-02',
    from: '鈺鈺商城',
    title: '幸運輪盤開張囉！',
    body: '全新的「幸運輪盤」上線了！每次 $100，每天可以抽 3 次，每個獎品都值回票價，還有機會抽中 $500 大獎。送你 $1,000 當作開張紅包，快去試試手氣吧！',
    rewards: [{ kind: 'money', amount: 1000 }],
  },
];

/** 隨機來信：每過一天有機率收到其中一封（平均挑選） */
export const RANDOM_MAIL: readonly MailTemplate[] = [
  {
    id: 'thanks-shop',
    from: '鈺鈺商城客服',
    title: '謝謝你的支持',
    body: '感謝你一直以來的光顧，這是一點小小心意。',
    rewards: [{ kind: 'money', amount: 150 }],
  },
  {
    id: 'farmer-leaves',
    from: '蠶農伯伯',
    title: '多採的桑葉分你',
    body: '今天桑葉長得特別好，多採了一些，給你的蠶寶寶加菜！',
    rewards: [{ kind: 'silk', item: 'leaf', qty: 5 }],
  },
  {
    id: 'mystery-sticker',
    from: '神秘寄件人',
    title: '一個小包裹',
    body: '沒有署名的小包裹，打開一看是一張可愛貼紙。',
    rewards: [{ kind: 'product', productId: 'sticker', qty: 1 }],
  },
  {
    id: 'speedup-trial',
    from: '蠶寶寶研究所',
    title: '加速券試用活動',
    body: '研究所新開發的加速券，請幫我們試用看看效果！',
    rewards: [{ kind: 'silk', item: 'speedup', qty: 1 }],
  },
  {
    id: 'coupon-gift',
    from: '鈺鈺商城',
    title: '專屬折價券',
    body: '送你一張限時折價券，三天內有效喔。',
    rewards: [{ kind: 'coupon', minSpend: 300, discount: 60, validDays: 3 }],
  },
];

/** 里程碑來信：條件第一次達成時寄出，每封只寄一次 */
export const MILESTONE_MAIL: readonly MilestoneTemplate[] = [
  {
    id: 'first-order',
    condition: { kind: 'orders', count: 1 },
    from: '鈺鈺商城',
    title: '恭喜完成第一筆訂單！',
    body: '謝謝你選擇鈺鈺商城，包裹正在路上，這是新手小禮物。',
    rewards: [{ kind: 'money', amount: 200 }],
  },
  {
    id: 'first-unbox',
    condition: { kind: 'unboxed', count: 1 },
    from: '鈺鈺商城',
    title: '開箱快樂！',
    body: '第一次開箱的感覺很棒吧？下次購物可以用這張折價券。',
    rewards: [{ kind: 'coupon', minSpend: 600, discount: 100, validDays: 5 }],
  },
  {
    id: 'checkin-7',
    condition: { kind: 'checkInStreak', count: 7 },
    from: '鈺鈺商城',
    title: '連續簽到一週！',
    body: '連續簽到 7 天好厲害，送你一張大額折價券。',
    rewards: [{ kind: 'coupon', minSpend: 1200, discount: 250, validDays: 7 }],
  },
  {
    id: 'first-moth',
    condition: { kind: 'moths', count: 1 },
    from: '蠶寶寶研究所',
    title: '第一隻蛾寶寶誕生',
    body: '從小小的卵一路照顧到羽化，辛苦了！送你一顆精選蠶卵。',
    rewards: [{ kind: 'silk', item: 'premiumEgg', qty: 1 }],
  },
  {
    id: 'dex-5',
    condition: { kind: 'dexHatched', count: 5 },
    from: '蠶寶寶研究所',
    title: '圖鑑收集 5 種',
    body: '你的圖鑑越來越豐富了，這幾張加速券給你用。',
    rewards: [{ kind: 'silk', item: 'speedup', qty: 3 }],
  },
  {
    id: 'dex-10',
    condition: { kind: 'dexHatched', count: 10 },
    from: '蠶寶寶研究所',
    title: '圖鑑收集 10 種',
    body: '已經收集一半的品種了！這是研究所的獎金。',
    rewards: [{ kind: 'money', amount: 800 }],
  },
  {
    id: 'dex-20',
    condition: { kind: 'dexHatched', count: 20 },
    from: '蠶寶寶研究所',
    title: '圖鑑全部收集完成',
    body: '全部 20 種都孵化過了，你是真正的蠶寶寶大師！',
    rewards: [
      { kind: 'money', amount: 2000 },
      { kind: 'silk', item: 'premiumEgg', qty: 2 },
    ],
  },
];
