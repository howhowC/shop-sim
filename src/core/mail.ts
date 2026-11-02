// 郵件：公告信（依現實日期）、隨機來信（每過一天）、里程碑來信（達成條件）、領取附件。
// 信件文字在 data/mail.ts；存檔只記 templateId。

import { ANNOUNCEMENTS, MILESTONE_MAIL, RANDOM_MAIL } from '../data/mail';
import { ROULETTE_PRIZES } from '../data/roulette';
import { getProduct } from './catalog';
import { MAIL_KEEP_CLAIMED, MAIL_RANDOM_CHANCE } from './config';
import { earn } from './income/earn';
import type { Rng } from './rng';
import { grantSilkItem, rejected, type SilkResult } from './silk';
import type { GameEvent, GameState, Mail, MailState, MailTemplate, MilestoneCondition, OwnedItem } from './types';

// 輪盤獎品也是信件模板：飼養盒放不下時改寄到信箱
const templates = new Map<string, MailTemplate>(
  [...ANNOUNCEMENTS, ...RANDOM_MAIL, ...MILESTONE_MAIL, ...ROULETTE_PRIZES].map((t) => [t.id, t]),
);

export function getMailTemplate(id: string): MailTemplate | undefined {
  return templates.get(id);
}

export function createMailState(): MailState {
  return { inbox: [], delivered: [], nextMailNo: 1 };
}

export function unclaimedCount(state: GameState): number {
  return state.mail.inbox.filter((m) => !m.claimed).length;
}

/** 把信寄進信箱；remember 為 true 時記進 delivered（公告和里程碑只寄一次） */
function deliver(state: GameState, templateIds: readonly string[], remember: boolean): SilkResult {
  if (templateIds.length === 0) return { state, events: [] };
  let no = state.mail.nextMailNo;
  const added: Mail[] = templateIds.map((templateId) => ({ id: `M${no++}`, templateId, receivedDay: state.day, claimed: false }));
  const inbox = pruneClaimed([...state.mail.inbox, ...added]);
  const delivered = remember ? [...state.mail.delivered, ...templateIds] : state.mail.delivered;
  return {
    state: { ...state, mail: { inbox, delivered, nextMailNo: no } },
    events: [{ type: 'mailReceived', count: added.length }],
  };
}

/** 已領取的信只保留最新的 MAIL_KEEP_CLAIMED 封；沒領的信永遠保留 */
function pruneClaimed(inbox: readonly Mail[]): Mail[] {
  const claimed = inbox.filter((m) => m.claimed);
  const drop = new Set(claimed.slice(0, Math.max(0, claimed.length - MAIL_KEEP_CLAIMED)).map((m) => m.id));
  return inbox.filter((m) => !drop.has(m.id));
}

/** 寄一封信（不記進 delivered，可以重複寄）；給輪盤等其他功能用 */
export function sendMail(state: GameState, templateId: string): SilkResult {
  return deliver(state, [templateId], false);
}

/** 寄出開放日期已到、還沒寄過的公告信 */
export function syncAnnouncements(state: GameState, today: string): SilkResult {
  const due = ANNOUNCEMENTS.filter((a) => a.availableFrom <= today && !state.mail.delivered.includes(a.id)).map((a) => a.id);
  return deliver(state, due, true);
}

/** 每過一天呼叫一次：有機率收到一封隨機信 */
export function rollRandomMail(state: GameState, rng: Rng): SilkResult {
  if (rng.next() >= MAIL_RANDOM_CHANCE) return { state, events: [] };
  return deliver(state, [rng.pick(RANDOM_MAIL).id], false);
}

function milestoneProgress(state: GameState, c: MilestoneCondition): number {
  switch (c.kind) {
    case 'orders':
      return state.orders.length;
    case 'unboxed':
      return state.orders.filter((o) => o.opened).length;
    case 'moths':
      return Object.values(state.silk.dex).filter((e) => e.moth).length;
    case 'dexHatched':
      return Object.values(state.silk.dex).filter((e) => e.hatched).length;
    case 'checkInStreak':
      return state.checkIn.streak;
  }
}

/** 寄出剛達成的里程碑信；reducer 在每個成功的 action 之後呼叫，事件接在原本的事件後面 */
export function deliverMilestones(state: GameState): GameState {
  const due = MILESTONE_MAIL.filter(
    (m) => !state.mail.delivered.includes(m.id) && milestoneProgress(state, m.condition) >= m.condition.count,
  ).map((m) => m.id);
  const r = deliver(state, due, true);
  return r.events.length === 0 ? state : { ...r.state, events: [...state.events, ...r.events] };
}

/**
 * 把附件全部發給玩家（郵件和輪盤共用）；有一項發不出去（飼養盒滿了）就全部不發，回傳拒絕事件。
 * sourceId 用來產生優惠券 id，要在整個遊戲中唯一。
 */
export function giveRewards(state: GameState, template: MailTemplate, sourceId: string): SilkResult {
  let s = state;
  for (const [i, r] of template.rewards.entries()) {
    switch (r.kind) {
      case 'money':
        s = earn(s, 'mail', r.amount).state;
        break;
      case 'coupon':
        s = { ...s, coupons: [...s.coupons, { id: `${sourceId}-${i}`, minSpend: r.minSpend, discount: r.discount, expiresDay: s.day + r.validDays - 1 }] };
        break;
      case 'silk':
      {
        const granted = grantSilkItem(s, r.item, r.qty);
        if (granted.events.length > 0) return { state, events: granted.events };
        s = granted.state;
        break;
      }
      case 'product': {
        const product = getProduct(r.productId);
        if (!product || product.virtual) break;
        const items: OwnedItem[] = Array.from({ length: r.qty }, (_, k) => ({
          uid: s.nextUid + k,
          productId: r.productId,
          paidPrice: 0,
          acquiredDay: s.day,
        }));
        s = { ...s, inventory: [...s.inventory, ...items], nextUid: s.nextUid + r.qty };
        break;
      }
    }
  }
  return { state: s, events: [] };
}

export function claimMail(state: GameState, mailId: string): SilkResult {
  const mail = state.mail.inbox.find((m) => m.id === mailId);
  const template = mail && getMailTemplate(mail.templateId);
  if (!mail || !template) return rejected(state, 'unknown_mail');
  if (mail.claimed) return rejected(state, 'mail_already_claimed');
  const r = giveRewards(state, template, mail.id);
  if (r.events.length > 0) return r;
  const inbox = r.state.mail.inbox.map((m) => (m.id === mailId ? { ...m, claimed: true } : m));
  return {
    state: { ...r.state, mail: { ...r.state.mail, inbox } },
    events: [{ type: 'mailClaimed', mailId, templateId: mail.templateId }],
  };
}

/** 依收到的順序領取所有沒領的信；發不出去的信跳過、留在信箱 */
export function claimAllMail(state: GameState): SilkResult {
  const pending = state.mail.inbox.filter((m) => !m.claimed);
  if (pending.length === 0) return rejected(state, 'no_mail_to_claim');
  let s = state;
  const events: GameEvent[] = [];
  let lastFailure: GameEvent | undefined;
  for (const m of pending) {
    const r = claimMail(s, m.id);
    if (r.events.some((e) => e.type === 'rejected')) lastFailure = r.events[0];
    else {
      s = r.state;
      events.push(...r.events);
    }
  }
  if (events.length === 0 && lastFailure) return { state, events: [lastFailure] };
  // 部分領取成功時，也告訴玩家有信沒領到
  return { state: s, events: lastFailure ? [...events, lastFailure] : events };
}
