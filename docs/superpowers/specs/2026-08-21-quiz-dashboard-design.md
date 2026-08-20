# 題庫體檢表與共用書架 — 設計文件

日期：2026-08-21

## 背景

`2026-08-16-quiz-bank-design.md` 把 Dashboard 規劃成題庫的編輯台：四個路由的 CRUD、透過 File System Access API 寫回 `public/data/`、只能在本機 `npm run dev` 使用。測驗區已依該文件實作完成（見 `2026-08-16-quiz-app-core.md` 計畫），Dashboard 尚未動工。

這次釐清後，Dashboard 的職責整個變了。題目由上游的 skill + LLM 生成與校對，寫進 repo 的 JSON 是**產出物而非原稿**；要改就回上游改完重出整章。前端因此不需要校對介面、不需要編輯表單、不需要匯入功能，連科目與章節的結構管理也交給上游。

**全站零寫入。**

## 本文件取代原設計的哪些部分

| 原設計 | 現況 |
|---|---|
| `/dashboard/subjects`、`/dashboard/chapters`、`/dashboard/questions/:chapterId` | 全部移除，只留單一唯讀的 `/dashboard` |
| File System Access API、IndexedDB 存資料夾 handle、權限重新請求流程 | 全部移除 |
| 「Dashboard 僅在本機 `npm run dev` 搭配資料夾授權使用」 | 不再需要，唯讀所以可隨測驗區一起公開部署 |
| 「匯出全部題庫」備份按鈕 | 移除，git 本身就是備份 |
| 「不建置正式測試套件，改用手動驗證」 | 已被實作推翻，現行 repo 是 TDD + Vitest（41 個測試），本次沿用 |

資料模型、檔案配置（`public/data/index.json` 與 `public/data/questions/<chapterId>.json`）、zod 驗證、測驗引擎的設計一律不變。

## 本次範圍

1. **共用 app shell** —— 目前不存在。`HomePage` 與 `QuizEngine` 都沒有任何 className，選題頁是裸 HTML。
2. **Dashboard 改為題庫體檢表** —— 唯讀總覽 + 完整性檢查。
3. **測驗區補上版面** —— `HomePage` 換用共用書架，`QuizEngine` 加上外框與頁首。測驗卡片內部（題幹、選項、朱批、成績單）已有完整樣式，不動。

## 設計方向：書架與目次

測驗區是「寫的那面」，Dashboard 是「收的那面」—— 同一個世界的兩個房間，不是兩棟房子。

科目是立在架上的書，左側用直排中文排書背；選一本就翻開它的目次，章節是目次裡的條目。兩區共用同一個書架與同一份目次，只是目次的欄位不同：測驗區每列是勾選框，題庫區每列是題數與狀態。

```
┌────────────────────────────────────────────────────┐
│  問答題庫                              複習 · 題庫  │
├────┬───────────────────────────────────────────────┤
│ 國 │  國文                            3 卷 · 61 題 │
│ 文 │  ─────────────────────────────────────────    │
│ ▍  │  ㄅ音錯別字              25 題                │
│    │  形近字辨析              18 題                │
│ 數 │  成語運用                ⚠ 檔案不存在         │
│ 學 │  ─────────────────────────────────────────    │
│    │  朱批                                         │
│ 歷 │  ┃ 成語運用 · 檔案不存在                      │
│ 史 │  ┃ index.json 登記了 c-chengyu，但            │
│    │  ┃ /data/questions/c-chengyu.json 抓不到。    │
└────┴───────────────────────────────────────────────┘
  書架                        目次
```

頁首兩區命名為 **複習 · 題庫**：用使用者要做的事命名，不用系統結構命名。

### 招牌元素：直排書背

