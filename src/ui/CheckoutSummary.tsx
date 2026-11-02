import type { Coupon, Money } from '../core';
import { fmt } from './format';

interface Props {
  /** 還沒過期的優惠券 */
  coupons: readonly Coupon[];
  couponId: string | undefined;
  onCoupon: (id: string | undefined) => void;
  subtotal: Money;
  discount: Money;
  total: Money;
  /** 同一頁有兩組選擇時，radio 的 name 要不同 */
  name?: string;
}

/** 選優惠券＋金額小計；主商城和養蠶小店的購物車共用 */
export function CheckoutSummary({ coupons, couponId, onCoupon, subtotal, discount, total, name = 'coupon' }: Props) {
  return (
    <>
      <fieldset className="coupons">
        <legend className="small muted">優惠券</legend>
        <label className="coupon">
          <input type="radio" name={name} checked={couponId === undefined} onChange={() => onCoupon(undefined)} />
          不使用
        </label>
        {coupons.map((c) => {
          const reachable = subtotal >= c.minSpend;
          return (
            <label className="coupon" key={c.id}>
              <input type="radio" name={name} checked={couponId === c.id} disabled={!reachable} onChange={() => onCoupon(c.id)} />
              滿 {fmt(c.minSpend)} 折 {fmt(c.discount)}
              <span className="small muted">{reachable ? `第 ${c.expiresDay} 天到期` : `還差 ${fmt(c.minSpend - subtotal)}`}</span>
            </label>
          );
        })}
      </fieldset>
      <div className="sum">
        <div>
          <span>商品小計</span>
          <span className="num">{fmt(subtotal)}</span>
        </div>
        <div>
          <span>運費</span>
          <span className="num">$0</span>
        </div>
        <div>
          <span>折扣</span>
          <span className="num">−{fmt(discount)}</span>
        </div>
        <div className="total">
          <span>總計</span>
          <span className="num">{fmt(total)}</span>
        </div>
      </div>
    </>
  );
}
