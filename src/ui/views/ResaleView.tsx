import { getProduct, resalePrice } from '../../core';
import type { Action, GameState } from '../../core';
import { fmt } from '../format';

export function ResaleView({ state, act }: { state: GameState; act: (a: Action) => void }) {
  return (
    <>
      <h2>二手市場</h2>
      <p className="muted lead">一般商品依今日牌價約五成五回收；限量品持有越久越值錢，最多到買價的 1.5 倍。</p>
      {state.inventory.length === 0 ? (
        <div className="empty">你還沒有可以賣的東西。開箱後的商品會出現在這裡。</div>
      ) : (
        <div className="panel rows">
          {state.inventory.map((it) => {
            const p = getProduct(it.productId)!;
            const price = resalePrice(state, it);
            const gain = price - it.paidPrice;
            return (
              <div className="row" key={it.uid}>
                <div className="ic" aria-hidden="true">
                  {p.icon}
                </div>
                <div>
                  <div>
                    {p.name} {p.limited && <span className="sticker inline">限量</span>}
                  </div>
                  <div className="small muted">
                    買價 <span className="num">{fmt(it.paidPrice)}</span> → 收購價{' '}
                    <span className={`num ${gain >= 0 ? 'down' : 'up'}`}>
                      {fmt(price)}（{gain >= 0 ? '賺' : '賠'} {fmt(Math.abs(gain))}）
                    </span>
                  </div>
                </div>
                <button className="btn ghost" onClick={() => act({ type: 'sellItem', uid: it.uid })}>
                  賣出
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
