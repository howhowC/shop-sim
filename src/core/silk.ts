// 養蠶小遊戲：買卵、餵食、摸摸、依現實日期成長、放飛。出售在 income/silk.ts。
// 日期都是當地日期字串 'YYYY-MM-DD'，由 UI 傳入；同格式的字串可以直接用 < > 比較先後。

import {
  SILK_CAPACITY,
  SILK_EGG_WEIGHTS,
  SILK_EXPANSION_SLOTS,
  SILK_MAX_EXPANSIONS,
  SILK_FEED_AFFECTION,
  SILK_MAX_AFFECTION,
  SILK_NAME_MAX_LENGTH,
  SILK_PET_AFFECTION,
  SILK_PRICES,
  SILK_STAGE_COCOON,
  SILK_STAGE_EGG,
  SILK_STAGE_LAST_LARVA,
  SILK_STAGE_MOTH,
} from './config';
import { SILK_BREEDS } from '../data/silkBreeds';
import { couponDiscount, findUsableCoupon } from './market';
import { createRng, type Rng } from './rng';
import type {
  Coupon,
  GameEvent,
  Money,
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
  return { worms: [], leaves: 0, speedups: 0, expansions: 0, eggStock: { egg: 0, premiumEgg: 0 }, dex: {} };
}

/** 飼養盒目前的容量（基本容量＋擴充） */
export function silkCapacity(state: GameState): number {
  return SILK_CAPACITY + state.silk.expansions * SILK_EXPANSION_SLOTS;
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

type GrowthKind = 'hatched' | 'grew' | 'cocooned' | 'emerged';

/** 讓一隻蠶升一階並更新圖鑑（自然成長和加速券共用）；回傳新的蠶、圖鑑和這次是哪一種成長 */
function advanceWorm(
  w: Silkworm,
  dex: SilkState['dex'],
  today: string,
): { worm: Silkworm; dex: SilkState['dex']; kind: GrowthKind } {
  const stage = w.stage + 1;
  const entry = dex[w.breed] ?? { hatched: false, moth: false };
  const worm = { ...w, stage, stageSince: today };
  if (stage === 1) return { worm, dex: { ...dex, [w.breed]: { ...entry, hatched: true } }, kind: 'hatched' };
  if (stage === SILK_STAGE_COCOON) return { worm, dex, kind: 'cocooned' };
  if (stage === SILK_STAGE_MOTH) return { worm, dex: { ...dex, [w.breed]: { ...entry, moth: true } }, kind: 'emerged' };
  return { worm, dex, kind: 'grew' };
}

/** 事件裡用的名字：沒取名是 null */
export const nameOf = (w: Silkworm): string | null => w.name ?? null;

/** 把一批成長結果轉成事件；孵化每隻各一則（要顯示品種），其他同類合併成一則 */
function growthEvents(grown: readonly { worm: Silkworm; kind: GrowthKind }[]): GameEvent[] {
  const events: GameEvent[] = [];
  const pick = (kind: GrowthKind) => {
    const ws = grown.filter((g) => g.kind === kind).map((g) => g.worm);
    return { uids: ws.map((w) => w.uid), names: ws.map(nameOf) };
  };
  for (const g of grown) {
    if (g.kind === 'hatched') events.push({ type: 'silkHatched', uid: g.worm.uid, breed: g.worm.breed, name: nameOf(g.worm) });
  }
  const grew = pick('grew');
  const cocooned = pick('cocooned');
  const emerged = pick('emerged');
  if (grew.uids.length > 0) events.push({ type: 'silkGrew', ...grew });
  if (cocooned.uids.length > 0) events.push({ type: 'silkCocooned', ...cocooned });
  if (emerged.uids.length > 0) events.push({ type: 'silkEmerged', ...emerged });
  return events;
}

/** 依今天的日期讓所有符合條件的蠶升一階，並更新圖鑑 */
export function syncSilk(state: GameState, today: string): SilkResult {
  let dex = state.silk.dex;
  const grown: { worm: Silkworm; kind: GrowthKind }[] = [];
  const worms = state.silk.worms.map((w) => {
    if (!readyToGrow(w, today)) return w;
    const r = advanceWorm(w, dex, today);
    dex = r.dex;
    grown.push(r);
    return r.worm;
  });
  if (grown.length === 0) return { state, events: [] };
  return { state: { ...state, silk: { ...state.silk, worms, dex } }, events: growthEvents(grown) };
}

/** 用一張加速券讓一隻蠶立刻升一階（不用餵食、不限次數；蛾不能再長） */
export function speedupSilkworm(state: GameState, uid: number, today: string): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  if (w.stage >= SILK_STAGE_MOTH) return rejected(state, 'silk_cannot_speedup');
  if (state.silk.speedups <= 0) return rejected(state, 'silk_no_speedups');
  const r = advanceWorm(w, state.silk.dex, today);
  const next = updateWorm(state, r.worm);
  return {
    state: { ...next, silk: { ...next.silk, dex: r.dex, speedups: next.silk.speedups - 1 } },
    events: growthEvents([r]),
  };
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

/**
 * 從蠶卵庫存拿 n 顆放進飼養盒，開始孵化（隔天孵出來）。品種在這時才抽。
 * 庫存不夠或飼養盒放不下就整批拒絕。
 */
export function placeEggs(state: GameState, kind: SilkEggKind, qty: number, today: string): SilkResult {
  const n = Math.floor(qty);
  if (!(n >= 1) || state.silk.eggStock[kind] < n) return rejected(state, 'silk_no_eggs');
  if (state.silk.worms.length + n > silkCapacity(state)) return rejected(state, 'silk_capacity_full');
  const rng = createRng(state.rngState);
  const eggs: Silkworm[] = Array.from({ length: n }, (_, i) => ({
    uid: state.nextUid + i,
    breed: rollBreed(kind, rng),
    stage: SILK_STAGE_EGG,
    stageSince: today,
    fedOn: null,
    pettedOn: null,
    affection: 0,
  }));
  return {
    state: {
      ...state,
      rngState: rng.state(),
      nextUid: state.nextUid + n,
      silk: {
        ...state.silk,
        worms: [...state.silk.worms, ...eggs],
        eggStock: { ...state.silk.eggStock, [kind]: state.silk.eggStock[kind] - n },
      },
    },
    events: [{ type: 'silkEggsPlaced', kind, qty: n }],
  };
}

/** 增加桑葉或加速券（買東西和郵件共用） */
export function addSupplies(state: GameState, item: 'leaf' | 'speedup', n: number): GameState {
  const field = item === 'leaf' ? 'leaves' : 'speedups';
  return { ...state, silk: { ...state.silk, [field]: state.silk[field] + n } };
}

/**
 * 發放養蠶用品（小店、主商城、郵件、輪盤共用）；發不出去（飼養盒擴充到上限）時回傳拒絕事件，state 不變。
 * 蠶卵先收進庫存，不佔飼養盒空位。不扣錢。
 */
export function grantSilkItem(state: GameState, item: SilkShopItem, qty: number): SilkResult {
  switch (item) {
    case 'leaf':
    case 'speedup':
      return { state: addSupplies(state, item, qty), events: [] };
    case 'egg':
    case 'premiumEgg':
      return { state: { ...state, silk: { ...state.silk, eggStock: { ...state.silk.eggStock, [item]: state.silk.eggStock[item] + qty } } }, events: [] };
    case 'habitat':
      if (state.silk.expansions + qty > SILK_MAX_EXPANSIONS) return rejected(state, 'silk_box_max');
      return { state: { ...state, silk: { ...state.silk, expansions: state.silk.expansions + qty } }, events: [] };
  }
}

/** 依序發放多項養蠶用品；任何一項失敗就全部不發 */
export function grantSilkItems(state: GameState, items: readonly { item: SilkShopItem; qty: number }[]): SilkResult {
  let s = state;
  for (const { item, qty } of items) {
    const r = grantSilkItem(s, item, qty);
    if (r.events.length > 0) return { state, events: r.events };
    s = r.state;
  }
  return { state: s, events: [] };
}

/** 直接買（不經過購物車）；測試和內部用，UI 用購物車 */
export function buySilk(state: GameState, item: SilkShopItem, qty: number): SilkResult {
  if (!(item in SILK_PRICES)) return rejected(state, 'silk_unknown_item');
  const n = Math.floor(qty);
  if (!(n >= 1)) return rejected(state, 'silk_unknown_item');
  const total = SILK_PRICES[item] * n;
  if (total > state.money) return rejected(state, 'insufficient_funds');
  const r = grantSilkItem({ ...state, money: state.money - total }, item, n);
  if (r.events.length > 0) return { state, events: r.events };
  return { state: r.state, events: [{ type: 'silkBought', item, qty: n, total }] };
}

// ── 養蠶小店購物車（優惠券和主商城共用）──

export interface SilkCartLine {
  item: SilkShopItem;
  unitPrice: Money;
  qty: number;
}

export interface SilkCartSummary {
  lines: SilkCartLine[];
  subtotal: Money;
  discount: Money;
  total: Money;
}

const SHOP_ORDER: readonly SilkShopItem[] = ['egg', 'premiumEgg', 'leaf', 'speedup', 'habitat'];

/** 計算養蠶購物車金額；UI 顯示和結帳都用這個 */
export function summarizeSilkCart(state: GameState, coupon?: Coupon): SilkCartSummary {
  const lines = SHOP_ORDER.filter((item) => (state.silkCart[item] ?? 0) > 0).map((item) => ({
    item,
    unitPrice: SILK_PRICES[item],
    qty: state.silkCart[item]!,
  }));
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const discount = couponDiscount(subtotal, coupon);
  return { lines, subtotal, discount, total: subtotal - discount };
}

/** 設定養蠶購物車某一項的數量；0 以下代表移除 */
export function setSilkCartQty(state: GameState, item: SilkShopItem, qty: number): SilkResult {
  if (!(item in SILK_PRICES)) return rejected(state, 'silk_unknown_item');
  const silkCart = { ...state.silkCart };
  if (qty <= 0) delete silkCart[item];
  else silkCart[item] = Math.floor(qty);
  return { state: { ...state, silkCart }, events: [] };
}

/** 養蠶小店結帳：可用優惠券，付款後立即到貨（蠶卵進庫存）；飼養盒擴充超過上限就整筆拒絕 */
export function silkCheckout(state: GameState, couponId: string | undefined): SilkResult {
  let coupon: Coupon | undefined;
  if (couponId !== undefined) {
    coupon = findUsableCoupon(state, couponId);
    if (!coupon) return rejected(state, 'invalid_coupon');
  }
  const sum = summarizeSilkCart(state, coupon);
  if (sum.lines.length === 0) return rejected(state, 'empty_cart');
  if (coupon && sum.discount === 0) return rejected(state, 'coupon_threshold_not_met');
  if (sum.total > state.money) return rejected(state, 'insufficient_funds');

  const paid: GameState = {
    ...state,
    money: state.money - sum.total,
    silkCart: {},
    coupons: coupon ? state.coupons.filter((c) => c.id !== coupon.id) : state.coupons,
  };
  const r = grantSilkItems(paid, sum.lines);
  if (r.events.length > 0) return { state, events: r.events };
  return { state: r.state, events: [{ type: 'silkOrderPaid', total: sum.total, discount: sum.discount }] };
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
  return { state: { ...next, silk: { ...next.silk, leaves: next.silk.leaves - 1 } }, events: [{ type: 'silkFed', uid, name: nameOf(w) }] };
}

export function petSilkworm(state: GameState, uid: number, today: string): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  if (!isLarva(w)) return rejected(state, 'silk_cannot_pet');
  if (w.pettedOn === today) return rejected(state, 'silk_already_petted');
  return {
    state: updateWorm(state, { ...w, pettedOn: today, affection: addAffection(w, SILK_PET_AFFECTION) }),
    events: [{ type: 'silkPetted', uid, name: nameOf(w) }],
  };
}

