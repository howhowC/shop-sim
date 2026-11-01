import { describe, expect, it } from 'vitest';
import { createInitialState, reducer } from '../core';
import { deserialize, SAVE_VERSION, serialize } from '../save';

describe('存檔', () => {
  it('存檔後讀回來的狀態相同（events 會清空）', () => {
    let s = createInitialState(42);
    s = reducer(s, { type: 'addToCart', productId: 'kb-87' });
    s = reducer(s, { type: 'checkout' });
    s = reducer(s, { type: 'nextDay' });

    const loaded = deserialize(serialize(s, 0));
    expect(loaded).toEqual({ ...s, events: [] });
  });

  it('讀檔後繼續玩，結果和沒存檔時完全一樣', () => {
    const s = reducer(createInitialState(7), { type: 'nextDay' });
    const loaded = deserialize(serialize(s, 0))!;
    expect(reducer(loaded, { type: 'nextDay' }).prices).toEqual(reducer(s, { type: 'nextDay' }).prices);
  });

  it('壞掉的存檔回傳 null', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('null')).toBeNull();
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION, state: { day: 'x' } }))).toBeNull();
  });

  it('比程式還新的存檔回傳 null', () => {
    const raw = serialize(createInitialState(1), 0).replace(`"version":${SAVE_VERSION}`, `"version":${SAVE_VERSION + 1}`);
    expect(deserialize(raw)).toBeNull();
  });

  it('舊版存檔會依序經過轉換函式', () => {
    const current = createInitialState(1);
    // 模擬一個 version 1 的存檔，以及「程式已經升到 version 3」的情況
    const { day, ...withoutDay } = current;
    const v1 = JSON.stringify({ version: 1, savedAt: 0, state: { ...withoutDay, today: day } });
    const migrations = {
      1: (old: Record<string, unknown>) => {
        const { today, ...rest } = old;
        return { ...rest, day: today };
      },
      2: (old: Record<string, unknown>) => ({ ...old, money: (old.money as number) + 1 }),
    };
    const loaded = deserialize(v1, migrations, 3);
    expect(loaded?.day).toBe(current.day);
    expect(loaded?.money).toBe(current.money + 1);
  });

  it('v1 存檔（上班）轉換成 v2（每日簽到），其他進度保留', () => {
    const { checkIn: _checkIn, ...rest } = createInitialState(1);
    const v1 = JSON.stringify({
      version: 1,
      savedAt: 0,
      state: { ...rest, money: 12345, job: { level: 2, daysAtLevel: 3, workedToday: true } },
    });
    const loaded = deserialize(v1);
    expect(loaded).not.toBeNull();
    expect(loaded!.money).toBe(12345);
    expect(loaded!.checkIn).toEqual({ lastDate: null, streak: 0 });
    expect(loaded).not.toHaveProperty('job');
  });

  it('v2 存檔的舊商品 id 會改成新 id（購物車、價格、特價、訂單、房間）', () => {
    const s = createInitialState(1);
    const toOld = (id: string) => ({ silkworm: 'silkworm-box', 'golden-hamster': 'dwarf-hamster' })[id] ?? id;
    const renameKeys = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [toOld(k), v]));
    const v2State = {
      ...s,
      cart: { 'silkworm-box': 2 },
      prices: renameKeys(s.prices),
      prevPrices: renameKeys(s.prevPrices),
      flashSale: { productId: 'dwarf-hamster', discountPercent: 30, endsDay: 1 },
      orders: [{ id: 'A1', lines: [{ productId: 'dwarf-hamster', unitPrice: 210, qty: 1 }], total: 210, placedDay: 1, deliveryDay: 3, opened: false }],
      inventory: [{ uid: 1, productId: 'silkworm-box', paidPrice: 90, acquiredDay: 1 }],
    };
    const loaded = deserialize(JSON.stringify({ version: 2, savedAt: 0, state: v2State }))!;
    expect(loaded.cart).toEqual({ silkworm: 2 });
    expect(loaded.prices).toEqual(s.prices);
    expect(loaded.prevPrices).toEqual(s.prevPrices);
    expect(loaded.flashSale?.productId).toBe('golden-hamster');
    expect(loaded.orders[0].lines[0].productId).toBe('golden-hamster');
    expect(loaded.inventory[0].productId).toBe('silkworm');
  });

  it('v3 存檔轉換成 v4 後有空的養蠶資料，其他進度保留', () => {
    const { silk: _silk, ...v3State } = { ...createInitialState(1), money: 4321 };
    const loaded = deserialize(JSON.stringify({ version: 3, savedAt: 0, state: v3State }))!;
    expect(loaded).not.toBeNull();
    expect(loaded.money).toBe(4321);
    expect(loaded.silk).toEqual({ worms: [], leaves: 0, dex: {} });
  });

  it('v4 存檔轉換成 v5 時，房間裡的補差價會被移除，其他物品保留', () => {
    const s = createInitialState(1);
    const v4State = {
      ...s,
      inventory: [
        { uid: 1, productId: 'price-diff', paidPrice: 1, acquiredDay: 1 },
        { uid: 2, productId: 'sticker', paidPrice: 10, acquiredDay: 1 },
      ],
    };
    const loaded = deserialize(JSON.stringify({ version: 4, savedAt: 0, state: v4State }))!;
    expect(loaded.inventory.map((it) => it.productId)).toEqual(['sticker']);
  });

  it('存檔裡沒有新商品的價格時，讀檔會補上', () => {
    const s = createInitialState(1);
    const { silkworm: _p, ...prices } = s.prices;
    const { silkworm: _q, ...prevPrices } = s.prevPrices;
    const loaded = deserialize(serialize({ ...s, prices, prevPrices }, 0))!;
    expect(loaded.prices.silkworm).toBeGreaterThan(0);
    expect(loaded.prevPrices.silkworm).toBe(loaded.prices.silkworm);
    expect(loaded.prices['kb-87']).toBe(s.prices['kb-87']); // 原本就有的價格不變
  });

  it('缺少轉換函式的舊版存檔回傳 null', () => {
    const v1 = serialize(createInitialState(1), 0);
    expect(deserialize(v1, {}, SAVE_VERSION + 1)).toBeNull();
  });
});
