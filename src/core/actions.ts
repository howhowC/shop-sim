import type { ProductId } from './types';

/** 玩家能做的所有事。UI 只能透過 dispatch 這些 action 改變遊戲狀態。 */
export type Action =
  | { type: 'addToCart'; productId: ProductId; qty?: number }
  | { type: 'setCartQty'; productId: ProductId; qty: number }
  | { type: 'checkout'; couponId?: string }
  | { type: 'unboxOrder'; orderId: string }
  | { type: 'sellItem'; uid: number }
  | { type: 'work' }
  | { type: 'nextDay' };
