import { useEffect, useState } from 'react';
import { ROULETTE_DAILY_SPINS, ROULETTE_PRICE, allRoulettePrizes, prizeChance, prizeValue, spinsLeft } from '../../core';
import type { Action, GameState } from '../../core';
import { fmt, localDateString } from '../format';

/** 轉盤動畫長度（毫秒）；CSS 的 transition 時間要一致 */
const SPIN_MS = 3200;
/** 每一格的底色（固定淺色，深色模式下文字也用深色） */
const SECTOR_COLORS = ['#ffd6e0', '#ffe9b8', '#d4f0c9', '#cde4ff', '#e6d8ff', '#ffe0c7', '#c9f0ec', '#fff3b0'];

/** 輪盤上角度 deg（從正上方順時針）、半徑 r 的點 */
function point(deg: number, r: number): string {
  const rad = (deg * Math.PI) / 180;
  return `${100 + r * Math.sin(rad)} ${100 - r * Math.cos(rad)}`;
}

export function RouletteView({ state, act }: { state: GameState; act: (a: Action) => void }) {
  const [today] = useState(() => localDateString(new Date()));
  const prizes = allRoulettePrizes();
  const slice = 360 / prizes.length;

  const { totalSpins, lastPrizeId } = state.roulette;
  // 角度直接由「第幾次抽」和「抽中哪一格」算出：每抽一次多轉 5 圈，最後讓那一格的中心停在指針（正上方）。
  // 一進頁面就是上次停下的位置；只有 totalSpins 改變時角度才會變，CSS transition 就會播放旋轉動畫。
  const index = prizes.findIndex((p) => p.id === lastPrizeId);
  const center = index < 0 ? 0 : index * slice + slice / 2;
  const rotation = totalSpins * 360 * 5 + ((360 - center) % 360);

  // 動畫播完才顯示結果；進頁面之前抽的不算「正在轉」
  const [mountSpins] = useState(totalSpins);
  const [shown, setShown] = useState<{ spins: number; prizeId: string; toMail: boolean } | null>(null);
  const spinning = totalSpins !== mountSpins && shown?.spins !== totalSpins;
  useEffect(() => {
    if (totalSpins === mountSpins) return;
    // 只在剛抽完時讀一次事件（之後玩家做別的事，events 會被換掉）
    const won = state.events.find((e) => e.type === 'rouletteWon');
    if (!won) return;
    const timer = setTimeout(() => setShown({ spins: totalSpins, prizeId: won.prizeId, toMail: won.toMail }), SPIN_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when a new spin happens
  }, [totalSpins]);

  const left = spinsLeft(state, today);
  const wonPrize = shown && prizes.find((p) => p.id === shown.prizeId);

  return (
    <>
      <h2>幸運輪盤</h2>
      <p className="muted lead">
        每次 {fmt(ROULETTE_PRICE)}，每天可以抽 {ROULETTE_DAILY_SPINS} 次。每個獎品的價值都不少於 {fmt(ROULETTE_PRICE)}！
      </p>
      <div className="two">
        <section className="panel roulette-panel">
          <div className="roulette">
            <div className="roulette-pointer" aria-hidden />
            <svg
              className="roulette-wheel"
              viewBox="0 0 200 200"
              style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${SPIN_MS}ms` }}
              role="img"
              aria-label="輪盤"
            >
              {prizes.map((p, i) => {
                const a0 = i * slice;
                const a1 = a0 + slice;
                return (
                  <g key={p.id}>
                    <path
                      d={`M100 100 L${point(a0, 96)} A96 96 0 0 1 ${point(a1, 96)} Z`}
                      fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <g transform={`rotate(${a0 + slice / 2} 100 100)`}>
                      <text x="100" y="34" textAnchor="middle" fontSize="18">
                        {p.icon}
                      </text>
                      <text x="100" y="52" textAnchor="middle" fontSize="9" fill="#3a2a00" fontWeight="700">
                        {p.label}
                      </text>
                    </g>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="14" fill="#fff" stroke="#e8c39e" strokeWidth="3" />
            </svg>
          </div>

          <p className="roulette-result" aria-live="polite">
            {spinning
              ? '轉呀轉…'
              : wonPrize
                ? `🎉 抽中：${wonPrize.icon} ${wonPrize.label}${shown?.toMail ? '（飼養盒滿了，已寄到信箱）' : ''}`
                : ' '}
          </p>
          <button
            className="btn"
            disabled={spinning || left <= 0 || state.money < ROULETTE_PRICE}
            onClick={() => act({ type: 'spinRoulette', today })}
          >
            {left > 0 ? `抽一次 ${fmt(ROULETTE_PRICE)}（今天還剩 ${left} 次）` : '今天抽完了，明天再來'}
          </button>
        </section>

        <section className="panel">
          <strong className="big">獎品與機率</strong>
          <ul className="roulette-prizes">
            {prizes.map((p, i) => (
              <li key={p.id}>
                <span className="roulette-swatch" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} aria-hidden />
                <span>
                  {p.icon} {p.label}
                </span>
                <span className="small muted">價值 {fmt(prizeValue(p))}</span>
                <span className="num">{(prizeChance(p) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
