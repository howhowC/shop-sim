import { useEffect, useState } from 'react';
import {
  SILK_MAX_AFFECTION,
  SILK_MAX_EXPANSIONS,
  SILK_EXPANSION_SLOTS,
  SILK_NAME_MAX_LENGTH,
  SILK_PRICES,
  SILK_STAGE_COCOON,
  SILK_STAGE_EGG,
  SILK_STAGE_MOTH,
  allSilkBreeds,
  cocoonQuality,
  getSilkBreed,
  isLarva,
  readyToGrow,
  silkCapacity,
  silkSellPrice,
  summarizeSilkCart,
} from '../../core';
import type { Action, GameState, SilkEggKind, SilkRarity, SilkShopItem, Silkworm } from '../../core';
import { CheckoutSummary } from '../CheckoutSummary';
import { SILK_ITEM_NAME, fmt, localDateString } from '../format';
import { SilkwormSvg } from '../SilkwormSvg';

const RARITY_TEXT: Record<SilkRarity, string> = { common: '普通', uncommon: '少見', rare: '稀有', legendary: '傳說' };
const QUALITY_TEXT = { great: '極品', good: '優良', normal: '普通' } as const;
const SHOP: readonly { item: SilkShopItem; icon: string; note: string }[] = [
  { item: 'egg', icon: '🥚', note: '先收進庫存，放進飼養盒才開始孵化' },
  { item: 'premiumEgg', icon: '✨', note: '比較容易孵出稀有品種' },
  { item: 'leaf', icon: '🍃', note: '一份餵一隻一次' },
  { item: 'speedup', icon: '⏩', note: '讓一隻蠶立刻長大一個階段' },
  { item: 'habitat', icon: '🧺', note: `飼養盒多 ${SILK_EXPANSION_SLOTS} 格，最多擴充 ${SILK_MAX_EXPANSIONS} 次` },
];
const RARITY_RANK: Record<SilkRarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

type SortKey = 'age' | 'acquired' | 'rarity' | 'affection';
const SORTS: readonly [SortKey, string][] = [
  ['age', '年齡'],
  ['acquired', '取得時間'],
  ['rarity', '稀有度'],
  ['affection', '親密度'],
];

/**
 * 飼養盒排序（只影響顯示）。desc（↓）＝大的在前：年齡大、最近取得、最稀有、最親密。
 * 卵的品種還沒揭曉，依稀有度排序時不論方向一律排在最後，才不會洩漏品種。
 * 同分時依取得順序（uid）排，順序才穩定。
 */
function sortWorms(worms: readonly Silkworm[], key: SortKey, desc: boolean): Silkworm[] {
  const isEgg = (w: Silkworm) => w.stage <= SILK_STAGE_EGG;
  const rarity = (w: Silkworm) => RARITY_RANK[getSilkBreed(w.breed)?.rarity ?? 'common'];
  // 每個 key 的「由小到大」比較
  const ascending: Record<SortKey, (a: Silkworm, b: Silkworm) => number> = {
    // 階段越後面越大；同階段時越早進入這個階段的越大
    age: (a, b) => a.stage - b.stage || b.stageSince.localeCompare(a.stageSince),
    acquired: (a, b) => a.uid - b.uid,
    rarity: (a, b) => rarity(a) - rarity(b),
    affection: (a, b) => a.affection - b.affection,
  };
  const sign = desc ? -1 : 1;
  return [...worms].sort((a, b) => {
    if (key === 'rarity' && isEgg(a) !== isEgg(b)) return isEgg(a) ? 1 : -1;
    return sign * ascending[key](a, b) || a.uid - b.uid;
  });
}
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

  const [sortKey, setSortKey] = useState<SortKey>('age');
  const [sortDesc, setSortDesc] = useState(true);
  const { worms, leaves, speedups, dex } = state.silk;
  const capacity = silkCapacity(state);
  const free = capacity - worms.length;
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
              飼養盒 {worms.length}/{capacity}
            </strong>
            <span className="silk-leaves">
              🍃 桑葉 {leaves} 份・⏩ 加速券 {speedups} 張
            </span>
          </div>
          <EggStock state={state} act={act} today={today} free={free} />
          {worms.length > 1 && (
            <div className="silk-sort small">
              <label>
                排序{' '}
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                  {SORTS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="silk-sort-dir"
                onClick={() => setSortDesc((d) => !d)}
                aria-label={sortDesc ? '由大到小，按一下改成由小到大' : '由小到大，按一下改成由大到小'}
                title={sortDesc ? '由大到小' : '由小到大'}
              >
                {sortDesc ? '↓' : '↑'}
              </button>
            </div>
          )}
          <div className="silk-grid">
            {sortWorms(worms, sortKey, sortDesc).map((w) => (
              <WormCard key={w.uid} worm={w} today={today} tomorrow={tomorrow} leaves={leaves} speedups={speedups} act={act} />
            ))}
            {/* 容量很大時不逐格畫空位，用一張卡片顯示剩幾格 */}
            {free > 0 && <div className="silk-card empty">還有 {free} 個空位</div>}
          </div>
        </section>

        <aside className="silk-side">
          <SilkShop state={state} act={act} today={today} />

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
  const kindName = isEgg ? '神秘蠶卵' : breed.name;
  const name = w.name ?? kindName;

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
      <NameEditor worm={w} displayName={name} today={today} act={act} />
      <div className="silk-name">
        {w.name !== undefined && <span className="small muted">{kindName}</span>}
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

/** 顯示名字，點 ✏️ 後變成輸入框；Enter 儲存、Esc 取消，清空後儲存代表改回品種名稱 */
function NameEditor({ worm, displayName, today, act }: { worm: Silkworm; displayName: string; today: string; act: (a: Action) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <div className="silk-name">
        <strong>{displayName}</strong>
        <button className="silk-rename" onClick={() => setDraft(worm.name ?? '')} aria-label={`幫${displayName}取名`} title="取名">
          ✏️
        </button>
      </div>
    );
  }
  const length = [...draft.trim()].length;
  const tooLong = length > SILK_NAME_MAX_LENGTH;
  return (
    <form
      className="silk-name-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (tooLong) return;
        act({ type: 'silkRename', uid: worm.uid, name: draft, today });
        setDraft(null);
      }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setDraft(null)}
        placeholder="幫牠取個名字"
        aria-label="名字"
        aria-invalid={tooLong}
        autoFocus
      />
      <span className={`small ${tooLong ? 'bad' : 'muted'}`}>
        {length}/{SILK_NAME_MAX_LENGTH}
      </span>
      <button className="btn small" type="submit" disabled={tooLong}>
        儲存
      </button>
      <button className="btn ghost small" type="button" onClick={() => setDraft(null)}>
        取消
      </button>
    </form>
  );
}

