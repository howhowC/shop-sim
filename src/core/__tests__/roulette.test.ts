import { describe, expect, it } from 'vitest';
import { ROULETTE_PRIZES } from '../../data/roulette';
import { ROULETTE_DAILY_SPINS, ROULETTE_PRICE, SILK_CAPACITY } from '../config';
import { createInitialState } from '../reducer';
import { prizeValue, spinsLeft } from '../roulette';
import type { GameState } from '../types';
import { run, times } from './helpers';

const D1 = '2026-11-02';
const D2 = '2026-11-03';
const spin = (today = D1) => ({ type: 'spinRoulette', today }) as const;

/** 找一個第一次抽就會抽中指定獎品的 seed，測試特定獎品用 */
function seedFor(prizeId: string): number {
  for (let seed = 1; seed < 10000; seed++) {
    if (run(createInitialState(seed), spin()).roulette.lastPrizeId === prizeId) return seed;
  }
  throw new Error(`no seed hits ${prizeId}`);
}

describe('幸運輪盤：獎品資料', () => {
  it('每個獎品的價值都不低於抽一次的價格', () => {
    for (const p of ROULETTE_PRIZES) expect(prizeValue(p), p.id).toBeGreaterThanOrEqual(ROULETTE_PRICE);
  });

  it('獎品 id 不重複，權重都是正數', () => {
    expect(new Set(ROULETTE_PRIZES.map((p) => p.id)).size).toBe(ROULETTE_PRIZES.length);
    expect(ROULETTE_PRIZES.every((p) => p.weight > 0)).toBe(true);
  });
});

describe('幸運輪盤：抽獎', () => {
  it('抽一次扣錢、記錄次數和抽中的獎品', () => {
    const s0 = createInitialState(1);
    const s = run(s0, spin());
    expect(s.roulette).toMatchObject({ date: D1, spinsToday: 1, totalSpins: 1 });
    expect(ROULETTE_PRIZES.map((p) => p.id)).toContain(s.roulette.lastPrizeId);
    expect(s.events).toEqual([{ type: 'rouletteWon', prizeId: s.roulette.lastPrizeId, toMail: false }]);
    expect(spinsLeft(s, D1)).toBe(ROULETTE_DAILY_SPINS - 1);
  });

  it('每天最多抽 3 次，隔天重新計算', () => {
    const s0 = run(createInitialState(1), ...times(ROULETTE_DAILY_SPINS, spin()));
    const s = run(s0, spin());
    expect(s.events).toEqual([{ type: 'rejected', reason: 'roulette_no_spins_left' }]);
    expect(s.money).toBe(s0.money);
    expect(run(s0, spin(D2)).roulette).toMatchObject({ date: D2, spinsToday: 1 });
  });

  it('錢不夠不能抽，狀態不變', () => {
    const s0: GameState = { ...createInitialState(1), money: ROULETTE_PRICE - 1 };
    const s = run(s0, spin());
    expect(s.events).toEqual([{ type: 'rejected', reason: 'insufficient_funds' }]);
    expect(s.roulette.totalSpins).toBe(0);
  });

  it('同一個 seed 抽到的獎品相同', () => {
    const prizes = (seed: number) => {
      const s = createInitialState(seed);
      return Array.from({ length: 3 }, (_, i) => run(s, ...times(i + 1, spin())).roulette.lastPrizeId);
    };
    expect(prizes(42)).toEqual(prizes(42));
  });

  it('抽中現金直接入帳', () => {
    const s0 = createInitialState(seedFor('roulette-cash'));
    const s = run(s0, spin());
    expect(s.money).toBe(s0.money - ROULETTE_PRICE + 150);
  });

  it('飼養盒滿了抽到蠶卵，獎品改寄到信箱', () => {
    const seed = seedFor('roulette-eggs');
    const full = run(createInitialState(seed), { type: 'silkBuy', item: 'egg', qty: SILK_CAPACITY, today: D1 });
    // 買卵會用掉亂數，所以重新把 rngState 設回初始值，確保抽到蠶卵
    const s0: GameState = { ...full, rngState: createInitialState(seed).rngState };
    const s = run(s0, spin());
    expect(s.events[0]).toEqual({ type: 'rouletteWon', prizeId: 'roulette-eggs', toMail: true });
    expect(s.silk.worms).toHaveLength(SILK_CAPACITY);
    expect(s.mail.inbox.at(-1)).toMatchObject({ templateId: 'roulette-eggs', claimed: false });
  });
});
