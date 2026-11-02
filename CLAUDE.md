# shop-sim — 網購模擬器

讓玩家滿足網購慾望的網頁遊戲：逛商城、下單、等到貨、開箱、收藏、轉賣、每日簽到領零用錢、收郵件領禮物。
目前只有買家模式＋養蠶小遊戲；之後可能加入賣家模式、更多小遊戲、購物節大促、排行榜。

## 指令
| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 http://localhost:5173（存檔後自動更新） |
| `npm test` | 執行一次所有測試（Vitest） |
| `npm run test:watch` | 監看模式，改檔自動重跑 |
| `npm run build` | 型別檢查 + production build |
| `npm run lint` | oxlint |

改完程式碼至少要跑 `npm test` 和 `npm run build`；兩個都過才算完成。

## 技術
TypeScript + React + Vite、Vitest。沒有後端，存檔放在 localStorage。之後會部署到 GitHub Pages。

## 檔案地圖
```
src/
  core/                 遊戲邏輯（純 TypeScript）
    config.ts           ★ 所有遊戲數值（價格波動、簽到獎勵、到貨天數…）
    types.ts            型別：GameState、Order、GameEvent、RejectReason…
    actions.ts          玩家能做的所有 action
    reducer.ts          (state, action) => newState；新遊戲 createInitialState(seed)
    market.ts           每日價格、限時特價、優惠券掉落
    orders.ts           物流狀態（由日期推算）、取消與退貨的退款計算（優惠券依比例分攤）
    inventory.ts        玩家擁有的物品
    silk.ts             養蠶小遊戲：買卵、餵食、摸摸、依現實日期成長（syncSilk）、加速券、放飛
    mail.ts             郵件：公告信、隨機來信、里程碑來信（reducer 每個成功的 action 後檢查）、領取附件
    income/             收入來源（checkin.ts 每日簽到、resale.ts 轉賣、silk.ts 賣蠶繭）；都透過 earn() 入帳
    catalog.ts          查詢商品資料
    rng.ts              seeded 亂數
    index.ts            core 對外的唯一出口
    __tests__/          單元測試
  data/products.ts      商品清單（虛構品牌）
  data/silkBreeds.ts    蠶寶寶品種（抽中機率由 rarity 決定）
  data/mail.ts          郵件內容：公告信、隨機信、里程碑信
  save.ts               存檔／讀檔（唯一碰 localStorage 的地方）、存檔版本與轉換
  __tests__/            core 以外的測試（目前是 save.test.ts）
  ui/                   React 畫面
    App.tsx             遊戲狀態、分頁、通知、自動存檔、重新開始
    format.ts           金額格式、事件與錯誤代碼 → 中文訊息
    ConfirmDialog.tsx   通用確認視窗（危險操作前使用）
    UnboxModal.tsx      開箱動畫
    SilkwormSvg.tsx     蠶寶寶造型（SVG，依品種顏色和階段畫卵／幼蟲／繭／蛾）
    views/              各分頁畫面
    styles.css          全部樣式（CSS 變數定義在 :root）
```

## 架構規則（必須遵守）
- **`src/core/` 不能 import React 或瀏覽器 API**（localStorage、window、Date.now 等）。需要的值由 UI 傳入，例如 seed、簽到用的當地日期。
- **遊戲數值一律放在 `src/core/config.ts`**，不要把數字寫死在邏輯裡。新增數值時加上中文註解說明單位和意義。
- **所有遊戲狀態的改變都要經過 action → reducer**；state 不可直接修改（immutable，用展開運算子建立新物件）。
- **亂數只能用 `rng.ts`**，不要呼叫 `Math.random()`，這樣同一個 seed 的結果才能重現與測試。
- **UI 只從 `src/core/index.ts` import**，不要直接 import core 裡的其他檔案。
- **只有 `src/save.ts` 可以存取 localStorage**，而且每次存取都要包 try/catch（無痕模式或空間不足時會丟出錯誤）。
- **UI 不寫遊戲規則**：只負責顯示和送出 action。要顯示的計算結果（例如購物車總額）由 core 提供函式。
- **給玩家看的文字放在 UI**：core 只回傳代碼（`GameEvent`、`RejectReason`），由 `ui/format.ts` 轉成中文。
- 商品使用原創的虛構品牌與名稱，不使用真實電商平台的名稱或商標。