export const removeWorm = (state: GameState, uid: number): GameState => ({
  ...state,
  silk: { ...state.silk, worms: state.silk.worms.filter((w) => w.uid !== uid) },
});

/** 取名或改名；前後空白會去掉，空字串代表清除名字（改回顯示品種名稱）。任何階段都可以取名。 */
export function renameSilkworm(state: GameState, uid: number, rawName: string): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  const name = rawName.trim();
  // 用展開運算子數字數，emoji 才會算一個字
  if ([...name].length > SILK_NAME_MAX_LENGTH) return rejected(state, 'silk_name_too_long');
  const { name: _old, ...rest } = w;
  return {
    state: updateWorm(state, name === '' ? rest : { ...rest, name }),
    events: [{ type: 'silkRenamed', uid, name: name === '' ? null : name }],
  };
}

/** 蛾只能放飛（圖鑑在羽化時就登記了） */
export function releaseMoth(state: GameState, uid: number): SilkResult {
  const w = findSilkworm(state, uid);
  if (!w) return rejected(state, 'silk_unknown');
  if (w.stage !== SILK_STAGE_MOTH) return rejected(state, 'silk_cannot_release');
  return { state: removeWorm(state, uid), events: [{ type: 'silkReleased', uid, name: nameOf(w) }] };
}
