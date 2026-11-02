import { describe, expect, it } from 'vitest';
import {
  SILK_CAPACITY,
  SILK_COCOON_QUALITY,
  SILK_EGG_WEIGHTS,
  SILK_FEED_AFFECTION,
  SILK_MAX_AFFECTION,
  SILK_PET_AFFECTION,
  SILK_PRICES,
  SILK_STAGE_COCOON,
  SILK_STAGE_MOTH,
} from '../config';
import { cocoonQuality, silkSellPrice } from '../income/silk';
import { createInitialState } from '../reducer';
import { createRng } from '../rng';
import { allSilkBreeds, getSilkBreed, rollBreed } from '../silk';
import type { GameState, Silkworm } from '../types';
import { run } from './helpers';

const D1 = '2026-11-01';
const D2 = '2026-11-02';
const D3 = '2026-11-03';

/** 回傳第 n 天的日期字串（n 從 1 開始，11 月內） */
const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;

/** 直接放一隻指定狀態的蠶進飼養盒，測試用 */
function withWorm(s: GameState, w: Partial<Silkworm>, leaves = 10): GameState {
  const worm: Silkworm = {
    uid: 999,
    breed: 'jade',
    stage: 1,
    stageSince: D1,
    fedOn: null,
    pettedOn: null,
    affection: 0,
    ...w,
  };
  return { ...s, silk: { ...s.silk, leaves, worms: [worm] } };
}

const worm = (s: GameState) => s.silk.worms[0];

describe('養蠶：品種資料', () => {
  it('每個稀有度都至少有一個品種，品種 id 不重複', () => {
    const breeds = allSilkBreeds();
    for (const rarity of Object.keys(SILK_EGG_WEIGHTS.egg)) expect(breeds.some((b) => b.rarity === rarity)).toBe(true);
    expect(new Set(breeds.map((b) => b.id)).size).toBe(breeds.length);
  });

  it('精選蠶卵抽到傳說品種的次數明顯比普通蠶卵多', () => {
    const countLegendary = (kind: 'egg' | 'premiumEgg') => {
      const rng = createRng(123);
      let n = 0;
      for (let i = 0; i < 2000; i++) if (getSilkBreed(rollBreed(kind, rng))?.rarity === 'legendary') n++;
      return n;
    };
    // 期望值：普通卵約 2%（40 次）、精選卵約 15%（300 次）
    expect(countLegendary('egg')).toBeLessThan(100);
    expect(countLegendary('premiumEgg')).toBeGreaterThan(200);
  });

  it('每個品種都抽得到', () => {
    const rng = createRng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) seen.add(rollBreed('premiumEgg', rng));
    expect(seen.size).toBe(allSilkBreeds().length);
  });
});

