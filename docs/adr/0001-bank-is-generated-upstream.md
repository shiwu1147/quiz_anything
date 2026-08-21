# 題庫由上游生成，前端完全唯讀

題目與題庫結構都由上游的 skill + LLM 產生與校對，寫進 `public/data/` 的 JSON 是產出物而非原稿；要修改就回上游改完、重出整章。因此前端不做任何寫入 —— 沒有編輯表單、沒有匯入、沒有科目與章的增刪改。

## Considered Options

原設計（`docs/superpowers/specs/2026-08-16-quiz-bank-design.md`）走的是相反的路：一個能編輯題庫的 Dashboard，透過瀏覽器的 File System Access API 直接讀寫本機 `public/data/`，資料夾 handle 存進 IndexedDB，並因為需要授權而限定只能在本機 `npm run dev` 使用。

那套架構整個被這個決定刪掉了：File System Access API、IndexedDB handle、權限重新請求流程、Dashboard 的 dev-only 限制，全部不再需要。

## Consequences

未來讀者會看到一個路由叫 `/bank`、頁面標題叫「題庫」、卻不能修改任何東西的頁面，並合理地懷疑功能是不是沒做完。它是刻意的：這一區的職責是**檢查**題庫，不是維護題庫。

因為沒有寫入，這一區也不再需要藏起來，可以隨測驗區一起公開部署。
