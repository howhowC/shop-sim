import { DAYS_TO_PROMOTE, JOBS } from '../../core';
import type { Action, GameState } from '../../core';
import { fmt } from '../format';

export function WorkView({ state, act }: { state: GameState; act: (a: Action) => void }) {
  const { level, daysAtLevel, workedToday } = state.job;
  const job = JOBS[level];
  const top = level === JOBS.length - 1;

  return (
    <>
      <h2>上班</h2>
      <div className="two">
        <div className="panel job">
          <div className="spread">
            <strong className="big">職位：{job.title}</strong>
            <span>
              日薪 <span className="num">{fmt(job.dailyPay)}</span>
            </span>
          </div>
          <div>
            <div className="small muted">
              {top ? '已經是最高職位' : `升職進度 ${daysAtLevel} / ${DAYS_TO_PROMOTE} 天，下一階：${JOBS[level + 1].title}`}
            </div>
            <div className="bar">
              <span style={{ width: `${top ? 100 : (daysAtLevel / DAYS_TO_PROMOTE) * 100}%` }} />
            </div>
          </div>
          <button className="btn" disabled={workedToday} onClick={() => act({ type: 'work' })}>
            {workedToday ? '今天已經打卡，明天再來' : `上班打卡，領 ${fmt(job.dailyPay)}`}
          </button>
        </div>
        <div className="panel job locked">
          <strong>小遊戲打工</strong>
          <p className="small muted">之後的版本會加入：用小遊戲賺外快。</p>
        </div>
      </div>
    </>
  );
}
