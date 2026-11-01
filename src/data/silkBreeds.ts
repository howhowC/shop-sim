import type { SilkBreed } from '../core/types';

/** 蠶寶寶品種（虛構）。抽中機率由 rarity 決定（見 config.ts 的 SILK_EGG_WEIGHTS）；id 一旦上線就不要改。圖鑑依這裡的順序排列。 */
export const SILK_BREEDS: readonly SilkBreed[] = [
  { id: 'jade', name: '白玉蠶', rarity: 'common', body: '#f7f4ec', pattern: '#d9d2c3', patternType: 'none', cocoonPrice: 120 },
  { id: 'milk-tea', name: '奶茶蠶', rarity: 'common', body: '#ecd5b8', pattern: '#c9a57e', patternType: 'spots', cocoonPrice: 130 },
  { id: 'tiger', name: '虎斑蠶', rarity: 'uncommon', body: '#f3e6c4', pattern: '#7a5a3a', patternType: 'stripes', cocoonPrice: 200 },
  { id: 'sakura', name: '櫻花蠶', rarity: 'rare', body: '#ffd9e4', pattern: '#f39ab5', patternType: 'spots', cocoonPrice: 380 },
  { id: 'golden', name: '黃金蠶', rarity: 'rare', body: '#ffe48a', pattern: '#e0a922', patternType: 'stripes', cocoonPrice: 420 },
  { id: 'starry', name: '星空蠶', rarity: 'legendary', body: '#3b4a8c', pattern: '#fff3a8', patternType: 'spots', cocoonPrice: 900 },
  { id: 'black-whirl', name: '黑旋風', rarity: 'common', body: '#35313c', pattern: '#8d8799', patternType: 'swirl', cocoonPrice: 140 },
  { id: 'zebra', name: '黑白斑馬', rarity: 'common', body: '#fbfbf8', pattern: '#2b2a2e', patternType: 'stripes', cocoonPrice: 130 },
  { id: 'bunny-hat', name: '兔兔帽蠶寶寶', rarity: 'rare', body: '#f7f4ec', pattern: '#d9d2c3', patternType: 'none', hat: 'bunny', cocoonPrice: 450 },
  { id: 'hamster-hat', name: '黃金鼠帽蠶寶寶', rarity: 'rare', body: '#f7f4ec', pattern: '#d9d2c3', patternType: 'none', hat: 'hamster', cocoonPrice: 450 },
  { id: 'matcha', name: '抹茶蠶', rarity: 'common', body: '#b9d98a', pattern: '#6f9a3a', patternType: 'spots', cocoonPrice: 130 },
  { id: 'orange', name: '橘色蠶', rarity: 'common', body: '#ffbe7a', pattern: '#f08c3a', patternType: 'none', cocoonPrice: 120 },
  { id: 'taro', name: '芋頭蠶', rarity: 'uncommon', body: '#d9c6ec', pattern: '#9b7bc4', patternType: 'spots', cocoonPrice: 210 },
  { id: 'mint', name: '薄荷蠶', rarity: 'uncommon', body: '#c8f0dc', pattern: '#ffffff', patternType: 'stripes', cocoonPrice: 200 },
  { id: 'cloud', name: '雲朵蠶', rarity: 'rare', body: '#bfe1ff', pattern: '#ffffff', patternType: 'spots', cocoonPrice: 380 },
  { id: 'bear-hat', name: '小熊帽蠶寶寶', rarity: 'rare', body: '#f7f4ec', pattern: '#d9d2c3', patternType: 'none', hat: 'bear', cocoonPrice: 450 },
  { id: 'strawberry-hat', name: '草莓帽蠶寶寶', rarity: 'rare', body: '#f7f4ec', pattern: '#d9d2c3', patternType: 'none', hat: 'strawberry', cocoonPrice: 450 },
  { id: 'chick-hat', name: '小雞帽蠶寶寶', rarity: 'legendary', body: '#f7f4ec', pattern: '#d9d2c3', patternType: 'none', hat: 'chick', cocoonPrice: 850 },
  { id: 'rainbow', name: '彩虹蠶', rarity: 'legendary', body: '#fff6f0', pattern: '#ffffff', patternType: 'rainbow', cocoonPrice: 900 },
  { id: 'moonlight', name: '月光蠶', rarity: 'legendary', body: '#eef1fb', pattern: '#b8c4ef', patternType: 'crescent', glow: true, cocoonPrice: 950 },
];