describe('養蠶：小店', () => {
  it('買卵扣錢、放進飼養盒、品種已抽好', () => {
    const s0 = createInitialState(1);
    const s = run(s0, { type: 'silkBuy', item: 'egg', qty: 2, today: D1 });
    expect(s.money).toBe(s0.money - SILK_PRICES.egg * 2);
    expect(s.silk.worms).toHaveLength(2);
    expect(s.silk.worms.every((w) => w.stage === 0 && w.stageSince === D1)).toBe(true);
    expect(s.silk.worms.every((w) => getSilkBreed(w.breed) !== undefined)).toBe(true);
    expect(s.nextUid).toBe(s0.nextUid + 2);
  });

  it('同一個 seed 抽到相同品種', () => {
    const a = run(createInitialState(5), { type: 'silkBuy', item: 'premiumEgg', qty: 3, today: D1 });
    const b = run(createInitialState(5), { type: 'silkBuy', item: 'premiumEgg', qty: 3, today: D1 });
    expect(a.silk.worms.map((w) => w.breed)).toEqual(b.silk.worms.map((w) => w.breed));
  });

  it('超過飼養盒容量會被拒絕，狀態不變', () => {
    const s0 = run(createInitialState(1), { type: 'silkBuy', item: 'egg', qty: SILK_CAPACITY, today: D1 });
    const s = run(s0, { type: 'silkBuy', item: 'egg', today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_capacity_full' }]);
    expect({ ...s, events: [] }).toEqual({ ...s0, events: [] });
  });

  it('錢不夠不能買，狀態不變', () => {
    const s0 = { ...createInitialState(1), money: SILK_PRICES.leaf - 1 };
    const s = run(s0, { type: 'silkBuy', item: 'leaf', today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'insufficient_funds' }]);
    expect(s.money).toBe(s0.money);
    expect(s.silk.leaves).toBe(0);
  });

  it('買桑葉增加份數', () => {
    const s = run(createInitialState(1), { type: 'silkBuy', item: 'leaf', qty: 5, today: D1 });
    expect(s.silk.leaves).toBe(5);
  });
});

describe('養蠶：成長', () => {
  it('同一天不會孵化，隔天孵化並登記圖鑑', () => {
    let s = run(createInitialState(1), { type: 'silkBuy', item: 'egg', today: D1 });
    s = run(s, { type: 'silkSync', today: D1 });
    expect(worm(s).stage).toBe(0);
    s = run(s, { type: 'silkSync', today: D2 });
    expect(worm(s).stage).toBe(1);
    expect(worm(s).stageSince).toBe(D2);
    expect(s.silk.dex[worm(s).breed]).toEqual({ hatched: true, moth: false });
    expect(s.events).toContainEqual({ type: 'silkHatched', uid: worm(s).uid, breed: worm(s).breed });
  });

  it('幼蟲沒餵，隔天不會長大（也不會死）', () => {
    const s = run(withWorm(createInitialState(1), {}), { type: 'silkSync', today: D3 });
    expect(worm(s).stage).toBe(1);
  });

  it('今天餵食，明天才長大一齡', () => {
    let s = run(withWorm(createInitialState(1), {}), { type: 'silkFeed', uid: 999, today: D1 });
    s = run(s, { type: 'silkSync', today: D1 });
    expect(worm(s).stage).toBe(1);
    s = run(s, { type: 'silkSync', today: D2 });
    expect(worm(s).stage).toBe(2);
    expect(s.events).toContainEqual({ type: 'silkGrew', uids: [999] });
  });

  it('隔了很多天才回來，一次也只長一齡', () => {
    let s = run(withWorm(createInitialState(1), {}), { type: 'silkFeed', uid: 999, today: D1 });
    s = run(s, { type: 'silkSync', today: day(9) });
    expect(worm(s).stage).toBe(2);
    s = run(s, { type: 'silkSync', today: day(10) });
    expect(worm(s).stage).toBe(2);
  });

  it('同一次餵食不會被算兩次', () => {
    // 第 2 天進入新階段後，第 1 天的餵食不算數
    let s = run(withWorm(createInitialState(1), {}), { type: 'silkFeed', uid: 999, today: D1 });
    s = run(s, { type: 'silkSync', today: D2 }, { type: 'silkSync', today: D3 });
    expect(worm(s).stage).toBe(2);
  });

  it('從卵到蛾：每天餵食，第 8 天羽化並登記圖鑑', () => {
    let s = run(createInitialState(1), { type: 'silkBuy', item: 'leaf', qty: 10, today: day(1) });
    s = run(s, { type: 'silkBuy', item: 'egg', today: day(1) });
    const uid = worm(s).uid;
    for (let d = 2; d <= 8; d++) {
      s = run(s, { type: 'silkSync', today: day(d) });
      if (worm(s).stage >= 1 && worm(s).stage <= 5) s = run(s, { type: 'silkFeed', uid, today: day(d) });
    }
    expect(worm(s).stage).toBe(SILK_STAGE_MOTH);
    expect(s.silk.dex[worm(s).breed]).toEqual({ hatched: true, moth: true });
    expect(s.silk.leaves).toBe(5);
  });
});

describe('養蠶：加速券', () => {
  it('可以在小店買加速券', () => {
    const s0 = createInitialState(1);
    const s = run(s0, { type: 'silkBuy', item: 'speedup', qty: 2, today: D1 });
    expect(s.silk.speedups).toBe(2);
    expect(s.money).toBe(s0.money - SILK_PRICES.speedup * 2);
  });

  it('卵用加速券立刻孵化並登記圖鑑', () => {
    let s = run(createInitialState(1), { type: 'silkBuy', item: 'speedup', today: D1 }, { type: 'silkBuy', item: 'egg', today: D1 });
    s = run(s, { type: 'silkSpeedup', uid: worm(s).uid, today: D1 });
    expect(worm(s).stage).toBe(1);
    expect(s.silk.dex[worm(s).breed]?.hatched).toBe(true);
    expect(s.silk.speedups).toBe(0);
    expect(s.events).toContainEqual({ type: 'silkHatched', uid: worm(s).uid, breed: worm(s).breed });
  });

  it('不用餵食、同一天可以連續使用，一路用到羽化', () => {
    let s = withWorm(createInitialState(1), { stage: 1 });
    s = { ...s, silk: { ...s.silk, speedups: 10 } };
    s = run(s, ...Array.from({ length: SILK_STAGE_MOTH - 1 }, () => ({ type: 'silkSpeedup', uid: 999, today: D1 }) as const));
    expect(worm(s).stage).toBe(SILK_STAGE_MOTH);
    expect(s.silk.dex.jade).toEqual({ hatched: false, moth: true });
    expect(s.silk.speedups).toBe(10 - (SILK_STAGE_MOTH - 1));
  });

  it('蛾不能加速；沒有加速券會被拒絕', () => {
    let s = withWorm(createInitialState(1), { stage: SILK_STAGE_MOTH });
    s = run({ ...s, silk: { ...s.silk, speedups: 1 } }, { type: 'silkSpeedup', uid: 999, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_cannot_speedup' }]);
    s = run(withWorm(createInitialState(1), {}), { type: 'silkSpeedup', uid: 999, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_no_speedups' }]);
  });
});

describe('養蠶：照顧', () => {
  it('幼蟲期每天餵食又摸摸，結出極品繭', () => {
    let s = run(createInitialState(1), { type: 'silkBuy', item: 'leaf', qty: 10, today: day(1) });
    s = run(s, { type: 'silkBuy', item: 'egg', today: day(1) });
    const uid = worm(s).uid;
    for (let d = 2; worm(s).stage < SILK_STAGE_COCOON; d++) {
      s = run(s, { type: 'silkSync', today: day(d) });
      if (worm(s).stage < SILK_STAGE_COCOON) {
        s = run(s, { type: 'silkFeed', uid, today: day(d) }, { type: 'silkPet', uid, today: day(d) });
      }
    }
    expect(cocoonQuality(worm(s).affection).quality).toBe('great');
  });

  it('同一天重複餵食會被拒絕', () => {
    const s = run(withWorm(createInitialState(1), {}), { type: 'silkFeed', uid: 999, today: D1 }, { type: 'silkFeed', uid: 999, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_already_fed' }]);
    expect(s.silk.leaves).toBe(9);
  });

  it('沒有桑葉不能餵食', () => {
    const s = run(withWorm(createInitialState(1), {}, 0), { type: 'silkFeed', uid: 999, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_no_leaves' }]);
  });

  it('卵和繭不能餵食', () => {
    for (const stage of [0, SILK_STAGE_COCOON]) {
      const s = run(withWorm(createInitialState(1), { stage }), { type: 'silkFeed', uid: 999, today: D1 });
      expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_cannot_feed' }]);
    }
  });

  it('餵食和摸摸增加親密度，有上限', () => {
    let s = run(withWorm(createInitialState(1), {}), { type: 'silkFeed', uid: 999, today: D1 }, { type: 'silkPet', uid: 999, today: D1 });
    expect(worm(s).affection).toBe(SILK_FEED_AFFECTION + SILK_PET_AFFECTION);
    s = run(withWorm(createInitialState(1), { affection: SILK_MAX_AFFECTION - 1 }), { type: 'silkPet', uid: 999, today: D1 });
    expect(worm(s).affection).toBe(SILK_MAX_AFFECTION);
  });

  it('同一天重複摸摸會被拒絕', () => {
    const s = run(withWorm(createInitialState(1), {}), { type: 'silkPet', uid: 999, today: D1 }, { type: 'silkPet', uid: 999, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_already_petted' }]);
  });
});

describe('養蠶：出售與放飛', () => {
  it('賣繭的金額依親密度品質，透過 income 事件入帳', () => {
    const best = SILK_COCOON_QUALITY[0];
    const s0 = withWorm(createInitialState(1), { stage: SILK_STAGE_COCOON, affection: best.minAffection });
    const price = Math.round((getSilkBreed('jade')!.cocoonPrice * best.rate) / 10) * 10;
    const s = run(s0, { type: 'silkSell', uid: 999, today: D1 });
    expect(s.money).toBe(s0.money + price);
    expect(s.events).toEqual([{ type: 'income', source: 'silk', amount: price }]);
    expect(s.silk.worms).toHaveLength(0);
  });

  it('高親密度的繭比低親密度的值錢', () => {
    const low = silkSellPrice({ ...worm(withWorm(createInitialState(1), {})), stage: SILK_STAGE_COCOON, affection: 0 })!;
    const high = silkSellPrice({ ...worm(withWorm(createInitialState(1), {})), stage: SILK_STAGE_COCOON, affection: 100 })!;
    expect(high).toBeGreaterThan(low);
  });

  it('卵和蛾不能賣', () => {
    for (const stage of [0, SILK_STAGE_MOTH]) {
      const s = run(withWorm(createInitialState(1), { stage }), { type: 'silkSell', uid: 999, today: D1 });
      expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_cannot_sell' }]);
      expect(s.silk.worms).toHaveLength(1);
    }
  });

  it('蛾可以放飛，其他階段不行', () => {
    let s = run(withWorm(createInitialState(1), { stage: SILK_STAGE_MOTH }), { type: 'silkRelease', uid: 999, today: D1 });
    expect(s.silk.worms).toHaveLength(0);
    s = run(withWorm(createInitialState(1), { stage: 3 }), { type: 'silkRelease', uid: 999, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_cannot_release' }]);
  });

  it('找不到的蠶會被拒絕', () => {
    const s = run(createInitialState(1), { type: 'silkSell', uid: 123, today: D1 });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'silk_unknown' }]);
  });
});
