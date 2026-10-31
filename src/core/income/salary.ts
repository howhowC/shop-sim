import { DAYS_TO_PROMOTE, JOBS } from '../config';
import type { GameEvent, GameState } from '../types';
import { earn } from './earn';

export function work(state: GameState): { state: GameState; events: GameEvent[] } {
  if (state.job.workedToday) {
    return { state, events: [{ type: 'rejected', reason: 'already_worked_today' }] };
  }
  const paid = earn(state, 'salary', JOBS[state.job.level].dailyPay);
  const events: GameEvent[] = [paid.event];

  let { level, daysAtLevel } = state.job;
  daysAtLevel += 1;
  if (daysAtLevel >= DAYS_TO_PROMOTE && level < JOBS.length - 1) {
    level += 1;
    daysAtLevel = 0;
    events.push({ type: 'promoted', level });
  }
  return { state: { ...paid.state, job: { level, daysAtLevel, workedToday: true } }, events };
}
