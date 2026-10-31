import { getOrderStatus, getProduct } from '../../core';
import type { GameState, OrderStatus } from '../../core';

const STEPS: readonly [OrderStatus, string][] = [
  ['placed', '已下單'],
  ['shipped', '已出貨'],
  ['in_transit', '配送中'],
  ['delivered', '已送達'],
];

export function OrdersView({ state, onUnbox }: { state: GameState; onUnbox: (orderId: string) => void }) {
  if (state.orders.length === 0) {
    return (
      <>
        <h2>我的訂單</h2>
        <div className="empty">還沒有訂單。</div>
      </>
    );
  }
  return (
    <>
      <h2>我的訂單</h2>
      <div className="orders">
        {[...state.orders].reverse().map((o) => {
          const status = getOrderStatus(o, state.day);
          const idx = STEPS.findIndex(([s]) => s === status);
          const delivered = status === 'delivered';
          return (
            <div className="order" key={o.id}>
              <div className="ohead">
                <strong className="num">#{o.id}</strong>
                <span>{o.lines.map((l) => `${getProduct(l.productId)?.icon} ${getProduct(l.productId)?.name} ×${l.qty}`).join('、')}</span>
                <span className="muted">
                  {!delivered ? `預計第 ${o.deliveryDay} 天到貨` : o.opened ? '已開箱' : '已送達，等你開箱'}
                </span>
              </div>
              <div className="track">
                <div className="fill" style={{ width: `${(idx / 3) * 75}%` }} />
                {STEPS.map(([s, label], k) => (
                  <div key={s} className={`step${k <= idx ? ' on' : ''}`}>
                    <i />
                    {label}
                  </div>
                ))}
              </div>
              {delivered && !o.opened && (
                <button className="btn self-start" onClick={() => onUnbox(o.id)}>
                  開箱
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