這次唯一的大膽之處，理由是中文書本來就這樣上架，而科目本來就是「一卷收著很多章」。技術上是 `writing-mode: vertical-rl`，範圍侷限在導覽一處。選中的書背往內容區推出數 px、目次紙左緣貼齊它，讓「這一卷被抽出來」成為看得見的動作；過場 160ms，`prefers-reduced-motion` 下只換色不位移。

### 朱批即體檢

朱批本來就是「這裡有問題」的顏色。測驗區用朱批批改答案，題庫區用同一支筆批改資料。體檢表不是新發明的東西，是稿紙世界裡本來就有的動作。

## 視覺系統

### 色：不新增任何色票

`src/index.css` 既有的色票已經定義了這個世界。區分靠**表面層次**，不靠新顏色：

| 角色 | token | 理由 |
|---|---|---|
| 題庫區背景 | `--surface-2` | 櫃子在紙的後面，比紙暗一階 |
| 目次紙 | `--surface` | 抽出來的那一卷，浮在櫃子上 |
| 書背、選中態 | `--accent` | 沿用測驗區的松綠 |
| 體檢錯誤 | `--vermilion` | 朱批 |
| 體檢提醒 | `--ink-3` | 提醒不是錯誤，不該搶朱批的位置 |

暗色模式因此自動成立。

### 字：同一套字，兩種排法

字體不變（`--font-display` / `--font-body` / `--font-mono`），改變的是分工與密度：

- 書背科目名、目次章節名 → 襯線體。書背與目次是排版物，不是介面元件。
- 題數、日期、`chapterId` → 等寬。編目的聲音；測驗區的題號已在用等寬，語彙一致。
- 按鈕、表單、提示訊息 → 黑體。

行距是真正的對比：**測驗區 1.9（給你讀），題庫區 1.55（給你掃）**。同樣的字，寬鬆的是文章，緊的是清單。

### 版面

容器 960px 置中，書背軌 60px。窄螢幕（<640px）書架轉成頂端橫向可捲的科目條，改橫排文字 —— 手機上書是攤平拿著的，不是立在架上。

## 元件架構

| 單元 | 職責 | 依賴 |
|---|---|---|
| `AppShell` | 頁首（站名、複習/題庫切換）與容器 | react-router |
| `SubjectShelf` | 直排書背軌，受控元件 | 無（純展示） |
| `HomePage` | shell + shelf + 可勾選目次 + 開始複習 | dataLoader、quizLogic |
| `BankPage`（`/dashboard`） | shell + shelf + 題數目次 + 朱批 | dataLoader、bankHealth |
| `bankHealth.ts` | 純邏輯：吃索引與各章載入結果，吐 `Finding[]` | 無 I/O |

`SubjectShelf` 介面：

```ts
type SubjectShelfProps = {
  subjects: Subject[]          // 呼叫端負責排序
  selectedId: string | null
  onSelect: (id: string) => void
}
```

書背是一組真正的 `<button>`，tab 順序與焦點框維持正常。

### dataLoader 需要新增不丟例外的載入路徑

現行 `loadChapterQuestions` 遇到任何問題就 throw，體檢表需要的是**每一章各自的結果**而不是第一個錯誤。新增：

```ts
type RawResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: 'http' | 'json'; detail: string }

export function fetchChapterRaw(chapterId: string): Promise<RawResult>
```

schema 驗證留給 `bankHealth`，讓載入與判讀分離。既有的 `loadIndex` / `loadChapterQuestions` / `loadMergedQuestions` 不動，測驗區的行為不受影響。

### bankHealth 介面

```ts
type Finding = {
  severity: 'error' | 'warning'
  subjectId?: string
  chapterId?: string
  title: string    // 例：「成語運用 · 檔案不存在」
  detail: string   // 完整句子，指出是什麼、在哪裡
}

export function checkBank(
  index: IndexData,
  raws: Map<string, RawResult>,
): Finding[]
```

純函式、不碰 DOM、不碰網路，Vitest 直接測。

## 體檢規則

檔案由 LLM 寫入，會漂移的就是這些：

