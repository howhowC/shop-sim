import { useCallback, useRef, useState } from 'react';
import { createInitialState, getOrderStatus, isOrderCancelled, reducer } from '../core';
import type { Action, GameState } from '../core';
import { clearSave, loadGame, saveGame } from '../save';
import { ConfirmDialog } from './ConfirmDialog';
import { eventText } from './format';
import { Header } from './Header';
import { Tabs, type Tab } from './Tabs';
import { Toast } from './Toast';
import { UnboxModal } from './UnboxModal';
import { CartView } from './views/CartView';
import { OrdersView } from './views/OrdersView';
import { ResaleView } from './views/ResaleView';
import { RoomView } from './views/RoomView';
import { ShopView } from './views/ShopView';
import { CheckInView } from './views/CheckInView';
import { SilkView } from './views/SilkView';

export default function App() {
  // 有存檔就接著玩，沒有就開新遊戲
  const [state, setState] = useState<GameState>(() => loadGame() ?? newGame());
  const [tab, setTab] = useState<Tab>('shop');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [unboxing, setUnboxing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const toastId = useRef(0);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const saveWarned = useRef(false);

  const showToast = useCallback((text: string) => setToast({ text, id: ++toastId.current }), []);
  const clearToast = useCallback(() => setToast(null), []);

  // 每個 action 都在使用者操作當下算出新狀態，並把 core 回傳的 events 轉成通知
  const act = (a: Action) => {
    const next = reducer(state, a);
    setState(next);
    const messages = next.events.map(eventText);
    // 每個動作後自動存檔；失敗時（例如無痕模式）只提醒一次
    if (!saveGame(next) && !saveWarned.current) {
      saveWarned.current = true;
      messages.unshift('無法存檔：瀏覽器封鎖了網站資料，關閉頁面後進度會消失');
    }
    if (messages.length > 0) showToast(messages.join('；'));
    if (next.events.some((e) => e.type === 'orderPlaced')) setTab('orders');
  };

  const restart = () => {
    clearSave();
    const fresh = newGame();
    setState(fresh);
    saveGame(fresh);
    setTab('shop');
    setQuery('');
    setCategory('全部');
    setConfirmRestart(false);
    showToast('已開始新遊戲');
  };

  const waitingToOpen = state.orders.some((o) => !o.opened && !isOrderCancelled(o) && getOrderStatus(o, state.day) === 'delivered');
  const cartCount = Object.values(state.cart).reduce((a, b) => a + b, 0);

  return (
    <>
      <Header
        state={state}
        cartCount={cartCount}
        query={query}
        onQuery={(q) => {
          setQuery(q);
          setTab('shop');
        }}
        onCart={() => setTab('cart')}
        onNextDay={() => act({ type: 'nextDay' })}
      >
        <Tabs current={tab} onChange={setTab} ordersDot={waitingToOpen} />
      </Header>

      <main className="wrap main">
        {tab === 'shop' && (
          <ShopView
            state={state}
            query={query}
            category={category}
            onCategory={setCategory}
            onAdd={(id, name) => {
              act({ type: 'addToCart', productId: id });
              showToast(`已加入購物車：${name}`);
            }}
          />
        )}
        {tab === 'cart' && <CartView state={state} act={act} onBrowse={() => setTab('shop')} />}
        {tab === 'orders' && <OrdersView state={state} act={act} onUnbox={setUnboxing} />}
        {tab === 'room' && <RoomView state={state} />}
        {tab === 'resale' && <ResaleView state={state} act={act} />}
        {tab === 'checkin' && <CheckInView state={state} act={act} onSilk={() => setTab('silk')} />}
        {tab === 'silk' && <SilkView state={state} act={act} />}
      </main>

      <footer className="wrap foot">
        <span className="muted small">進度會自動存在這個瀏覽器裡</span>
        <button className="btn ghost small" onClick={() => setConfirmRestart(true)}>
          重新開始
        </button>
      </footer>

      {unboxing && (
        <UnboxModal
          order={state.orders.find((o) => o.id === unboxing)!}
          onOpen={() => act({ type: 'unboxOrder', orderId: unboxing })}
          onClose={() => {
            setUnboxing(null);
            setTab('room');
          }}
          onBack={() => setUnboxing(null)}
        />
      )}
      {confirmRestart && (
        <ConfirmDialog
          title="重新開始？"
          message={`目前第 ${state.day} 天的進度、錢包、訂單和房間裡的物品都會刪除，無法復原。`}
          confirmLabel="刪除進度並重新開始"
          onConfirm={restart}
          onCancel={() => setConfirmRestart(false)}
        />
      )}
      {toast && <Toast key={toast.id} text={toast.text} onDone={clearToast} />}
    </>
  );
}

function newGame(): GameState {
  return createInitialState(Date.now() >>> 0);
}
