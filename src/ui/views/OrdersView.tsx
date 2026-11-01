import { useState } from 'react';
import { activeQty, getOrderStatus, getProduct, isOrderCancelled, refundForOne, returnDaysLeft } from '../../core';
import type { Action, GameState, Order, OrderLine, OrderStatus } from '../../core';
import { ConfirmDialog } from '../ConfirmDialog';
import { fmt } from '../format';

const STEPS: readonly [OrderStatus, string][] = [
  ['placed', '已下單'],
  ['shipped', '已出貨'],
  ['in_transit', '配送中'],
  ['delivered', '已送達'],
];

interface Props {
  state: GameState;
  act: (a: Action) => void;
  onUnbox: (orderId: string) => void;
}

/** 等待確認的退貨 */
interface PendingReturn {
  uid: number;
  name: string;
  refund: number;
}

export function OrdersView({ state, act, onUnbox }: Props) {
  const [pending, setPending] = useState<PendingReturn | null>(null);
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
        {[...state.orders].reverse().map((o) => (
          <OrderCard key={o.id} order={o} state={state} act={act} onUnbox={onUnbox} onReturn={setPending} />
        ))}
      </div>
      {pending && (
        <ConfirmDialog
          title="確定要退貨？"
          message={`「${pending.name}」會從房間移除，退款 ${fmt(pending.refund)} 會立即入帳。退貨後無法復原。`}
          confirmLabel={`退貨，退 ${fmt(pending.refund)}`}
          onConfirm={() => {
            act({ type: 'returnItem', uid: pending.uid });
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

function statusText(o: Order, delivered: boolean, cancelled: boolean, daysLeft: number | null): string {
  if (cancelled) return '已全部取消';
  if (!delivered) return `預計第 ${o.deliveryDay} 天到貨`;
  if (!o.opened) return '已送達，等你開箱';
  if (daysLeft === null) return '已開箱';
  return daysLeft === 0 ? '已開箱・今天是鑑賞期最後一天' : `已開箱・鑑賞期剩 ${daysLeft} 天`;
}

function OrderCard({ order: o, state, act, onUnbox, onReturn }: { order: Order; onReturn: (r: PendingReturn) => void } & Props) {
  const status = getOrderStatus(o, state.day);
  const idx = STEPS.findIndex(([s]) => s === status);
  const delivered = status === 'delivered';
  const cancelled = isOrderCancelled(o);
  const daysLeft = o.opened ? returnDaysLeft(o, state.day) : null;

  return (
    <div className={`order${cancelled ? ' cancelled' : ''}`}>
      <div className="ohead">
        <strong className="num">#{o.id}</strong>
        <span className="muted">
          實付 <span className="num">{fmt(o.total)}</span>
        </span>
        <span className="muted">{statusText(o, delivered, cancelled, daysLeft)}</span>
      </div>
      {!cancelled && (
        <div className="track">
          <div className="fill" style={{ width: `${(idx / 3) * 75}%` }} />
          {STEPS.map(([s, label], k) => (
            <div key={s} className={`step${k <= idx ? ' on' : ''}`}>
              <i />
              {label}
            </div>
          ))}
        </div>
      )}
      <ul className="olines">
        {o.lines.map((l) => (
          <LineRow
            key={l.productId}
            order={o}
            line={l}
            state={state}
            act={act}
            onReturn={onReturn}
            canCancel={!delivered}
            canReturn={daysLeft !== null}
          />
        ))}
      </ul>
      {delivered && !o.opened && !cancelled && (
        <button className="btn self-start" onClick={() => onUnbox(o.id)}>
          開箱
        </button>
      )}
    </div>
  );
}

interface LineProps {
  order: Order;
  line: OrderLine;
  state: GameState;
  act: (a: Action) => void;
  onReturn: (r: PendingReturn) => void;
  canCancel: boolean;
  canReturn: boolean;
}

function LineRow({ order, line, state, act, onReturn, canCancel, canReturn }: LineProps) {
  const p = getProduct(line.productId);
  const left = activeQty(line);
  const refund = refundForOne(order, line.productId);
  // 房間裡還留著、來自這筆訂單的同款物品（拿去二手市場賣掉的就不能退了）
  const owned = canReturn ? state.inventory.filter((it) => it.orderId === order.id && it.productId === line.productId) : [];
  const notes = [
    line.cancelledQty ? `已取消 ${line.cancelledQty}` : '',
    line.returnedQty ? `已退貨 ${line.returnedQty}` : '',
  ].filter(Boolean);

  return (
    <li>
      <span className={left === 0 ? 'muted strike' : undefined}>
        {p?.icon} {p?.name ?? line.productId} ×{line.qty}
      </span>
      {notes.length > 0 && <span className="small muted">{notes.join('・')}</span>}
      {canCancel && left > 0 && (
        <button className="btn ghost small" onClick={() => act({ type: 'cancelOrderItem', orderId: order.id, productId: line.productId })}>
          取消 1 件，退 {fmt(refund)}
        </button>
      )}
      {owned.length > 0 && left > 0 && (
        <button className="btn ghost small" onClick={() => onReturn({ uid: owned[0].uid, name: p?.name ?? line.productId, refund })}>
          退貨 1 件，退 {fmt(refund)}
        </button>
      )}
    </li>
  );
}
