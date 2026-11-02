import { isPhysical } from './catalog';
import { shippedQty } from './orders';
import type { GameState, Order, OwnedItem } from './types';

/** 把訂單內容展開成一件一件的收藏品（到貨前取消的、虛擬商品、養蠶用品不算） */
export function addFromOrder(state: GameState, order: Order): GameState {
  let uid = state.nextUid;
  const added: OwnedItem[] = [];
  for (const line of order.lines) {
    if (!isPhysical(line.productId)) continue;
    for (let i = 0; i < shippedQty(line); i++) {
      added.push({ uid: uid++, productId: line.productId, paidPrice: line.unitPrice, acquiredDay: state.day, orderId: order.id });
    }
  }
  return { ...state, inventory: [...state.inventory, ...added], nextUid: uid };
}

export function findItem(state: GameState, uid: number): OwnedItem | undefined {
  return state.inventory.find((it) => it.uid === uid);
}

export function removeItem(state: GameState, uid: number): GameState {
  return { ...state, inventory: state.inventory.filter((it) => it.uid !== uid) };
}
