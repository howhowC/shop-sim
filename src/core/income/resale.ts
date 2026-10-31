import { getProduct, round10 } from '../catalog';
import { LIMITED_RESALE_GROWTH_PER_DAY, LIMITED_RESALE_MAX_RATE, RESALE_RATE } from '../config';
import { findItem, removeItem } from '../inventory';
import type { GameEvent, GameState, Money, OwnedItem } from '../types';
import { earn } from './earn';

/**
 * 一般商品：依今日牌價打折回收。
 * 限量品：依「自己的買價」隨持有天數增值，有上限。
 * 這樣限量品不會出現「買了馬上賣就賺錢」的漏洞，要囤一段時間才有利潤。
 */
export function resalePrice(state: GameState, item: OwnedItem): Money {
  const product = getProduct(item.productId);
  if (product?.limited) {
    const daysHeld = Math.max(0, state.day - item.acquiredDay);
    const rate = Math.min(1 + daysHeld * LIMITED_RESALE_GROWTH_PER_DAY, LIMITED_RESALE_MAX_RATE);
    return round10(item.paidPrice * rate);
  }
  return round10((state.prices[item.productId] ?? 0) * RESALE_RATE);
}

export function sellItem(state: GameState, uid: number): { state: GameState; events: GameEvent[] } {
  const item = findItem(state, uid);
  if (!item) return { state, events: [{ type: 'rejected', reason: 'unknown_item' }] };
  const paid = earn(removeItem(state, uid), 'resale', resalePrice(state, item));
  return { state: paid.state, events: [paid.event] };
}
