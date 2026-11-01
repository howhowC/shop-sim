import { CHECKIN_DAY7_COUPON, CHECKIN_REWARDS, COUPON_LIFETIME_DAYS } from '../config';
import type { Coupon, GameEvent, GameState } from '../types';
import { earn } from './earn';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' 轉成天數序號（用 UTC 計算，避免時區和日光節約時間影響相減結果） */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** 今天可以簽到嗎？今天已簽過，或日期比上次還早（調過時鐘）都不行 */
export function canCheckIn(state: GameState, today: string): boolean {
  const { lastDate } = state.checkIn;
  return lastDate === null || dayNumber(today) > dayNumber(lastDate);
}

/** 如果今天簽到，會是連續第幾天 */
export function nextStreak(state: GameState, today: string): number {
  const { lastDate, streak } = state.checkIn;
  return lastDate !== null && dayNumber(today) - dayNumber(lastDate) === 1 ? streak + 1 : 1;
}

export function checkIn(state: GameState, today: string): { state: GameState; events: GameEvent[] } {
  if (!canCheckIn(state, today)) {
    return { state, events: [{ type: 'rejected', reason: 'already_checked_in_today' }] };
  }
  const streak = nextStreak(state, today);
  const cycleDay = (streak - 1) % CHECKIN_REWARDS.length;
  const paid = earn(state, 'checkIn', CHECKIN_REWARDS[cycleDay]);
  const events: GameEvent[] = [paid.event];

  let coupons = paid.state.coupons;
  if (cycleDay === CHECKIN_REWARDS.length - 1) {
    const coupon: Coupon = {
      id: `checkin-${today}`,
      ...CHECKIN_DAY7_COUPON,
      expiresDay: state.day + COUPON_LIFETIME_DAYS - 1,
    };
    coupons = [...coupons, coupon];
    events.push({ type: 'couponReceived', coupon });
  }

  return { state: { ...paid.state, coupons, checkIn: { lastDate: today, streak } }, events };
}