/** 養蠶小店：商品加入養蠶購物車，結帳可用優惠券（和主商城共用），付款後立即到貨 */
function SilkShop({ state, act, today }: { state: GameState; act: (a: Action) => void; today: string }) {
  const [couponId, setCouponId] = useState<string | undefined>();
  const coupons = state.coupons.filter((c) => c.expiresDay >= state.day);
  const coupon = coupons.find((c) => c.id === couponId);
  const sum = summarizeSilkCart(state, coupon);
  const setQty = (item: SilkShopItem, qty: number) => act({ type: 'silkCartSet', item, qty });
  const boxMaxed = state.silk.expansions >= SILK_MAX_EXPANSIONS;

  return (
    <section className="panel">
      <strong className="big">蠶寶寶小店</strong>
      <ul className="silk-shop">
        {SHOP.map(({ item, icon, note }) => {
          const qty = state.silkCart[item] ?? 0;
          const soldOut = item === 'habitat' && boxMaxed;
          return (
            <li key={item}>
              <span className="silk-shop-icon" aria-hidden>
                {icon}
              </span>
              <span className="silk-shop-name">
                {SILK_ITEM_NAME[item]} <span className="num">{fmt(SILK_PRICES[item])}</span>
                <span className="small muted">{soldOut ? '已經擴充到最大了' : note}</span>
              </span>
              <span className="qty">
                <button aria-label={`減少 ${SILK_ITEM_NAME[item]}`} disabled={qty === 0} onClick={() => setQty(item, qty - 1)}>
                  −
                </button>
                <span className="num">{qty}</span>
                <button aria-label={`增加 ${SILK_ITEM_NAME[item]}`} disabled={soldOut} onClick={() => setQty(item, qty + 1)}>
                  ＋
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {sum.lines.length > 0 && (
        <div className="silk-checkout">
          <CheckoutSummary
            name="silk-coupon"
            coupons={coupons}
            couponId={coupon?.id}
            onCoupon={setCouponId}
            subtotal={sum.subtotal}
            discount={sum.discount}
            total={sum.total}
          />
          <button
            className="btn block"
            disabled={sum.total > state.money || (coupon !== undefined && sum.discount === 0)}
            onClick={() => {
              act({ type: 'silkCheckout', couponId: coupon?.id, today });
              setCouponId(undefined);
            }}
          >
            {sum.total > state.money ? '錢包餘額不足' : `結帳 ${fmt(sum.total)}`}
          </button>
          <p className="small muted">結帳後立即送進飼養盒</p>
        </div>
      )}
    </section>
  );
}

const EGG_KINDS: readonly { kind: SilkEggKind; icon: string }[] = [
  { kind: 'egg', icon: '🥚' },
  { kind: 'premiumEgg', icon: '✨' },
];

/** 蠶卵庫存：買到、收到的蠶卵先放這裡，玩家自己決定什麼時候放進飼養盒孵化 */
function EggStock({ state, act, today, free }: { state: GameState; act: (a: Action) => void; today: string; free: number }) {
  const { eggStock } = state.silk;
  if (eggStock.egg + eggStock.premiumEgg === 0) return null;
  return (
    <div className="silk-eggs">
      <strong className="small">蠶卵庫存</strong>
      {EGG_KINDS.filter(({ kind }) => eggStock[kind] > 0).map(({ kind, icon }) => {
        const all = Math.min(eggStock[kind], free);
        return (
          <div className="silk-egg-row" key={kind}>
            <span>
              {icon} {SILK_ITEM_NAME[kind]} ×{eggStock[kind]}
            </span>
            <button className="btn small" disabled={free <= 0} onClick={() => act({ type: 'silkPlaceEggs', kind, qty: 1, today })}>
              放 1 顆
            </button>
            {all > 1 && (
              <button className="btn ghost small" onClick={() => act({ type: 'silkPlaceEggs', kind, qty: all, today })}>
                放 {all} 顆
              </button>
            )}
          </div>
        );
      })}
      {free <= 0 && <span className="small muted">飼養盒滿了，先賣掉、放飛或擴充飼養盒吧</span>}
    </div>
  );
}
