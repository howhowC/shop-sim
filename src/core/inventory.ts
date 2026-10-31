import type { GameState, OrderLine, OwnedItem } from './types';

/** 把訂單內容展開成一件一件的收藏品 */
export function addFromOrder(state: GameState, lines: readonly OrderLine[]): GameState {
  let uid = state.nextUid;
  const added: OwnedItem[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.qty; i++) {
      added.push({ uid: uid++, productId: line.productId, paidPrice: line.unitPrice, acquiredDay: state.day });
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
