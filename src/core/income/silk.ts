import { round10 } from '../catalog';
import { SILK_COCOON_QUALITY, SILK_LARVA_SELL_RATE_PER_STAGE, SILK_STAGE_COCOON } from '../config';
import { findSilkworm, getSilkBreed, isLarva, nameOf, rejected, removeWorm, type SilkResult } from '../silk';
import type { GameState, Money, Silkworm } from '../types';
import { earn } from './earn';

export type CocoonQuality = (typeof SILK_COCOON_QUALITY)[number];

/** 繭的品質（依親密度，由高到低找第一個達標的） */
export function cocoonQuality(affection: number): CocoonQuality {
  return SILK_COCOON_QUALITY.find((q) => affection >= q.minAffection) ?? SILK_COCOON_QUALITY[SILK_COCOON_QUALITY.length - 1];
}

/** 出售價：繭最值錢且看品質，幼蟲依齡數打折；卵和蛾不能賣，回傳 null */
export function silkSellPrice(w: Silkworm): Money | null {
  const breed = getSilkBreed(w.breed);
  if (!breed) return null;
  if (w.stage === SILK_STAGE_COCOON) return round10(breed.cocoonPrice * cocoonQuality(w.affection).rate);
  if (isLarva(w)) return round10(breed.cocoonPrice * w.stage * SILK_LARVA_SELL_RATE_PER_STAGE);
  return null;
}

export function sellSilkworm(state: GameState, uid: number): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  const price = silkSellPrice(w);
  if (price === null) return rejected(state, 'silk_cannot_sell');
  // 錢照規則透過 earn() 入帳；通知改用 silkSold，才能帶上名字
  const paid = earn(removeWorm(state, uid), 'silk', price);
  return { state: paid.state, events: [{ type: 'silkSold', uid, name: nameOf(w), amount: price }] };
}
