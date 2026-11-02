import type { ReactNode } from 'react';
import type { GameState } from '../core';
import { fmt } from './format';

interface Props {
  state: GameState;
  cartCount: number;
  mailCount: number;
  query: string;
  onQuery: (q: string) => void;
  onCart: () => void;
  onMail: () => void;
  onNextDay: () => void;
  children: ReactNode;
}

export function Header({ state, cartCount, mailCount, query, onQuery, onCart, onMail, onNextDay, children }: Props) {
  return (
    <header className="top">
      <div className="wrap top-row">
        <div className="logo">
          <b>鈺</b>鈺鈺商城
        </div>
        <label className="search">
          <input
            id="search"
            type="search"
            placeholder="搜尋商品，例如：耳機"
            aria-label="搜尋商品"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <div className="stats">
          <span className="pill">
            第 <span className="num">{state.day}</span> 天
          </span>
          <span className="pill">
            錢包 <span className="num">{fmt(state.money)}</span>
          </span>
          <button className="btn ghost cartbtn" onClick={onMail} aria-label={`郵件，${mailCount} 封未領取`}>
            📮
            {mailCount > 0 && <span className="badge">{mailCount}</span>}
          </button>
          <button className="btn ghost cartbtn" onClick={onCart}>
            購物車
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
          <button className="btn" onClick={onNextDay}>
            睡覺，進入下一天
          </button>
        </div>
      </div>
      {children}
    </header>
  );
}
