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

  it('缺少轉換函式的舊版存檔回傳 null', () => {
    const v1 = serialize(createInitialState(1), 0);
    expect(deserialize(v1, {}, SAVE_VERSION + 1)).toBeNull();
  });
});
