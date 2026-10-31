import { useState } from 'react';
import { getProduct, summarizeCart } from '../../core';
import type { Action, GameState } from '../../core';
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
          <fieldset className="coupons">
            <legend className="small muted">優惠券</legend>
            <label className="coupon">
              <input type="radio" name="coupon" checked={!coupon} onChange={() => setCouponId(undefined)} />
              不使用
            </label>
            {coupons.map((c) => {
              const reachable = sum.subtotal >= c.minSpend;
              return (
                <label className="coupon" key={c.id}>
                  <input
                    type="radio"
                    name="coupon"
                    checked={couponId === c.id}
                    disabled={!reachable}
                    onChange={() => setCouponId(c.id)}
                  />
                  滿 {fmt(c.minSpend)} 折 {fmt(c.discount)}
                  <span className="small muted">
                    {reachable ? `第 ${c.expiresDay} 天到期` : `還差 ${fmt(c.minSpend - sum.subtotal)}`}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="sum">
            <div>
              <span>商品小計</span>
              <span className="num">{fmt(sum.subtotal)}</span>
            </div>
            <div>
              <span>運費</span>
              <span className="num">$0</span>
            </div>
            <div>
              <span>折扣</span>
              <span className="num">−{fmt(sum.discount)}</span>
            </div>
            <div className="total">
              <span>總計</span>
              <span className="num">{fmt(sum.total)}</span>
            </div>
          </div>
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
          <p className="small muted">2～4 天送達</p>
        </div>
      </div>
    </>
  );
}
