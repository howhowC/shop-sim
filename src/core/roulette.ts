// 幸運輪盤：付錢抽一個獎品，每天的次數依現實日期計算。獎品清單在 data/roulette.ts。

import { ROULETTE_PRIZES } from '../data/roulette';
import { getProduct } from './catalog';
import { ROULETTE_DAILY_SPINS, ROULETTE_PRICE, SILK_PRICES } from './config';
import { giveRewards, sendMail } from './mail';
import type { Rng } from './rng';
import { createRng } from './rng';
import { rejected, type SilkResult } from './silk';
import type { GameState, Money, RoulettePrize, RouletteState } from './types';

export function createRouletteState(): RouletteState {
  return { date: null, spinsToday: 0, lastPrizeId: null, totalSpins: 0 };
}

export function allRoulettePrizes(): readonly RoulettePrize[] {
  return ROULETTE_PRIZES;
}

/** 今天還能抽幾次（換日後重新計算） */
export function spinsLeft(state: GameState, today: string): number {
  const used = state.roulette.date === today ? state.roulette.spinsToday : 0;
  return Math.max(0, ROULETTE_DAILY_SPINS - used);
}

/** 抽中機率（0～1），給 UI 顯示 */
export function prizeChance(prize: RoulettePrize): number {
  const total = ROULETTE_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  return prize.weight / total;
}

/** 獎品價值：金錢＝金額、優惠券＝折抵金額（打折券用「剛好達到門檻時折掉的金額」）、養蠶用品＝小店價、商品＝基準價 */
export function prizeValue(prize: RoulettePrize): Money {
  return prize.rewards.reduce((sum, r) => {
    switch (r.kind) {
      case 'money':
        return sum + r.amount;
      case 'coupon':
        return sum + (r.percent !== undefined ? Math.floor((r.minSpend * r.percent) / 100) : r.discount);
      case 'silk':
        return sum + SILK_PRICES[r.item] * r.qty;
      case 'product':
        return sum + (getProduct(r.productId)?.basePrice ?? 0) * r.qty;
    }
  }, 0);
}

function rollPrize(rng: Rng): RoulettePrize {
  const total = ROULETTE_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let r = rng.next() * total;
  return ROULETTE_PRIZES.find((p) => (r -= p.weight) < 0) ?? ROULETTE_PRIZES[ROULETTE_PRIZES.length - 1];
}

/** 抽一次：扣錢、抽獎、直接發獎；飼養盒放不下時改寄到信箱 */
export function spinRoulette(state: GameState, today: string): SilkResult {
  if (spinsLeft(state, today) <= 0) return rejected(state, 'roulette_no_spins_left');
  if (state.money < ROULETTE_PRICE) return rejected(state, 'insufficient_funds');

  const rng = createRng(state.rngState);
  const prize = rollPrize(rng);
  const totalSpins = state.roulette.totalSpins + 1;
  const paid: GameState = {
    ...state,
    money: state.money - ROULETTE_PRICE,
    rngState: rng.state(),
    roulette: {
      date: today,
      spinsToday: state.roulette.date === today ? state.roulette.spinsToday + 1 : 1,
      lastPrizeId: prize.id,
      totalSpins,
    },
  };

  const given = giveRewards(paid, prize, `R${totalSpins}`);
  const toMail = given.events.length > 0;
  const next = toMail ? sendMail(paid, prize.id).state : given.state;
  return { state: next, events: [{ type: 'rouletteWon', prizeId: prize.id, toMail }] };
}
