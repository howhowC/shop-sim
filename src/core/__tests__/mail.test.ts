import { describe, expect, it } from 'vitest';
import { ANNOUNCEMENTS, MILESTONE_MAIL, RANDOM_MAIL } from '../../data/mail';
import { getProduct } from '../catalog';
import { SILK_CAPACITY } from '../config';
import { unclaimedCount } from '../mail';
import { createInitialState } from '../reducer';
import type { GameState, Mail } from '../types';
import { run, times } from './helpers';

const TODAY = '2026-12-01';
const firstAnnouncement = ANNOUNCEMENTS[0];

/** 直接放一封指定模板的信進信箱，測試領取用 */
function withMail(s: GameState, templateId: string, claimed = false): GameState {
  const mail: Mail = { id: 'M99', templateId, receivedDay: s.day, claimed };
  return { ...s, mail: { ...s.mail, inbox: [...s.mail.inbox, mail] } };
}

describe('郵件：資料', () => {
  it('所有模板 id 不重複，商品附件都是存在的實體商品', () => {
    const all = [...ANNOUNCEMENTS, ...RANDOM_MAIL, ...MILESTONE_MAIL];
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
    for (const t of all) {
      for (const r of t.rewards) {
        if (r.kind !== 'product') continue;
        const product = getProduct(r.productId);
        expect(product, `${t.id} → ${r.productId}`).toBeDefined();
        expect(product?.virtual, `${t.id} → ${r.productId} 不能是虛擬商品`).toBeFalsy();
      }
    }
  });
});

describe('郵件：公告信', () => {
  it('開放日期前收不到，當天收到，同一封不會收兩次', () => {
    const s0 = createInitialState(1);
    const before = run(s0, { type: 'mailSync', today: '2000-01-01' });
    expect(before.mail.inbox).toHaveLength(0);

    const s = run(s0, { type: 'mailSync', today: firstAnnouncement.availableFrom });
    expect(s.mail.inbox.map((m) => m.templateId)).toContain(firstAnnouncement.id);
    expect(s.events).toContainEqual({ type: 'mailReceived', count: s.mail.inbox.length });

    const again = run(s, { type: 'mailSync', today: TODAY });
    expect(again.mail.inbox).toHaveLength(s.mail.inbox.length);
  });
});

describe('郵件：隨機來信', () => {
  it('同一個 seed 收到的信完全相同', () => {
    const play = () => run(createInitialState(9), ...times(30, { type: 'nextDay' })).mail.inbox;
    const a = play();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(play());
  });
});

describe('郵件：里程碑', () => {
  it('第一次下單後收到一封，之後不會重複寄', () => {
    let s = run(createInitialState(1), { type: 'addToCart', productId: 'sticker' }, { type: 'checkout' });
    expect(s.mail.inbox.map((m) => m.templateId)).toEqual(['first-order']);
    expect(s.events).toContainEqual({ type: 'mailReceived', count: 1 });
    s = run(s, { type: 'addToCart', productId: 'sticker' }, { type: 'checkout' });
    expect(s.mail.inbox.filter((m) => m.templateId === 'first-order')).toHaveLength(1);
  });

  it('被拒絕的 action 不會寄里程碑信', () => {
    const s0 = { ...createInitialState(1), money: 0 };
    const s = run(s0, { type: 'addToCart', productId: 'sticker' }, { type: 'checkout' });
    expect(s.mail.inbox).toHaveLength(0);
  });
});

describe('郵件：領取', () => {
  it('金錢入帳，信標記為已領取', () => {
    const s0 = withMail(createInitialState(1), 'thanks-shop');
    const s = run(s0, { type: 'claimMail', mailId: 'M99' });
    expect(s.money).toBe(s0.money + 150);
    expect(s.mail.inbox[0].claimed).toBe(true);
    expect(s.events).toEqual([{ type: 'mailClaimed', mailId: 'M99', templateId: 'thanks-shop' }]);
    expect(unclaimedCount(s)).toBe(0);
  });

  it('優惠券從領取當天起算有效天數', () => {
    const s0 = withMail(run(createInitialState(1), { type: 'nextDay' }), 'coupon-gift');
    const s = run(s0, { type: 'claimMail', mailId: 'M99' });
    const coupon = s.coupons.find((c) => c.id.startsWith('M99'))!;
    expect(coupon).toMatchObject({ minSpend: 300, discount: 60, expiresDay: s0.day + 2 });
  });

  it('桑葉、加速券、商品都會發到對的地方', () => {
    let s = withMail(createInitialState(1), 'farmer-leaves');
    s = run(s, { type: 'claimMail', mailId: 'M99' });
    expect(s.silk.leaves).toBe(5);

    s = run(withMail(createInitialState(1), 'speedup-trial'), { type: 'claimMail', mailId: 'M99' });
    expect(s.silk.speedups).toBe(1);

    s = run(withMail(createInitialState(1), 'mystery-sticker'), { type: 'claimMail', mailId: 'M99' });
    expect(s.inventory).toEqual([{ uid: 1, productId: 'sticker', paidPrice: 0, acquiredDay: 1 }]);
  });

  it('蠶卵收進庫存，飼養盒滿了也能領', () => {
    const s0 = run(createInitialState(1), { type: 'silkBuy', item: 'egg', qty: SILK_CAPACITY, today: TODAY }, { type: 'silkPlaceEggs', kind: 'egg', qty: SILK_CAPACITY, today: TODAY });
    const s = run(withMail(s0, 'first-moth'), { type: 'claimMail', mailId: 'M99' });
    expect(s.silk.eggStock.premiumEgg).toBe(1);
    expect(s.silk.worms).toHaveLength(SILK_CAPACITY);
  });

  it('已領的信不能再領', () => {
    const s = run(withMail(createInitialState(1), 'thanks-shop', true), { type: 'claimMail', mailId: 'M99' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'mail_already_claimed' }]);
  });

  it('全部領取：所有沒領的信一次領完', () => {
    const base = createInitialState(1);
    const s0: GameState = {
      ...base,
      mail: {
        ...base.mail,
        inbox: [
          { id: 'M1', templateId: 'thanks-shop', receivedDay: 1, claimed: false },
          { id: 'M2', templateId: 'first-moth', receivedDay: 1, claimed: false },
          { id: 'M3', templateId: 'farmer-leaves', receivedDay: 1, claimed: false },
        ],
      },
    };
    const s = run(s0, { type: 'claimAllMail' });
    expect(s.mail.inbox.map((m) => m.claimed)).toEqual([true, true, true]);
    expect(s.money).toBe(s0.money + 150);
    expect(s.silk).toMatchObject({ leaves: 5, eggStock: { premiumEgg: 1 } });
    expect(s.events.filter((e) => e.type === 'mailClaimed')).toHaveLength(3);
  });

  it('沒有信可以領時，全部領取被拒絕', () => {
    const s = run(createInitialState(1), { type: 'claimAllMail' });
    expect(s.events).toEqual([{ type: 'rejected', reason: 'no_mail_to_claim' }]);
  });
});
