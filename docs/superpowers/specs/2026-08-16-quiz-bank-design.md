# 問答題庫網站 — 設計文件

日期：2026-08-16

## 背景與目標

想做一個個人用的問答題庫練習網站。主要有兩塊需求：

1. **測驗頁**：仿照參考 artifact（一個以「稿紙」視覺風格呈現的單頁測驗：進度格、鍵盤 1-4/A-D 作答、即時批改、朱批解析、成績單、錯題回顧）的互動體驗，但題目內容要能任意抽換。
2. **管理 Dashboard**：題庫依「科目」「章節」分層管理，可以在同一科目內複選多個章節做總複習。

核心訴求是前端測驗邏輯要盡可能通用（generic），題目本身透過「題庫」擴充，而不是把題目寫死在頁面程式碼裡（參考 artifact 目前就是把 25 題硬編在 `QS` 陣列中，這次要把它變成可持續擴充的資料驅動系統）。

使用者只有自己一人，不需要帳號/權限機制。整個系統不要後端、不要資料庫 —— 純前端＋靜態 JSON 檔案即可。

## 架構總覽

單一個 **Vite + React + TypeScript** 的純前端 SPA，無後端、無資料庫。應用內分兩個區域：

- **測驗區**（`/`、`/quiz`）：唯讀，之後可用 GitHub Pages / Vercel 等靜態託管公開部署。
- **Dashboard 區**（`/dashboard/*`）：只在本機 `npm run dev` 使用，負責題庫的增刪改。

### 資料寫入機制：File System Access API

Dashboard 透過瀏覽器的 File System Access API（`window.showDirectoryPicker()` / `FileSystemFileHandle.createWritable()`）直接讀寫本機的 `/data` 資料夾，不需要另外架後端或 API route：

- 第一次進 Dashboard 時按「連結題庫資料夾」，授權存取專案的 `/data` 目錄。
- 授權後的資料夾 handle 存進 IndexedDB，下次開啟時嘗試沿用（必要時重新跟瀏覽器要求權限，避免每次都要重新選資料夾）。
- 之後所有新增/編輯/刪除操作直接寫回對應的 JSON 檔案。使用者自行 `git commit` 這些變動、部署時就會帶到最新題目。
- 僅 Chromium 系瀏覽器（Chrome/Edge）支援此 API；Firefox/Safari 不支援。因為是個人工具且使用者在 Windows 上，這個限制可接受。若偵測到瀏覽器不支援，Dashboard 顯示明確提示，並退回「唯讀瀏覽＋手動匯出 JSON」模式。

這個設計的好處：完全符合「純前端＋靜態 JSON」的要求，且因為公開部署後的網站沒有資料夾授權，陌生人拿到網址也無法寫入你的題庫 —— 安全性是架構上天生保證的，不需要額外做登入機制。

## 資料模型

```ts
type Subject = { id: string; name: string; order: number }
type Chapter = { id: string; subjectId: string; name: string; order: number }
type Question = {
  id: string
  chapterId: string
  tag?: string          // 小分類標籤，例如「弊／蔽／敝／蹩」
  stem: string           // 題幹，可含簡單強調標記（對應參考頁的 <em>）
  options: [string, string, string, string]
  answerIndex: number     // 0-3
  explanation: string     // 作答後顯示的解析
}
```

檔案配置：

- `/data/index.json` — `{ subjects: Subject[]; chapters: Chapter[] }`，科目與章節的階層索引。
- `/data/questions/<chapterId>.json` — 該章節的 `Question[]`。

一章一檔的理由：新增章節＝加一個新 JSON 檔＋登記進 `index.json`；複習時只需抓取被選中章節對應的檔案，不必載入整包題庫；git diff 時每次異動範圍小、容易檢視。

資料載入時用輕量 schema 驗證（建議用 `zod`）檢查每份 JSON 是否符合上述型別；若某個章節檔案格式有誤，畫面上明確標示是哪個章節壞掉，而不是讓整個 App 白屏。

## 泛化的測驗引擎

把參考 artifact 的互動邏輯抽成通用元件 `<QuizEngine questions={Question[]} title />`：

- 進度格（每題一格，作答後標記對/錯，目前題目高亮）
- 鍵盤操作：1-4 / A-D 選答，Enter 或 → 進下一題
- 作答後即時上色（正解綠、錯選紅、其餘淡化）、顯示解析欄
- 結束後顯示成績單（答對率、簡短評語）與錯題回顧列表
- 「再測一次」重置狀態

`QuizEngine` 是純粹依賴 props 的展示/狀態元件，完全不知道「科目」「章節」的存在 —— 只吃一份標準化的 `Question[]`。這是泛化的核心：未來題庫怎麼擴充，這個元件都不用改。視覺風格（稿紙格線、色票、字體）沿用參考頁的 CSS 變數系統，抽成共用樣式。

### 選題頁（首頁 `/`）

流程：先選一個科目 → 顯示該科目底下的章節清單（checkbox，含「全選」）→ 複選任意數量章節 → 按「開始複習」。

- 章節複選範圍限定在**同一科目內**（不支援跨科目混合，依使用者需求簡化）。
- 「開始複習」把選到的章節對應的題目檔案合併、預設隨機排序（可用一個 toggle 關閉），透過 React Router 的 navigation state 把題目陣列帶到 `/quiz`，由 `QuizEngine` 渲染。
- 未選任何章節時「開始複習」按鈕停用。

## Dashboard

- `/dashboard` — 科目/章節總覽 + 各章節題數統計、「連結題庫資料夾」授權按鈕、「匯出全部題庫」備份按鈕（打包成單一 JSON 下載，避免手滑弄丟資料）。
- `/dashboard/subjects` — 新增／改名／排序／刪除科目。
- `/dashboard/chapters` — 新增／改名／排序／刪除章節（隸屬於某科目）。
- `/dashboard/questions/:chapterId` — 該章節題目列表（含簡短預覽）＋新增/編輯表單（題幹、tag、4 個選項、正解單選、解析）、刪除。

因為只有使用者本人使用，Dashboard 不做登入/權限機制。

## 錯誤處理

- 瀏覽器不支援 File System Access API → 顯示提示、退回唯讀模式。
- 尚未授權資料夾就進入需要寫入的頁面 → 導引使用者先完成授權。
- 資料夾權限在瀏覽器重啟後失效 → 嘗試用已儲存的 handle 重新請求權限，僅在必要時才彈出授權提示。
- JSON 格式錯誤（例如手動改壞檔案）→ 用 schema 驗證擋下，標示出問題的章節檔案。

## 部署方式

`vite build` 產出的靜態檔案部署到 GitHub Pages / Vercel 等靜態託管，測驗頁公開可用；Dashboard 僅在本機 `npm run dev` 搭配資料夾授權使用，編輯完成後由使用者自行 commit / push，重新部署後題庫更新即生效。

## 測試 / 驗證方式

個人工具，不建置正式測試套件，改用手動驗證流程：

1. 建立範例科目/章節/題目資料，啟動 `npm run dev`。
2. 選題頁：確認同科目內可複選章節、合併後題數正確、未選章節時按鈕停用。
3. 測驗頁：逐題作答，確認鍵盤操作、對錯上色、解析顯示、進度格、結尾成績單與錯題回顧皆與參考 artifact 行為一致。
4. Dashboard：授權資料夾後，新增/編輯/刪除科目、章節、題目，確認對應 JSON 檔案內容同步更新，重新整理選題頁後題數/內容跟著變動。

若之後需要自動化測試，`QuizEngine` 內的純邏輯（合併、隨機排序、計分）適合用 Vitest 補上單元測試，但不在本次範圍內。
