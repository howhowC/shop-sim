import { useEffect, useState } from 'react';
import {
  SILK_CAPACITY,
  SILK_MAX_AFFECTION,
  SILK_PRICES,
  SILK_STAGE_COCOON,
  SILK_STAGE_EGG,
  SILK_STAGE_MOTH,
  allSilkBreeds,
  cocoonQuality,
  getSilkBreed,
  isLarva,
  readyToGrow,
  silkSellPrice,
} from '../../core';
import type { Action, GameState, SilkRarity, SilkShopItem, Silkworm } from '../../core';
import { SILK_ITEM_NAME, fmt, localDateString } from '../format';
import { SilkwormSvg } from '../SilkwormSvg';

const RARITY_TEXT: Record<SilkRarity, string> = { common: '普通', uncommon: '少見', rare: '稀有', legendary: '傳說' };
const QUALITY_TEXT = { great: '極品', good: '優良', normal: '普通' } as const;
const SHOP: readonly { item: SilkShopItem; icon: string; note: string }[] = [
  { item: 'egg', icon: '🥚', note: '孵化後才知道是什麼品種' },
  { item: 'premiumEgg', icon: '✨', note: '比較容易孵出稀有品種' },
  { item: 'leaf', icon: '🍃', note: '一份餵一隻一次' },
  { item: 'speedup', icon: '⏩', note: '讓一隻蠶立刻長大一個階段' },
];
const HEARTS = 5;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function stageText(stage: number): string {
  if (stage <= SILK_STAGE_EGG) return '蠶卵';
  if (stage === SILK_STAGE_COCOON) return '繭';
  if (stage >= SILK_STAGE_MOTH) return '蛾';
  return `${stage} 齡`;
}

