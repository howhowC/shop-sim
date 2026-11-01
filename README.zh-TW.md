# 鈺鈺商城 — 網購模擬器

[English](README.md) | **繁體中文**

一款滿足網購慾望的網頁遊戲：逛一間每天價格都在變動的商城、搶限時特價、結帳、追蹤物流、開箱，再把買到的東西擺滿你的房間。錢不夠時可以每日簽到領零用錢，或把手上的東西拿去二手市場轉賣。

**▶ 立即遊玩：** https://howhowc.github.io/shop-sim/

![商城頁面截圖](docs/screenshot.png)

## 功能

- **會變動的市場**：每過一天，價格在 ±10% 內波動，隨機一件商品限時特價，還可能拿到優惠券。
- **真實的下單流程**：購物車 → 選優惠券 → 結帳 → *已下單 → 已出貨 → 配送中 → 已送達*（2～4 天）。
- **開箱**：包裹送達後播放開箱動畫，物品會放進房間。
- **我的房間**：收藏越多，架子擺得越滿。
- **賺錢方式**：依現實日期每日簽到，連續簽到獎勵越多；二手市場轉賣，限量品放越久越值錢。
- **自動存檔**：每個動作後自動存在瀏覽器，存檔有版本號。
- 支援淺色／深色主題，手機也能玩。

## 技術

TypeScript · React · Vite · Vitest · oxlint · GitHub Pages

## 架構

遊戲邏輯和畫面完全分開。之後加入新玩法（例如賣家模式）或換一套前端，都能沿用同一份遊戲邏輯。

```mermaid
flowchart LR
  UI["React 畫面<br/>src/ui"] -- "Action" --> R["reducer<br/>src/core"]
  R -- "新的 GameState + 事件" --> UI
  UI -- "存檔／讀檔" --> S["save.ts<br/>localStorage"]
  R --> M["market · orders<br/>income · inventory"]
  M --> C["config.ts<br/>遊戲數值"]
```

主要設計決策：

| 決策 | 原因 |
|---|---|
| `src/core` 是純 TypeScript，不依賴 React 或瀏覽器 API | 邏輯可以單獨做單元測試，也能給任何前端使用 |
| 所有狀態變化都是 `Action`，由 immutable 的 `reducer` 處理 | 遊戲規則集中在一個地方，新增行為很容易 |
| 使用可指定 seed 的亂數（Mulberry32），不用 `Math.random()` | 同樣的 seed 加同樣的操作，結果完全相同：亂數可以測試，讀檔也能精確接續 |
| core 只回傳事件與錯誤的**代碼**，由 UI 轉成文字 | 規則跟語言無關，之後加翻譯不用動到邏輯 |
| 所有平衡數值集中在 `config.ts` | 調整難度只要改一個檔案 |
| 存檔帶有版本號和轉換函式 | 之後修改狀態結構，不會讓玩家的進度消失 |
| 物流狀態由日期推算，不另外儲存 | 少一份要同步的狀態，就不會出現不一致 |

## 在本機執行

需要 Node.js 22.12 以上。

```bash
npm install
npm run dev        # http://localhost:5173
```

| 指令 | 說明 |
|---|---|
| `npm run dev` | 啟動開發伺服器 |
| `npm test` | 執行一次所有單元測試 |
| `npm run test:watch` | 檔案變動時自動重跑測試 |
| `npm run build` | 型別檢查並建置正式版 |
| `npm run lint` | 用 oxlint 檢查程式碼 |

## 專案結構

```
src/
  core/        遊戲邏輯（純 TypeScript）與單元測試
    config.ts  所有遊戲數值
  data/        商品資料（虛構品牌）
  ui/          React 元件與樣式
  save.ts      有版本號的存檔／讀檔（localStorage）
```

## 未來規劃

- [ ] 小遊戲賺外快（新的收入來源）
- [ ] 購物節活動（全站特價）
- [ ] 收藏成就
- [ ] 賣家模式
- [ ] 排行榜（Python / FastAPI 後端）

---

遊戲中所有商店、品牌與商品皆為虛構。
