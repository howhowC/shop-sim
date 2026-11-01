import { useEffect, useRef, useState } from 'react';
import { getProduct, shippedQty } from '../core';
import type { Order, Product } from '../core';

interface Props {
  order: Order;
  onOpen: () => void;
  /** 關閉並前往我的房間 */
  onClose: () => void;
  /** 關閉並留在訂單頁（開箱前按代表稍後再開） */
  onBack: () => void;
}

export function UnboxModal({ order, onOpen, onClose, onBack }: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => boxRef.current?.focus(), []);

  const products = order.lines
    .filter((l) => shippedQty(l) > 0)
    .map((l) => getProduct(l.productId))
    .filter((p): p is Product => p !== undefined && !p.virtual);

  const doOpen = () => {
    if (open) return;
    setOpen(true);
    onOpen();
  };

  return (
    <div className="modal">
      <div className="mbox" role="dialog" aria-modal="true" aria-labelledby="unbox-title">
        <h2 id="unbox-title">包裹 #{order.id} 到了！</h2>
        <div
          ref={boxRef}
          className={`box${open ? ' open' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="點擊開箱"
          onClick={doOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              doOpen();
            }
          }}
        >
          <div className="pop">{products.map((p) => p.icon).join('')}</div>
          <div className="base">
            <div className="tape" />
          </div>
          <div className="flap l" />
          <div className="flap r" />
        </div>
        <p className="muted">
          {!open ? '點一下紙箱開箱' : products.length > 0 ? `拿到了：${products.map((p) => p.name).join('、')}` : '裡面空空的：補差價不是實體商品'}
        </p>
        <div className="actions">
          {open ? (
            <>
              <button className="btn ghost" onClick={onBack}>
                返回訂單
              </button>
              <button className="btn" onClick={onClose} autoFocus>
                放進我的房間
              </button>
            </>
          ) : (
            <button className="btn ghost" onClick={onBack}>
              稍後再開
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
