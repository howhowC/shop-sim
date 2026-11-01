export type Tab = 'shop' | 'cart' | 'orders' | 'room' | 'resale' | 'checkin' | 'silk';

const TABS: readonly [Tab, string][] = [
  ['shop', '商城'],
  ['cart', '購物車'],
  ['orders', '訂單'],
  ['room', '我的房間'],
  ['resale', '二手市場'],
  ['checkin', '每日簽到'],
  ['silk', '養蠶'],
];

interface Props {
  current: Tab;
  onChange: (t: Tab) => void;
  ordersDot: boolean;
}

export function Tabs({ current, onChange, ordersDot }: Props) {
  return (
    <nav className="tabs" aria-label="主選單">
      <div className="wrap tabs-row">
        {TABS.map(([key, label]) => (
          <button key={key} aria-current={current === key} onClick={() => onChange(key)}>
            {label}
            {key === 'orders' && ordersDot && <span className="dot" aria-label="有包裹待開箱" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
