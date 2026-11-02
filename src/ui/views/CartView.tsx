import { useState } from 'react';
import { getProduct, summarizeCart } from '../../core';
import type { Action, GameState } from '../../core';
import { CheckoutSummary } from '../CheckoutSummary';
import { fmt } from '../format';

interface Props {
  state: GameState;
  act: (a: Action) => void;
  onBrowse: () => void;
}

export function CartView({ state, act, onBrowse }: Props) {
  const [couponId, setCouponId] = useState<string | undefined>();
  const coupons = state.coupons.filter((c) => c.expiresDay >= state.day);
  const coupon = coupons.find((c) => c.id === couponId);
  const sum = summarizeCart(state, coupon);

  if (sum.lines.length === 0) {
    return (
      <>
        <h2>購物車</h2>
        <div className="empty">
          購物車是空的。
          <button className="btn ghost" onClick={onBrowse}>
            去商城逛逛
          </button>
        </div>
      </>
    );
  }

  const couponUnusable = coupon !== undefined && sum.discount === 0;
  const tooPoor = sum.total > state.money;

  return (
    <>
      <h2>購物車</h2>
      <div className="two">
        <div className="panel rows">
          {sum.lines.map((l) => {
            const p = getProduct(l.productId)!;
            return (
              <div className="row" key={l.productId}>
                <div className="ic" aria-hidden="true">
                  {p.icon}
                </div>
                <div>
                  <div>{p.name}</div>
                  <div className="num muted small">{fmt(l.unitPrice)} / 件</div>
                </div>
                <div className="qty">
                  <button aria-label={`減少 ${p.name}`} onClick={() => act({ type: 'setCartQty', productId: p.id, qty: l.qty - 1 })}>
                    −
                  </button>
                  <span className="num">{l.qty}</span>
                  <button aria-label={`增加 ${p.name}`} onClick={() => act({ type: 'addToCart', productId: p.id })}>
                    ＋
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h3>結帳</h3>
          <CheckoutSummary
            coupons={coupons}
            couponId={coupon?.id}
            onCoupon={setCouponId}
            subtotal={sum.subtotal}
            discount={sum.discount}
            total={sum.total}
          />
          <button
            className="btn block"
            disabled={tooPoor || couponUnusable}
            onClick={() => {
              act({ type: 'checkout', couponId: coupon?.id });
              setCouponId(undefined);
            }}
          >
            {tooPoor ? '錢包餘額不足' : '確認結帳'}
          </button>
          <p className="small muted">2～4 天送達；養蠶用品結帳後立即到貨</p>
        </div>
      </div>
    </>
  );
}
