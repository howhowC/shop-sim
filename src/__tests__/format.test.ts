import { describe, expect, it } from 'vitest';
import { eventText, silkwormsLabel } from '../ui/format';

describe('通知文字：蠶寶寶的名字', () => {
  it('一群蠶的稱呼', () => {
    expect(silkwormsLabel([null])).toBe('蠶寶寶');
    expect(silkwormsLabel([null, null])).toBe('2 隻蠶寶寶');
    expect(silkwormsLabel(['小白'])).toBe('小白');
    expect(silkwormsLabel(['小白', '阿黃'])).toBe('小白、阿黃');
    expect(silkwormsLabel(['小白', null])).toBe('小白和蠶寶寶');
    expect(silkwormsLabel(['小白', null, null])).toBe('小白和 2 隻蠶寶寶');
  });

  it('有名字的通知會帶名字，沒名字維持原本的說法', () => {
    expect(eventText({ type: 'silkGrew', uids: [1, 2], names: ['小白', null] })).toBe('小白和蠶寶寶長大了一齡');
    expect(eventText({ type: 'silkReleased', uid: 1, name: null })).toBe('蛾寶寶飛走了，掰掰～');
    expect(eventText({ type: 'silkReleased', uid: 1, name: '小白' })).toBe('小白飛走了，掰掰～');
    expect(eventText({ type: 'silkSold', uid: 1, name: '小白', amount: 160 })).toBe('和小白說再見，賣給蠶農收購站，入帳 $160');
    expect(eventText({ type: 'silkSold', uid: 1, name: null, amount: 160 })).toBe('賣給蠶農收購站，入帳 $160');
  });
});