export function SilkView({ state, act }: { state: GameState; act: (a: Action) => void }) {
  // 進入分頁時取一次日期（同 CheckInView）。開發模式可以把日期往後撥，不用等真的過一天；
  // 撥過的日期會寫進存檔，重新整理後回到真實日期時，蠶要等現實時間追上才會繼續長。
  const [base] = useState(() => new Date());
  const [devOffset, setDevOffset] = useState(0);
  const today = localDateString(addDays(base, devOffset));
  const tomorrow = localDateString(addDays(base, devOffset + 1));

  // 打開分頁或換日時，讓蠶依今天日期成長（act 每次 render 都是新函式，刻意不放進依賴）
  useEffect(() => {
    act({ type: 'silkSync', today });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the date changes
  }, [today]);

  const { worms, leaves, speedups, dex } = state.silk;
  const breeds = allSilkBreeds();
  const collected = breeds.filter((b) => dex[b.id]?.hatched).length;

  return (
    <>
      <h2>養蠶</h2>
      <p className="muted lead">每天餵一次桑葉，蠶寶寶隔天就會長大一齡。忘了餵也沒關係，只是長得慢一點。</p>
      {import.meta.env.DEV && (
        <p className="small muted">
          開發用：今天是 {today}{' '}
          <button className="btn ghost small" onClick={() => setDevOffset((n) => n + 1)}>
            日期 +1
          </button>
        </p>
      )}

      <div className="two silk-layout">
        <section className="panel silk-box">
          <div className="spread">
            <strong className="big">
              飼養盒 {worms.length}/{SILK_CAPACITY}
            </strong>
            <span className="silk-leaves">
              🍃 桑葉 {leaves} 份・⏩ 加速券 {speedups} 張
            </span>
          </div>
          <div className="silk-grid">
            {worms.map((w) => (
              <WormCard key={w.uid} worm={w} today={today} tomorrow={tomorrow} leaves={leaves} speedups={speedups} act={act} />
            ))}
            {Array.from({ length: SILK_CAPACITY - worms.length }, (_, i) => (
              <div className="silk-card empty" key={`empty-${i}`}>
                空位
              </div>
            ))}
          </div>
        </section>

        <aside className="silk-side">
          <section className="panel">
            <strong className="big">蠶寶寶小店</strong>
            <ul className="silk-shop">
              {SHOP.map(({ item, icon, note }) => {
                const price = SILK_PRICES[item];
                const isEgg = item === 'egg' || item === 'premiumEgg';
                return (
                  <li key={item}>
                    <span className="silk-shop-icon" aria-hidden>
                      {icon}
                    </span>
                    <span className="silk-shop-name">
                      {SILK_ITEM_NAME[item]} <span className="num">{fmt(price)}</span>
                      <span className="small muted">{note}</span>
                    </span>
                    <span className="silk-shop-buttons">
                      <button
                        className="btn small"
                        disabled={state.money < price || (isEgg && worms.length >= SILK_CAPACITY)}
                        onClick={() => act({ type: 'silkBuy', item, today })}
                      >
                        買 1
                      </button>
                      {!isEgg && (
                        <button
                          className="btn ghost small"
                          disabled={state.money < price * 5}
                          onClick={() => act({ type: 'silkBuy', item, qty: 5, today })}
                        >
                          買 5
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel">
            <div className="spread">
              <strong className="big">圖鑑</strong>
              <span className="small muted">
                已收集 {collected}/{breeds.length}
              </span>
            </div>
            <ul className="silk-dex">
              {breeds.map((b) => {
                const entry = dex[b.id];
                const seen = entry?.hatched ?? false;
                return (
                  <li key={b.id} className={seen ? undefined : 'unseen'}>
                    <SilkwormSvg breed={b} stage={3} silhouette={!seen} size={56} label={seen ? b.name : '尚未發現'} />
                    <span className="small">{seen ? b.name : '？？？'}</span>
                    <span className={`silk-rarity ${b.rarity}`}>{RARITY_TEXT[b.rarity]}</span>
                    <span className="small muted">
                      <span title="孵化過">{seen ? '🐛' : '・'}</span>
                      <span title="羽化過">{entry?.moth ? '🦋' : '・'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

interface CardProps {
  worm: Silkworm;
  today: string;
  tomorrow: string;
  leaves: number;
  speedups: number;
  act: (a: Action) => void;
}

function WormCard({ worm: w, today, tomorrow, leaves, speedups, act }: CardProps) {
  const breed = getSilkBreed(w.breed);
  if (!breed) return null;
  const isEgg = w.stage <= SILK_STAGE_EGG;
  const larva = isLarva(w);
  const price = silkSellPrice(w);
  const filled = Math.ceil((w.affection / SILK_MAX_AFFECTION) * HEARTS);
  const name = isEgg ? '神秘蠶卵' : breed.name;

  let hint: string;
  if (isEgg) hint = '明天就會孵化';
  else if (w.stage === SILK_STAGE_COCOON) hint = `明天羽化（羽化後只能放飛）・${QUALITY_TEXT[cocoonQuality(w.affection).quality]}品質`;
  else if (w.stage >= SILK_STAGE_MOTH) hint = '已登記圖鑑，放牠自由吧';
  else if (readyToGrow(w, tomorrow)) hint = w.fedOn === today ? '吃飽了，明天會長大' : '明天會長大';
  else hint = '肚子餓了，餵牠吃桑葉吧';

  return (
    <div className={`silk-card ${breed.rarity}`}>
      <div className="silk-pic">
        <SilkwormSvg breed={breed} stage={w.stage} label={`${name}・${stageText(w.stage)}`} />
        {isEgg && <span className="silk-mystery">?</span>}
      </div>
      <div className="silk-name">
        <strong>{name}</strong>
        {!isEgg && <span className={`silk-rarity ${breed.rarity}`}>{RARITY_TEXT[breed.rarity]}</span>}
      </div>
      <span className="small muted">{stageText(w.stage)}</span>
      {!isEgg && (
        <span className="silk-hearts" aria-label={`親密度 ${w.affection}`}>
          {Array.from({ length: HEARTS }, (_, i) => (i < filled ? '♥' : '♡')).join('')}
        </span>
      )}
      <span className="small muted silk-hint">{hint}</span>
      <div className="silk-actions">
        {larva && (
          <>
            <button className="btn small" disabled={w.fedOn === today || leaves <= 0} onClick={() => act({ type: 'silkFeed', uid: w.uid, today })}>
              餵食
            </button>
            <button className="btn ghost small" disabled={w.pettedOn === today} onClick={() => act({ type: 'silkPet', uid: w.uid, today })}>
              摸摸
            </button>
          </>
        )}
        {w.stage < SILK_STAGE_MOTH && speedups > 0 && (
          <button className="btn ghost small" title="用一張加速券，立刻長大一個階段" onClick={() => act({ type: 'silkSpeedup', uid: w.uid, today })}>
            ⏩ 加速
          </button>
        )}
        {price !== null && (
          <button className="btn ghost small" onClick={() => act({ type: 'silkSell', uid: w.uid, today })}>
            賣 {fmt(price)}
          </button>
        )}
        {w.stage >= SILK_STAGE_MOTH && (
          <button className="btn small" onClick={() => act({ type: 'silkRelease', uid: w.uid, today })}>
            放飛
          </button>
        )}
      </div>
    </div>
  );
}
