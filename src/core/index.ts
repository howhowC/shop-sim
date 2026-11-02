// UI 只從這裡 import core 的東西。
export type * from './types';
export type { Action } from './actions';
export { createInitialState, reducer, summarizeCart } from './reducer';
export type { CartSummary } from './reducer';
export { allProducts, getProduct, isPhysical } from './catalog';
export { currentPrice, fillMissingPrices } from './market';
export { activeQty, getOrderStatus, isOrderCancelled, refundForOne, returnDaysLeft, shippedQty } from './orders';
export { resalePrice } from './income/resale';
export { CHECKIN_REWARDS, CHECKIN_DAY7_COUPON, STARTING_MONEY } from './config';
export { canCheckIn, nextStreak } from './income/checkin';
export { allSilkBreeds, getSilkBreed, isLarva, readyToGrow, silkCapacity, summarizeSilkCart } from './silk';
export type { SilkCartLine, SilkCartSummary } from './silk';
export { cocoonQuality, silkSellPrice } from './income/silk';
export {
  SILK_MAX_AFFECTION,
  SILK_NAME_MAX_LENGTH,
  SILK_PRICES,
  SILK_EXPANSION_SLOTS,
  SILK_MAX_EXPANSIONS,
  MAIL_KEEP_CLAIMED,
  SILK_STAGE_COCOON,
  SILK_STAGE_EGG,
  SILK_STAGE_MOTH,
} from './config';
export { getMailTemplate, unclaimedCount } from './mail';
export { allRoulettePrizes, prizeChance, prizeValue, spinsLeft } from './roulette';
export { ROULETTE_DAILY_SPINS, ROULETTE_PRICE } from './config';
