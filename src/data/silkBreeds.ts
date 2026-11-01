import type { SilkBreed } from '../core/types';

/** 蠶寶寶品種（虛構）。順序對應 config.ts 的 SILK_EGG_WEIGHTS；id 一旦上線就不要改。 */
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
];