## 慣例
- 金額用整數（新台幣元），不用浮點數；需要四捨五入時用 `round10()`。
- 型別只 import 型別時用 `import type`（專案開了 `verbatimModuleSyntax`）。
- 不使用 `enum`、`namespace`（專案開了 `erasableSyntaxOnly`），改用字串聯集型別。
- core 新增或修改功能時，同時在 `src/core/__tests__/` 加測試；測試用 `helpers.ts` 的 `run()`，它會凍結 state，順便檢查 reducer 有沒有直接修改 state。
- 測試名稱用中文描述行為，例如「錢不夠不能結帳，狀態不變」。

## 常見擴充步驟

### 調整遊戲數值
只改 `src/core/config.ts`。改完跑 `npm test`，有些測試會依數值計算，可能需要跟著更新。

### 新增商品
在 `src/data/products.ts` 加一筆。`id` 用英文 kebab-case 而且不能重複；`category` 必須是 `types.ts` 裡 `Category` 的其中一個。
新增分類時，`types.ts` 的 `Category` 和 `ui/views/ShopView.tsx` 的 `CATEGORIES` 兩邊都要加。

### 新增玩家行為（action）
1. `actions.ts`：在 `Action` 聯集加一個型別
2. `reducer.ts`：在 `switch` 加一個 case（TypeScript 會檢查有沒有漏掉）
3. 需要新的錯誤或通知時，在 `types.ts` 加 `RejectReason` 或 `GameEvent`，再到 `ui/format.ts` 加對應的中文
4. 在 `__tests__/` 加測試
5. UI 透過 `act({ type: '...' })` 呼叫

### 新增收入來源（例如小遊戲）
1. `types.ts`：在 `IncomeSource` 加上新名稱
2. `income/` 新增檔案，計算金額後呼叫 `earn(state, source, amount)`
3. 照上面「新增玩家行為」的步驟加 action
4. `ui/format.ts` 的 `income` 事件加上對應文字

### 新增畫面（分頁）
1. `ui/views/` 新增元件，props 接收 `state` 和 `act`
2. `ui/Tabs.tsx`：在 `Tab` 型別和 `TABS` 陣列加一筆
3. `ui/App.tsx`：加上 `{tab === '...' && <NewView ... />}`

### 修改 GameState 結構（新增、刪除、改名欄位）
玩家瀏覽器裡已經有舊格式的存檔，不處理的話舊存檔會被丟棄、玩家進度消失。
照 `src/save.ts` 開頭註解的 4 個步驟做：
1. `SAVE_VERSION` 加 1
2. 在 `MIGRATIONS` 加一個「舊版 → 新版」的轉換函式（例如補上新欄位的預設值）
3. 新欄位是必要欄位的話，更新 `looksLikeGameState()`
4. 在 `src/__tests__/save.test.ts` 加測試，確認舊版存檔能轉換成功

### 寄一封公告／禮物信給所有玩家
1. 在 `src/data/mail.ts` 的 `ANNOUNCEMENTS` 加一筆：`id` 用新的英文 kebab-case（上線後不能改、不能重複），`availableFrom` 填開放日期 `'YYYY-MM-DD'`（玩家當地的現實日期）
2. `rewards` 可以放 `money`、`coupon`、`silk`（桑葉／蠶卵／精選蠶卵／加速券）、`product`（實體商品）
3. `npm test`（會檢查 id 不重複、商品存在）→ push 部署。玩家在開放日期當天或之後打開網頁就會收到，每封只寄一次。

不用改存檔版本：存檔只記錄已寄過的 `id`。

### 危險操作（刪除進度、清空資料）
一律先用 `ui/ConfirmDialog.tsx` 跟玩家確認，訊息要寫清楚會刪除什麼。不要用 `window.confirm()`。
