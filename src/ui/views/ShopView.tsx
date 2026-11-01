import { allProducts, currentPrice, getProduct } from '../../core';
import type { Category, GameState, Product } from '../../core';
import { fmt } from '../format';

const CATEGORIES: readonly ('全部' | Category)[] = ['全部', '3C', '居家', '服飾', '美妝', '收藏', '寵物', '點數', '其他'];

interface Props {
  state: GameState;
  query: string;
  category: string;
  onCategory: (c: string) => void;
  onAdd: (id: string, name: string) => void;
}

export function ShopView({ state, query, category, onCategory, onAdd }: Props) {
  const q = query.trim();
  const list = allProducts().filter(
    (p) => (category === '全部' || p.category === category) && (!q || p.name.includes(q)),
  );
  const flash = state.flashSale;
  const flashProduct = flash ? getProduct(flash.productId) : undefined;

  return (
    <div className="shop">
      <div className="cats" role="group" aria-label="分類">
        {CATEGORIES.map((c) => (
          <button key={c} aria-pressed={category === c} onClick={() => onCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div>
        {flash && flashProduct && (
          <div className="flash">
            <strong>限時特價</strong>
            <span>
              {flashProduct.icon} {flashProduct.name} {(100 - flash.discountPercent) / 10} 折
            </span>
            <span className="flash-end">今日限定，換日就結束</span>
          </div>
        )}
        {list.length > 0 ? (
          <div className="grid">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} state={state} onAdd={onAdd} />
            ))}
          </div>
        ) : (
          <div className="empty">找不到「{q}」相關的商品，換個關鍵字試試。</div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ p, state, onAdd }: { p: Product; state: GameState; onAdd: Props['onAdd'] }) {
  const listed = state.prices[p.id];
  const now = currentPrice(state, p.id) ?? listed;
  const diff = listed - (state.prevPrices[p.id] ?? listed);
  const onSale = state.flashSale?.productId === p.id;

  return (
    <article className="card">
      <div className="thumb">
        {onSale && <span className="sticker">限時 {(100 - state.flashSale!.discountPercent) / 10} 折</span>}
        {!onSale && p.limited && <span className="sticker">限量</span>}
        <span aria-hidden="true">{p.icon}</span>
      </div>
      <div className="body">
        <div className="name">{p.name}</div>
        <div className="price">
          <span className="now">{fmt(now)}</span>
          {now !== listed && <span className="was">{fmt(listed)}</span>}
          {diff > 0 && <span className="trend up">▲ {fmt(diff)}</span>}
          {diff < 0 && <span className="trend down">▼ {fmt(-diff)}</span>}
        </div>
        <button className="btn" onClick={() => onAdd(p.id, p.name)}>
          加入購物車
        </button>
      </div>
    </article>
  );
}
