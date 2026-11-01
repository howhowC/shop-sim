// 養蠶小遊戲：買卵、餵食、摸摸、依現實日期成長、放飛。出售在 income/silk.ts。
// 日期都是當地日期字串 'YYYY-MM-DD'，由 UI 傳入；同格式的字串可以直接用 < > 比較先後。

import {
  SILK_CAPACITY,
  SILK_EGG_WEIGHTS,
  SILK_FEED_AFFECTION,
  SILK_MAX_AFFECTION,
  SILK_PET_AFFECTION,
  SILK_PRICES,
  SILK_STAGE_COCOON,
  SILK_STAGE_EGG,
  SILK_STAGE_LAST_LARVA,
  SILK_STAGE_MOTH,
} from './config';
import { SILK_BREEDS } from '../data/silkBreeds';
import { createRng, type Rng } from './rng';
import type {
  GameEvent,
  GameState,
  RejectReason,
  SilkBreed,
  SilkBreedId,
  SilkEggKind,
  SilkRarity,
  SilkShopItem,
  SilkState,
  Silkworm,
} from './types';

export type SilkResult = { state: GameState; events: GameEvent[] };

const byId = new Map(SILK_BREEDS.map((b) => [b.id, b]));

export function getSilkBreed(id: SilkBreedId): SilkBreed | undefined {
  return byId.get(id);
}

export function allSilkBreeds(): readonly SilkBreed[] {
  return SILK_BREEDS;
}

export function createSilkState(): SilkState {
  return { worms: [], leaves: 0, dex: {} };
}

export const isLarva = (w: Silkworm): boolean => w.stage >= 1 && w.stage <= SILK_STAGE_LAST_LARVA;

/**
 * 今天能不能升一階：
 * - 已經過了一天（today > stageSince）
 * - 卵和繭不需要照顧；幼蟲要在「進入這個階段之後、今天之前」餵過
 *   （今天餵的要明天才算，這樣一天最多升一階，同一次餵食也不會被算兩次）
 * 沒照顧只會停在原階段，不會死掉。
 */
export function readyToGrow(w: Silkworm, today: string): boolean {
  if (w.stage >= SILK_STAGE_MOTH || !(today > w.stageSince)) return false;
  if (!isLarva(w)) return true;
  return w.fedOn !== null && w.fedOn >= w.stageSince && w.fedOn < today;
}

/** 依今天的日期讓所有符合條件的蠶升一階，並更新圖鑑 */
export function syncSilk(state: GameState, today: string): SilkResult {
  const events: GameEvent[] = [];
  const grew: number[] = [];
  const cocooned: number[] = [];
  const emerged: number[] = [];
  const dex = { ...state.silk.dex };
  let changed = false;

  const worms = state.silk.worms.map((w) => {
    if (!readyToGrow(w, today)) return w;
    changed = true;
    const stage = w.stage + 1;
    const entry = dex[w.breed] ?? { hatched: false, moth: false };
    if (stage === 1) {
      dex[w.breed] = { ...entry, hatched: true };
      events.push({ type: 'silkHatched', uid: w.uid, breed: w.breed });
    } else if (stage === SILK_STAGE_COCOON) {
      cocooned.push(w.uid);
    } else if (stage === SILK_STAGE_MOTH) {
      dex[w.breed] = { ...entry, moth: true };
      emerged.push(w.uid);
    } else {
      grew.push(w.uid);
    }
    return { ...w, stage, stageSince: today };
  });

  if (!changed) return { state, events: [] };
  if (grew.length > 0) events.push({ type: 'silkGrew', uids: grew });
  if (cocooned.length > 0) events.push({ type: 'silkCocooned', uids: cocooned });
  if (emerged.length > 0) events.push({ type: 'silkEmerged', uids: emerged });
  return { state: { ...state, silk: { ...state.silk, worms, dex } }, events };
}

const RARITIES: readonly SilkRarity[] = ['common', 'uncommon', 'rare', 'legendary'];

