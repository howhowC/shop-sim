import { getProduct } from '../../core';
import type { GameState } from '../../core';

const PER_SHELF = 6;

export function RoomView({ state }: { state: GameState }) {
  const items = state.inventory;
  const shelfCount = Math.max(2, Math.ceil((items.length + 1) / PER_SHELF));
  const shelves = Array.from({ length: shelfCount }, (_, s) =>
    Array.from({ length: PER_SHELF }, (_, k) => items[s * PER_SHELF + k]),
  );

  return (
    <>
      <h2>我的房間</h2>
      <p className="muted lead">收藏 {items.length} 件。買得越多，房間就越滿。</p>
      <div className="room">
        {shelves.map((row, s) => (
          <div className="shelf" key={s}>
            {row.map((it, k) => {
              const p = it && getProduct(it.productId);
              return p ? (
                <div className="slot full" key={it.uid} title={p.name}>
                  <span role="img" aria-label={p.name}>
                    {p.icon}
                  </span>
                </div>
              ) : (
                <div className="slot free" key={`free-${k}`}>
                  空位
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
