import type { Action } from '../actions';
import { reducer } from '../reducer';
import type { GameState } from '../types';

/** 遞迴凍結物件；reducer 如果直接修改 state，嚴格模式下會丟出錯誤 */
export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

/** 依序套用多個 action，每一步都先凍結 state */
export function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => reducer(deepFreeze(s), a), state);
}

export function times(n: number, action: Action): Action[] {
  return Array.from({ length: n }, () => action);
}
