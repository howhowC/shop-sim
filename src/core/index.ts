// UI 只從這裡 import core 的東西。
export type * from './types';
export type { Action } from './actions';
export { createInitialState, reducer, summarizeCart } from './reducer';
export type { CartSummary } from './reducer';
export { allProducts, getProduct } from './catalog';
export { currentPrice, fillMissingPrices } from './market';
export { getOrderStatus } from './orders';
export { resalePrice } from './income/resale';
export { CHECKIN_REWARDS, CHECKIN_DAY7_COUPON, STARTING_MONEY } from './config';
export { canCheckIn, nextStreak } from './income/checkin';
export { allSilkBreeds, getSilkBreed, isLarva, readyToGrow } from './silk';
export { cocoonQuality, silkSellPrice } from './income/silk';
export {
  SILK_CAPACITY,
  SILK_MAX_AFFECTION,
  SILK_PRICES,
  SILK_STAGE_COCOON,
  SILK_STAGE_EGG,
  SILK_STAGE_MOTH,
} from './config';
