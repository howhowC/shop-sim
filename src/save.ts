// 存檔與讀檔。整個專案只有這個檔案可以碰 localStorage。
//
// ── 修改 GameState 結構時（新增、刪除、改名欄位）──
// 1. 把 SAVE_VERSION 加 1
// 2. 在 MIGRATIONS 加一個函式，把「舊版本的 state」轉成「新版本的 state」
//    例如 SAVE_VERSION 從 1 改成 2，就加上 1: (old) => ({ ...old, newField: 預設值 })
// 3. 如果新欄位是必要的，更新 looksLikeGameState() 的檢查
// 4. 在 src/__tests__/save.test.ts 加一個舊版存檔能成功轉換的測試
// 沒有對應轉換函式的舊存檔會被丟棄，玩家會開新遊戲。

import { fillMissingPrices } from './core';
import type { GameState } from './core';

export const SAVE_KEY = 'shop-sim:save';
export const SAVE_VERSION = 7;

interface SaveFile {
  version: number;
  savedAt: number;
  state: unknown;
}

type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** 把存檔裡所有出現商品 id 的地方換成新 id（購物車、價格、限時特價、訂單、房間物品） */
function renameProductIds(old: Record<string, unknown>, renames: Record<string, string>): Record<string, unknown> {
  const id = (x: unknown) => (typeof x === 'string' && x in renames ? renames[x] : x);
  const keys = (r: unknown) => (isRecord(r) ? Object.fromEntries(Object.entries(r).map(([k, v]) => [id(k), v])) : r);
  const withId = (x: unknown) => (isRecord(x) ? { ...x, productId: id(x.productId) } : x);
  const list = (a: unknown, f: (x: unknown) => unknown) => (Array.isArray(a) ? a.map(f) : a);
  return {
    ...old,
    cart: keys(old.cart),
    prices: keys(old.prices),
    prevPrices: keys(old.prevPrices),
    flashSale: withId(old.flashSale),
    inventory: list(old.inventory, withId),
    orders: list(old.orders, (o) => (isRecord(o) ? { ...o, lines: list(o.lines, withId) } : o)),
  };
}

/** key 是「舊版本號」，函式把它轉成「舊版本號 + 1」的格式 */
const MIGRATIONS: Record<number, Migration> = {
  // v2：「上班」改成依現實日期的「每日簽到」
  1: ({ job: _job, ...rest }) => ({ ...rest, checkIn: { lastDate: null, streak: 0 } }),
  // v3：商品 id 改名，讓 id 和商品名稱一致
  2: (old) => renameProductIds(old, { 'silkworm-box': 'silkworm', 'dwarf-hamster': 'golden-hamster' }),
  // v4：新增養蠶小遊戲
  3: (old) => ({ ...old, silk: { worms: [], leaves: 0, dex: {} } }),
  // v5：補差價改成虛擬商品，從房間移除已經開箱的補差價
  4: (old) => ({
    ...old,
    inventory: Array.isArray(old.inventory)
      ? old.inventory.filter((it) => !(isRecord(it) && it.productId === 'price-diff'))
      : old.inventory,
  }),
  // v6：新增郵件，養蠶加上加速券
  5: (old) => ({
    ...old,
    mail: { inbox: [], delivered: [], nextMailNo: 1 },
    silk: isRecord(old.silk) ? { ...old.silk, speedups: 0 } : old.silk,
  }),
  // v7：新增幸運輪盤
  6: (old) => ({ ...old, roulette: { date: null, spinsToday: 0, lastPrizeId: null, totalSpins: 0 } }),
};

// ── 純函式（不碰 localStorage，方便測試）──

export function serialize(state: GameState, now: number): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: now, state: { ...state, events: [] } };
  return JSON.stringify(file);
}

/** 解析存檔；格式不對、版本無法轉換時回傳 null */
export function deserialize(
  raw: string,
  migrations: Record<number, Migration> = MIGRATIONS,
  currentVersion: number = SAVE_VERSION,
): GameState | null {
  let file: SaveFile;
  try {
    file = JSON.parse(raw) as SaveFile;
  } catch {
    return null;
  }
  if (!isRecord(file) || typeof file.version !== 'number' || !isRecord(file.state)) return null;
  if (file.version > currentVersion) return null; // 比程式還新的存檔，無法判讀

  let state = file.state;
  for (let v = file.version; v < currentVersion; v++) {
    const migrate = migrations[v];
    if (!migrate) return null;
    state = migrate(state);
  }
  return looksLikeGameState(state) ? fillMissingPrices(state) : null;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** 粗略檢查必要欄位的型別，避免壞掉的存檔讓畫面當掉 */
function looksLikeGameState(s: Record<string, unknown>): s is Record<string, unknown> & GameState {
  const numbers = ['day', 'money', 'rngState', 'nextOrderNo', 'nextUid'] as const;
  const arrays = ['coupons', 'orders', 'inventory', 'events'] as const;
  const records = ['prices', 'prevPrices', 'cart', 'checkIn'] as const;
  return (
    numbers.every((k) => typeof s[k] === 'number' && Number.isFinite(s[k])) &&
    arrays.every((k) => Array.isArray(s[k])) &&
    records.every((k) => isRecord(s[k])) &&
    (s.flashSale === null || isRecord(s.flashSale)) &&
    isRecord(s.silk) &&
    Array.isArray(s.silk.worms) &&
    typeof s.silk.leaves === 'number' &&
    isRecord(s.silk.dex) &&
    typeof s.silk.speedups === 'number' &&
    isRecord(s.mail) &&
    Array.isArray(s.mail.inbox) &&
    Array.isArray(s.mail.delivered) &&
    typeof s.mail.nextMailNo === 'number' &&
    isRecord(s.roulette) &&
    typeof s.roulette.spinsToday === 'number' &&
    typeof s.roulette.totalSpins === 'number'
  );
}

// ── localStorage 存取 ──
// 無痕模式、空間已滿或瀏覽器封鎖網站資料時，localStorage 會丟出錯誤，所以全部包 try/catch。

/** 回傳是否成功存檔 */
export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state, Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw === null ? null : deserialize(raw);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // 無法刪除也不影響開新遊戲
  }
}
