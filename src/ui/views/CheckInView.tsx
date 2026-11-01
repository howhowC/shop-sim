import { useState } from 'react';
import { CHECKIN_DAY7_COUPON, CHECKIN_REWARDS, canCheckIn, nextStreak } from '../../core';
import type { Action, GameState } from '../../core';
import { fmt, localDateString } from '../format';

interface Props {
  state: GameState;
  act: (a: Action) => void;
  onSilk: () => void;
}

export function CheckInView({ state, act, onSilk }: Props) {
  // 進入這個分頁時取一次日期；切換分頁會重新掛載，所以跨過午夜後重新點進來就會更新
  const [today] = useState(() => localDateString(new Date()));
  const available = canCheckIn(state, today);
  // 可以簽到時，標示「今天會是第幾天」；已經簽過時，標示已完成的那天
  const streak = available ? nextStreak(state, today) : state.checkIn.streak;
  const cycleDay = (streak - 1) % CHECKIN_REWARDS.length;

  return (
    <>
      <h2>每日簽到</h2>
      <div className="two">
        <div className="panel job">
          <div className="spread">
            <strong className="big">已連續簽到 {available ? streak - 1 : streak} 天</strong>
            <span className="small muted">一天一次，斷簽會從第 1 天重新開始</span>
          </div>
          <ol className="checkin-days">
            {CHECKIN_REWARDS.map((reward, i) => {
              const done = i < cycleDay || (i === cycleDay && !available);
              const isToday = i === cycleDay && available;
              return (
                <li key={i} className={done ? 'done' : isToday ? 'today' : undefined}>
                  <span className="small">第 {i + 1} 天</span>
                  <span className="num">{fmt(reward)}</span>
                  {i === CHECKIN_REWARDS.length - 1 && <span className="small">＋優惠券</span>}
                </li>
              );
            })}
          </ol>
          <p className="small muted">
            第 7 天加送優惠券：滿 {fmt(CHECKIN_DAY7_COUPON.minSpend)} 折 {fmt(CHECKIN_DAY7_COUPON.discount)}
          </p>
          <button className="btn" disabled={!available} onClick={() => act({ type: 'checkIn', today })}>
            {available ? `簽到，領 ${fmt(CHECKIN_REWARDS[cycleDay])}` : '今天已簽到，明天再來'}
          </button>
        </div>
        <div className="panel job">
          <strong>小遊戲賺外快</strong>
          <p className="small muted">養蠶寶寶：每天餵桑葉，結繭後可以賣錢，也能等羽化收集圖鑑。</p>
          <button className="btn ghost" onClick={onSilk}>
            去養蠶
          </button>
        </div>
      </div>
    </>
  );
}