| 檢查 | 嚴重度 |
|---|---|
| 章節登記了但 JSON 抓不到（HTTP 非 2xx） | 錯誤 |
| JSON 語法壞掉 | 錯誤 |
| schema 驗證失敗（缺欄位、型別不對、選項不是 4 個） | 錯誤 |
| 檔案裡的 `chapterId` 與登記的不符 | 錯誤 |
| 章節的 `subjectId` 指向不存在的科目 | 錯誤 |
| 同一章出現重複的 `id` | 錯誤 |
| 章節有登記但零題 | 提醒 |
| 同一層級的 `order` 重號（排序結果不穩定） | 提醒 |

錯誤代表選到這章去測驗會出事；提醒代表能用但不對勁。

### 刻意不做的檢查

**孤兒檔偵測（檔案存在但沒登記在 `index.json`）做不到。** 靜態託管的前端只能 `fetch` 指定路徑，無法列出 `public/data/questions/` 的目錄內容。要做只有兩條路：build 時用 Vite plugin 掃出 manifest 給前端比對，或把資料搬進 `src/` 用 `import.meta.glob`（但那會讓題目變成 bundle 的一部分，改題目就得重 build，與現行架構衝突）。

決定先不做：需要額外的建置設定，而檔案是由 Claude Code 代寫的，順手保持 `index.json` 同步比較省事。其餘八項檢查不受影響。

## 文案

照實說話，用使用者控制的東西命名：

- 體檢無事 → 「題庫沒有問題。」
- 空章節 → 「這一章還沒有題目。」空畫面是陳述，不是錯誤。
- 錯誤訊息指出是什麼、在哪裡，不道歉、不含糊：「`c-chengyu.json` 的第 3 題缺少 `answerIndex`。」
- 同一個東西從頭到尾同一個詞：頁首寫「題庫」，頁面標題就寫「題庫」。

## 錯誤處理

- `index.json` 本身抓不到或格式錯 → 整頁顯示單一朱批，說明索引壞了；此時書架無法繪製，不嘗試部分渲染。
- 個別章節出問題 → 該列標記狀態，詳情列在朱批區；其餘章節照常顯示題數。
- 測驗區（`HomePage`）沿用現行行為：載入失敗顯示錯誤訊息。體檢是題庫區的職責，不往測驗區塞。

## 樣式重複的取捨

朱批的視覺（朱紅左邊線 + `--surface-2` 底）在 `quiz.css` 的 `.note` 已經有了。題庫區不 import `quiz.css` —— 那會讓 Dashboard 耦合到測驗模組。改在 `bank.css` 用相同 token 寫一份，重複的是四行宣告，換來零耦合；兩者未來也可能各自演化（批改答案 vs 標記資料）。若出現第三個使用者再抽共用元件。

## 測試方式

沿用現行 TDD + Vitest：

- `bankHealth.test.ts` —— 九條規則各自的通過與失敗案例、多重問題並存、空題庫。純函式，是測試密度最高的地方。
- `dataLoader.test.ts` —— 補 `fetchChapterRaw` 的 404、非法 JSON、正常三種路徑。
- `SubjectShelf.test.tsx` —— 渲染科目、點擊回呼、選中狀態。
- `BankPage.test.tsx` —— 有問題時朱批出現且指出章節、無問題時顯示「題庫沒有問題」。
- `HomePage.test.tsx` —— 既有三個測試需隨書架改版調整，行為（跨科目重置、合併題目、未選停用）不得改變。

視覺本身（直排、位移、行距）不寫自動化測試，以 `npm run dev` 目視確認，包含窄螢幕與暗色模式。

## 明確排除

- 任何寫入行為：新增、編輯、刪除、匯入、匯出。
- 科目與章節的結構管理。
- 孤兒檔偵測（理由見上）。
- 測驗卡片內部的視覺調整 —— 題幹、選項、朱批、成績單維持現狀。
