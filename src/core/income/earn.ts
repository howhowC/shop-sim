import type { GameEvent, GameState, IncomeSource, Money } from '../types';

/**
 * 所有收入來源都透過這個函式入帳，並產生一個 income 事件。
 * 新增收入來源（例如小遊戲打工）時：
 *   1. 在 types.ts 的 IncomeSource 加上新名稱
 *   2. 在 income/ 新增一個檔案，計算金額後呼叫 earn()
 *   3. 在 actions.ts / reducer.ts 加上對應的 action
 */
export function earn(
  state: GameState,
  source: IncomeSource,
  amount: Money,
): { state: GameState; event: GameEvent } {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`invalid income amount: ${amount}`);
  }
  return {
    state: { ...state, money: state.money + amount },
    event: { type: 'income', source, amount },
  };
}