/** 兩階段抽：先依權重抽稀有度，再從該稀有度的品種平均抽一個（沒有品種的稀有度不會被抽到） */
export function rollBreed(kind: SilkEggKind, rng: Rng): SilkBreedId {
  const weights = SILK_EGG_WEIGHTS[kind];
  const pools = RARITIES.map((rarity) => ({ weight: weights[rarity], breeds: SILK_BREEDS.filter((b) => b.rarity === rarity) })).filter(
    (p) => p.breeds.length > 0 && p.weight > 0,
  );
  const total = pools.reduce((sum, p) => sum + p.weight, 0);
  let r = rng.next() * total;
  const pool = pools.find((p) => (r -= p.weight) < 0) ?? pools[pools.length - 1];
  return rng.pick(pool.breeds).id;
}

export const rejected = (state: GameState, reason: RejectReason): SilkResult => ({
  state,
  events: [{ type: 'rejected', reason }],
});

export function buySilk(state: GameState, item: SilkShopItem, qty: number, today: string): SilkResult {
  if (!(item in SILK_PRICES)) return rejected(state, 'silk_unknown_item');
  const n = Math.floor(qty);
  if (!(n >= 1)) return rejected(state, 'silk_unknown_item');
  const total = SILK_PRICES[item] * n;
  if (total > state.money) return rejected(state, 'insufficient_funds');

  const bought = { type: 'silkBought', item, qty: n, total } as const;
  if (item === 'leaf') {
    return {
      state: { ...state, money: state.money - total, silk: { ...state.silk, leaves: state.silk.leaves + n } },
      events: [bought],
    };
  }

  if (state.silk.worms.length + n > SILK_CAPACITY) return rejected(state, 'silk_capacity_full');
  const rng = createRng(state.rngState);
  const eggs: Silkworm[] = Array.from({ length: n }, (_, i) => ({
    uid: state.nextUid + i,
    breed: rollBreed(item, rng),
    stage: SILK_STAGE_EGG,
    stageSince: today,
    fedOn: null,
    pettedOn: null,
    affection: 0,
  }));
  return {
    state: {
      ...state,
      money: state.money - total,
      rngState: rng.state(),
      nextUid: state.nextUid + n,
      silk: { ...state.silk, worms: [...state.silk.worms, ...eggs] },
    },
    events: [bought],
  };
}

function updateWorm(state: GameState, w: Silkworm): GameState {
  return { ...state, silk: { ...state.silk, worms: state.silk.worms.map((x) => (x.uid === w.uid ? w : x)) } };
}

const addAffection = (w: Silkworm, n: number) => Math.min(SILK_MAX_AFFECTION, w.affection + n);

export function findSilkworm(state: GameState, uid: number): Silkworm | undefined {
  return state.silk.worms.find((w) => w.uid === uid);
}

export function feedSilkworm(state: GameState, uid: number, today: string): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  if (!isLarva(w)) return rejected(state, 'silk_cannot_feed');
  if (w.fedOn === today) return rejected(state, 'silk_already_fed');
  if (state.silk.leaves <= 0) return rejected(state, 'silk_no_leaves');
  const next = updateWorm(state, { ...w, fedOn: today, affection: addAffection(w, SILK_FEED_AFFECTION) });
  return { state: { ...next, silk: { ...next.silk, leaves: next.silk.leaves - 1 } }, events: [{ type: 'silkFed', uid }] };
}

export function petSilkworm(state: GameState, uid: number, today: string): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  if (!isLarva(w)) return rejected(state, 'silk_cannot_pet');
  if (w.pettedOn === today) return rejected(state, 'silk_already_petted');
  return {
    state: updateWorm(state, { ...w, pettedOn: today, affection: addAffection(w, SILK_PET_AFFECTION) }),
    events: [{ type: 'silkPetted', uid }],
  };
}

export const removeWorm = (state: GameState, uid: number): GameState => ({
  ...state,
  silk: { ...state.silk, worms: state.silk.worms.filter((w) => w.uid !== uid) },
});

/** 蛾只能放飛（圖鑑在羽化時就登記了） */
export function releaseMoth(state: GameState, uid: number): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  if (w.stage !== SILK_STAGE_MOTH) return rejected(state, 'silk_cannot_release');
  return { state: removeWorm(state, uid), events: [{ type: 'silkReleased', uid }] };
}
