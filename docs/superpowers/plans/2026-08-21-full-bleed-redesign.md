# 全幅版面改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已實作但被推翻的版面換掉 —— 960px 容器改成全幅、左側直欄書架改成頂端橫排、單欄目次改成多欄、加上右側書眉欄，並修掉在中文下偏小的字級。

**Architecture:** 版面決策（書架密度、目次欄數）抽成 `layout.ts` 的純函式，不埋在 JSX 裡，這樣稀疏狀態的門檻可以被測試。新增兩個只管骨架不管內容的元件（`MarginColumn`、`ChapterToc`），兩區共用。題庫區與選題頁的載入流程相同，抽成 `loadBankSnapshot()`。測驗頁的三欄由 `QuizEngine` 自己擁有（狀態在它身上），`QuizPage` 只負責套 shell。

**Tech Stack:** Vite、React 18、TypeScript、react-router-dom v6、zod v3、Vitest、@testing-library/react、jsdom。

**Spec:** `docs/superpowers/specs/2026-08-21-quiz-dashboard-design.md`

**詞彙:** 依 `CONTEXT.md` —— 題庫、科目、章、題、朱批。**不得**出現「卷」「章節」「Dashboard」「體檢表」。

## Global Constraints

- **全站零寫入。** 不得引入任何修改 `public/data/` 的程式碼。
- **不新增任何色票。** 只能用 `src/index.css` 既有 token。
- 題庫區背景 `--surface-2`，目次紙與書眉欄 `--surface`，錯誤 `--vermilion`，提醒 `--ink-3`。
- 字體分工：書背與章名用 `--font-display`；題數、id、統計數字用 `--font-mono`；介面用 `--font-body`。
- 行距：複習區 1.9，題庫區 1.55。
- **不設 `max-width`**（測驗題卡除外，它是 `68ch`）。容器左右留 `clamp(1rem, 3vw, 2.5rem)`。
- 書背 88 × 140px；科目 ≤2 時加寬至 160px。書眉欄固定 300px。
- 書背用 `writing-mode: vertical-rl`，必須是真 `<button>`，`:focus-visible` 要有可見外框。
- 選中書背 `transform: translateY(6px)`、過場 160ms；`prefers-reduced-motion: reduce` 下不得位移。
- **`body` 不得寫 px**，一律 `1rem`。次級文字下限 `.875rem`。
- **不得使用 `clamp()` 做字級。** 視窗級距只用 `@media (min-width: 1600px) { :root { font-size: 112.5% } }`。
- 題庫區不得 import `src/components/quiz/quiz.css`。
- CSS class 前綴：`sh-` shell、`hm-` home、`bk-` bank、`quiz-` 測驗版面。不得與 `quiz.css` 既有的 `.card` `.rail` `.opt` `.note` `.bar` `.score` `.review` 撞名。
- 頁面在任何寬度都不得出現橫向捲軸。
- 每個 task 結束前跑 `npm test`，全綠才 commit。現有 73 個測試不得無故變紅。

---

## Task 1: 路由與名稱收斂

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/shell/AppShell.tsx`
- Test: `src/components/shell/AppShell.test.tsx`
- Test: `src/pages/BankPage.test.tsx`

**Interfaces:**
- Produces: 題庫區的路由固定為 `/bank`。後續所有 task 的導覽連結都指向它。

程式碼已經統一講 `bank`（`BankPage`、`bankHealth`、`bank.css`、`zone="bank"`），只有路由字串沒跟上。

- [ ] **Step 1: 改測試（先讓它紅）**

`src/components/shell/AppShell.test.tsx` 裡兩處：

```tsx
    expect(screen.getByRole('link', { name: '題庫' })).toHaveAttribute('href', '/bank')
```

```tsx
    const { container } = renderShell('bank', '/bank')
```

`src/pages/BankPage.test.tsx` 的 `renderBank`：

```tsx
    <MemoryRouter initialEntries={['/bank']}>
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/shell/AppShell.test.tsx`
Expected: FAIL，`href` 是 `/dashboard` 而非 `/bank`。

- [ ] **Step 3: 改實作**

`src/components/shell/AppShell.tsx`：

```tsx
            <NavLink to="/bank" className={navClass}>題庫</NavLink>
```

`src/App.tsx`：

```tsx
        <Route path="/bank" element={<BankPage />} />
```

- [ ] **Step 4: 確認沒有殘留**

Run: `grep -rn "dashboard" src/`
Expected: 沒有輸出。

- [ ] **Step 5: 跑完整測試**

Run: `npm test`
Expected: PASS，73 個測試。

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/shell/AppShell.tsx src/components/shell/AppShell.test.tsx src/pages/BankPage.test.tsx
git commit -m "refactor: rename the bank route from /dashboard to /bank"
```

---

## Task 2: 版面決策的純函式

**Files:**
- Create: `src/lib/layout.ts`
- Test: `src/lib/layout.test.ts`

**Interfaces:**
- Produces:
  - `type ShelfDensity = 'wide' | 'normal'`
  - `shelfDensity(subjectCount: number): ShelfDensity`
  - `tocColumns(chapterCount: number): 1 | 2 | 3`

  Task 4 用 `shelfDensity`，Task 5 用 `tocColumns`。

門檻直接抄自 spec 的稀疏狀態表：科目 ≤2 → `wide`；章 ≤6 → 1 欄、7–14 → 2 欄、≥15 → 3 欄。

- [ ] **Step 1: 寫失敗測試**

建立 `src/lib/layout.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { shelfDensity, tocColumns } from './layout'

describe('shelfDensity', () => {
  it('widens the spines for two subjects or fewer', () => {
    expect(shelfDensity(0)).toBe('wide')
    expect(shelfDensity(1)).toBe('wide')
    expect(shelfDensity(2)).toBe('wide')
  })

  it('keeps the normal spine width from three subjects up', () => {
    expect(shelfDensity(3)).toBe('normal')
    expect(shelfDensity(6)).toBe('normal')
    expect(shelfDensity(20)).toBe('normal')
  })
})

describe('tocColumns', () => {
  it('uses one column up to six chapters', () => {
    expect(tocColumns(0)).toBe(1)
    expect(tocColumns(1)).toBe(1)
    expect(tocColumns(6)).toBe(1)
  })

  it('uses two columns from seven to fourteen chapters', () => {
    expect(tocColumns(7)).toBe(2)
    expect(tocColumns(10)).toBe(2)
    expect(tocColumns(14)).toBe(2)
  })

  it('uses three columns from fifteen chapters up', () => {
    expect(tocColumns(15)).toBe(3)
    expect(tocColumns(40)).toBe(3)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/layout.test.ts`
Expected: FAIL，找不到模組 `./layout`。

- [ ] **Step 3: 寫實作**

建立 `src/lib/layout.ts`：

```ts
export type ShelfDensity = 'wide' | 'normal'

export function shelfDensity(subjectCount: number): ShelfDensity {
  return subjectCount <= 2 ? 'wide' : 'normal'
}

export function tocColumns(chapterCount: number): 1 | 2 | 3 {
  if (chapterCount <= 6) return 1
  if (chapterCount <= 14) return 2
  return 3
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS，78 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout.ts src/lib/layout.test.ts
git commit -m "feat: add pure layout thresholds for shelf density and toc columns"
```

---

## Task 3: 字級與全幅容器

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/shell/shell.css`

**Interfaces:**
- Produces: `.sh-main` 與 `.sh-head-inner` 不再有 `max-width`；全域字級基準提高。Task 4–9 的版面都建立在這之上。

這個 task 純改 CSS，沒有新測試 —— 驗證方式是既有 73 + 5 個測試維持全綠、且 `npm run build` 成功。字級與版面屬於 Task 10 的目視驗收範圍。

- [ ] **Step 1: 修 `src/index.css` 的 body 字級**

把：

```css
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
```

改成（只有 `font-size` 那行變了）：

```css
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
```

寫 px 會蓋掉使用者在瀏覽器裡設定的字級偏好。

- [ ] **Step 2: 在 `src/index.css` 最後加上視窗級距**

```css
@media (min-width: 1600px) {
  :root { font-size: 112.5%; }
}
```

用百分比而非 px，使用者的瀏覽器偏好仍按比例生效。**不得改成 `clamp()`。**

- [ ] **Step 3: 把 `src/components/shell/shell.css` 的容器改成全幅**

把 `.sh-head-inner` 的：

```css
  max-width: 960px;
  margin: 0 auto;
  padding: .85rem clamp(1rem, 4vw, 1.5rem);
```

改成：

```css
  padding: .85rem clamp(1rem, 3vw, 2.5rem);
```

把 `.sh-main` 的：

```css
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 1.5rem) 3rem;
  flex: 1;
```

改成：

```css
  width: 100%;
  padding: clamp(1rem, 4vw, 2rem) clamp(1rem, 3vw, 2.5rem) 3rem;
  flex: 1;
```

- [ ] **Step 4: 調整 `shell.css` 既有的字級**

`.sh-nav`：`font-size: .88rem` → `font-size: .9375rem`
`.sh-sheet-meta`：`font-size: .78rem` → `font-size: .875rem`
`.sh-toc-aside`：`font-size: .78rem` → `font-size: .875rem`
`.sh-empty`：`font-size: .92rem` → `font-size: .9375rem`
`.sh-sheet-title`：`font-size: clamp(1.1rem, 3vw, 1.35rem)` → `font-size: 1.5rem`

- [ ] **Step 5: 調整 `src/pages/bank.css` 的字級**

`.bk-annot-head`：`font-size: .75rem` → `font-size: .875rem`
`.bk-finding-title`：`font-size: .92rem` → `font-size: 1rem`
`.bk-finding-detail`：`font-size: .86rem` → `font-size: .9375rem`
`.bk-clean`：`font-size: .92rem` → `font-size: .9375rem`

- [ ] **Step 6: 跑測試與建置**

Run: `npm test && npm run build`
Expected: 78 個測試全過、建置成功。

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/shell/shell.css src/pages/bank.css
git commit -m "feat: go full-bleed and raise the type scale for Chinese"
```

---

## Task 4: 橫排書架

**Files:**
- Modify: `src/components/shell/SubjectShelf.tsx`
- Modify: `src/components/shell/shell.css`
- Test: `src/components/shell/SubjectShelf.test.tsx`

**Interfaces:**
- Consumes: `shelfDensity`（Task 2）。
- Produces:
  - `type SubjectMeta = { chapters: number; questions: number }`，定義在 **`src/lib/layout.ts`**（Task 6 的 `bankSnapshot.ts` 會從那裡匯入）：

  ```ts
  export type SubjectMeta = { chapters: number; questions: number }
  ```

  `SubjectShelf` 的新簽章：

  ```ts
  function SubjectShelf(props: {
    subjects: Subject[]
    selectedId: string | null
    onSelect: (id: string) => void
    meta?: Map<string, SubjectMeta>
  }): JSX.Element
  ```

  `meta` 是選填，Task 7、8 會傳入。

**⚠️ 陷阱：** 書背裡加上「N 章 · M 題」會改變按鈕的 accessible name，讓既有測試的 `getByRole('button', { name: '國文' })` 失敗。解法是在按鈕上加 `aria-label={subject.name}` —— 按鈕的用途就是「選這個科目」，題數是補充資訊。**不要改測試去遷就。**

- [ ] **Step 1: 寫失敗測試**

在 `src/components/shell/SubjectShelf.test.tsx` 的 import 補上：

```tsx
import type { SubjectMeta } from '../../lib/layout'
```

在 `describe('SubjectShelf', ...)` 內加入三個測試：

```tsx
  it('shows the chapter and question counts on the spine when meta is given', () => {
    const meta = new Map<string, SubjectMeta>([['s1', { chapters: 3, questions: 61 }]])
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} meta={meta} />)

    expect(screen.getByText('3 章 · 61 題')).toBeInTheDocument()
  })

  it('keeps the subject name as the accessible name even with meta', () => {
    const meta = new Map<string, SubjectMeta>([['s1', { chapters: 3, questions: 61 }]])
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} meta={meta} />)

    expect(screen.getByRole('button', { name: '國文' })).toBeInTheDocument()
  })

  it('marks the shelf as wide when there are two subjects or fewer', () => {
    const { container, rerender } = render(
      <SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} />,
    )
    expect(container.querySelector('.sh-shelf')).toHaveAttribute('data-density', 'wide')

    rerender(
      <SubjectShelf
        subjects={[...subjects, { id: 's3', name: '歷史', order: 2 }]}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(container.querySelector('.sh-shelf')).toHaveAttribute('data-density', 'normal')
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/shell/SubjectShelf.test.tsx`
Expected: 三個新測試 FAIL，既有四個 PASS。

- [ ] **Step 3: 把 `SubjectMeta` 加進 `src/lib/layout.ts`**

在檔案最上方加入：

```ts
export type SubjectMeta = { chapters: number; questions: number }
```

- [ ] **Step 4: 改寫 `src/components/shell/SubjectShelf.tsx`**

```tsx
import './shell.css'
import { shelfDensity, type SubjectMeta } from '../../lib/layout'
import type { Subject } from '../../lib/schema'

export function SubjectShelf({
  subjects,
  selectedId,
  onSelect,
  meta,
}: {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string) => void
  meta?: Map<string, SubjectMeta>
}) {
  return (
    <ul className="sh-shelf" data-density={shelfDensity(subjects.length)}>
      {subjects.map((subject) => {
        const m = meta?.get(subject.id)
        return (
          <li key={subject.id}>
            <button
              type="button"
              className="sh-spine"
              aria-label={subject.name}
              aria-pressed={subject.id === selectedId}
              onClick={() => onSelect(subject.id)}
            >
              <span className="sh-spine-name">{subject.name}</span>
              {m && <span className="sh-spine-meta">{m.chapters} 章 · {m.questions} 題</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 5: 把 `shell.css` 的書架改成橫排**

把既有的 `.sh-shelf-layout`、`.sh-shelf`、`.sh-spine` 三塊，以及檔案最後兩個 media query 裡跟書架有關的規則，換成：

```css
.sh-shelf {
  display: flex;
  flex-direction: row;
  gap: .5rem;
  margin: 0 0 clamp(1rem, 2.5vw, 1.75rem);
  padding: 0 0 .3rem;
  list-style: none;
  overflow-x: auto;
}
.sh-spine {
  writing-mode: vertical-rl;
  display: flex;
  align-items: flex-start;
  gap: .6rem;
  font: inherit;
  font-family: var(--font-display);
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 2px;
  width: 88px;
  height: 140px;
  padding: .9rem .5rem;
  flex: none;
  text-align: start;
  cursor: pointer;
  transition: transform 160ms ease, color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}
.sh-shelf[data-density="wide"] .sh-spine { width: 160px; }
.sh-spine-name { font-size: 1.125rem; letter-spacing: .22em; }
.sh-spine-meta { font-family: var(--font-mono); font-size: .875rem; color: var(--ink-3); letter-spacing: .06em; }
.sh-spine:hover { color: var(--ink); border-color: var(--accent-line); }
.sh-spine[aria-pressed="true"] {
  color: var(--accent-ink);
  background: var(--accent-soft);
  border-color: var(--accent);
  transform: translateY(6px);
}
.sh-spine[aria-pressed="true"] .sh-spine-meta { color: var(--accent); }

@media (prefers-reduced-motion: reduce) {
  .sh-spine { transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease; }
  .sh-spine[aria-pressed="true"] { transform: none; }
}

@media (max-width: 640px) {
  .sh-spine {
    writing-mode: horizontal-tb;
    width: auto;
    height: auto;
    padding: .5rem .9rem;
    align-items: baseline;
  }
  .sh-shelf[data-density="wide"] .sh-spine { width: auto; }
  .sh-spine-name { letter-spacing: .08em; }
  .sh-spine[aria-pressed="true"] { transform: none; }
}
```

`.sh-shelf-layout` 整個刪掉 —— 版面骨架改由 Task 5 的 `.sh-body` 負責。

- [ ] **Step 6: 跑測試確認通過**

Run: `npm test`
Expected: PASS，81 個測試。

> 此時 `BankPage` 與 `HomePage` 仍引用已刪除的 `.sh-shelf-layout` class，畫面會亂 —— 那是預期的，Task 7、8 會修好。測試不驗 class 名稱，所以維持綠燈。

- [ ] **Step 7: Commit**

```bash
git add src/lib/layout.ts src/components/shell/SubjectShelf.tsx src/components/shell/SubjectShelf.test.tsx src/components/shell/shell.css
git commit -m "feat: lay the subject shelf out horizontally with counts on each spine"
```

---

## Task 5: 書眉欄與多欄目次

**Files:**
- Create: `src/components/shell/MarginColumn.tsx`
- Create: `src/components/shell/ChapterToc.tsx`
- Modify: `src/components/shell/shell.css`
- Test: `src/components/shell/MarginColumn.test.tsx`
- Test: `src/components/shell/ChapterToc.test.tsx`

**Interfaces:**
- Consumes: `tocColumns`（Task 2）。
- Produces:
  - `MarginColumn({ children }: { children: ReactNode })` — 渲染 `<aside className="sh-margin">`
  - `ChapterToc({ itemCount, children }: { itemCount: number; children: ReactNode })` — 渲染 `<ul className="sh-toc" data-columns={1|2|3}>`
  - CSS class：`sh-body`（書架下方的兩欄骨架）、`sh-margin`、`sh-margin-head`、`sh-toc`。Task 7、8 直接沿用。

兩個元件刻意**只管版面、不管內容** —— 兩區裝的東西不同（勾選框 vs 題數、開始鍵 vs 朱批），共用的是骨架。

- [ ] **Step 1: 寫失敗測試**

建立 `src/components/shell/MarginColumn.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarginColumn } from './MarginColumn'

describe('MarginColumn', () => {
  it('renders its children inside a complementary landmark', () => {
    render(<MarginColumn><p>概況</p></MarginColumn>)

    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByText('概況')).toBeInTheDocument()
  })
})
```

建立 `src/components/shell/ChapterToc.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChapterToc } from './ChapterToc'

describe('ChapterToc', () => {
  it('renders its children as list items', () => {
    render(<ChapterToc itemCount={2}><li>第一章</li><li>第二章</li></ChapterToc>)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('第一章')).toBeInTheDocument()
  })

  it('uses a single column for six chapters or fewer', () => {
    const { container } = render(<ChapterToc itemCount={6}><li>x</li></ChapterToc>)

    expect(container.querySelector('.sh-toc')).toHaveAttribute('data-columns', '1')
  })

  it('uses two columns from seven chapters', () => {
    const { container } = render(<ChapterToc itemCount={7}><li>x</li></ChapterToc>)

    expect(container.querySelector('.sh-toc')).toHaveAttribute('data-columns', '2')
  })

  it('uses three columns from fifteen chapters', () => {
    const { container } = render(<ChapterToc itemCount={15}><li>x</li></ChapterToc>)

    expect(container.querySelector('.sh-toc')).toHaveAttribute('data-columns', '3')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/shell/MarginColumn.test.tsx src/components/shell/ChapterToc.test.tsx`
Expected: FAIL，兩個模組都找不到。

- [ ] **Step 3: 建立 `src/components/shell/MarginColumn.tsx`**

```tsx
import './shell.css'
import type { ReactNode } from 'react'

export function MarginColumn({ children }: { children: ReactNode }) {
  return <aside className="sh-margin">{children}</aside>
}
```

- [ ] **Step 4: 建立 `src/components/shell/ChapterToc.tsx`**

```tsx
import './shell.css'
import type { ReactNode } from 'react'
import { tocColumns } from '../../lib/layout'

export function ChapterToc({ itemCount, children }: { itemCount: number; children: ReactNode }) {
  return (
    <ul className="sh-toc" data-columns={tocColumns(itemCount)}>
      {children}
    </ul>
  )
}
```

- [ ] **Step 5: 把骨架樣式加進 `shell.css`**

把既有的 `.sh-toc`、`.sh-toc-row` 兩塊替換，並新增 `.sh-body` 與 `.sh-margin`：

```css
.sh-body {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: clamp(1rem, 3vw, 2.5rem);
  align-items: start;
}

.sh-margin {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 3px;
  box-shadow: var(--shadow);
  padding: clamp(1rem, 2vw, 1.25rem);
  line-height: 1.55;
  position: sticky;
  top: clamp(1rem, 2vw, 1.5rem);
}
.sh-margin-head {
  font-family: var(--font-mono);
  font-size: .875rem;
  letter-spacing: .12em;
  color: var(--ink-3);
  margin: 0 0 .5rem;
}
.sh-margin-head + * { margin-top: 0; }
.sh-margin section + section { margin-top: 1.5rem; }

.sh-toc { margin: 0; padding: 0; list-style: none; column-gap: clamp(1.5rem, 3vw, 3rem); }
.sh-toc[data-columns="2"] { columns: 2; }
.sh-toc[data-columns="3"] { columns: 3; }
.sh-toc > li { break-inside: avoid; }
.sh-toc-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: .55rem 0;
  border-bottom: 1px solid var(--rule-soft);
}
.sh-toc[data-columns="1"] .sh-toc-row { padding: .75rem 0; font-size: 1.0625rem; }

@media (max-width: 1100px) {
  .sh-body { grid-template-columns: 1fr; }
  .sh-margin { position: static; }
  .sh-toc[data-columns="3"] { columns: 2; }
}

@media (max-width: 640px) {
  .sh-toc[data-columns="2"],
  .sh-toc[data-columns="3"] { columns: 1; }
}
```

多欄用 CSS `columns` 而非 grid：書籍目次是**逐欄由上往下**讀的，`columns` 天生就是這個流向，grid 則是逐列由左往右。

- [ ] **Step 6: 跑測試確認通過**

Run: `npm test`
Expected: PASS，86 個測試。

- [ ] **Step 7: Commit**

```bash
git add src/components/shell/MarginColumn.tsx src/components/shell/MarginColumn.test.tsx src/components/shell/ChapterToc.tsx src/components/shell/ChapterToc.test.tsx src/components/shell/shell.css
git commit -m "feat: add the margin column and multi-column contents skeleton"
```

---

## Task 6: 題庫快照載入

**Files:**
- Create: `src/lib/bankSnapshot.ts`
- Test: `src/lib/bankSnapshot.test.ts`

**Interfaces:**
- Consumes: `loadIndex`、`fetchChapterRaw`、`RawResult`（`src/lib/dataLoader.ts`，已存在）、`countQuestions`（`src/lib/bankHealth.ts`，已存在）、`SubjectMeta`（Task 4 加進 `layout.ts`）。
- Produces:
  - `type BankSnapshot = { index: IndexData; raws: Map<string, RawResult>; counts: Map<string, number> }`
  - `loadBankSnapshot(): Promise<BankSnapshot>`
  - `subjectMeta(index: IndexData, counts: Map<string, number>): Map<string, SubjectMeta>`

  Task 7 與 Task 8 都用這三個。

題庫區與選題頁的載入流程一模一樣（載索引 → 抓每一章 → 數題數），抽出來避免兩邊各寫一次。

- [ ] **Step 1: 寫失敗測試**

建立 `src/lib/bankSnapshot.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadBankSnapshot, subjectMeta } from './bankSnapshot'
import * as dataLoader from './dataLoader'
import type { IndexData } from './schema'

vi.mock('./dataLoader')

const indexData: IndexData = {
  subjects: [
    { id: 's1', name: '國文', order: 0 },
    { id: 's2', name: '數學', order: 1 },
  ],
  chapters: [
    { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
    { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
    { id: 'c3', subjectId: 's2', name: '第一章', order: 0 },
  ],
}

const question = (id: string, chapterId: string) => ({
  id, chapterId, stem: '題幹',
  options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
})

beforeEach(() => {
  vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
})

describe('loadBankSnapshot', () => {
  it('fetches every registered chapter and counts their questions', async () => {
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) => ({
      ok: true,
      data: id === 'c1' ? [question('q1', 'c1'), question('q2', 'c1')] : [question(`${id}-q`, id)],
    }))

    const snapshot = await loadBankSnapshot()

    expect(dataLoader.fetchChapterRaw).toHaveBeenCalledTimes(3)
    expect(snapshot.index).toEqual(indexData)
    expect(snapshot.counts.get('c1')).toBe(2)
    expect(snapshot.counts.get('c2')).toBe(1)
    expect(snapshot.raws.size).toBe(3)
  })

  it('keeps failed chapters in raws but out of counts', async () => {
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) =>
      id === 'c2'
        ? { ok: false, reason: 'http' as const, detail: 'HTTP 404' }
        : { ok: true, data: [question(`${id}-q`, id)] },
    )

    const snapshot = await loadBankSnapshot()

    expect(snapshot.raws.get('c2')).toEqual({ ok: false, reason: 'http', detail: 'HTTP 404' })
    expect(snapshot.counts.has('c2')).toBe(false)
  })
})

describe('subjectMeta', () => {
  it('totals chapters and questions per subject', () => {
    const counts = new Map([['c1', 25], ['c2', 18], ['c3', 30]])

    const meta = subjectMeta(indexData, counts)

    expect(meta.get('s1')).toEqual({ chapters: 2, questions: 43 })
    expect(meta.get('s2')).toEqual({ chapters: 1, questions: 30 })
  })

  it('counts a chapter whose file is unreadable as zero questions', () => {
    const counts = new Map([['c1', 25]])

    const meta = subjectMeta(indexData, counts)

    expect(meta.get('s1')).toEqual({ chapters: 2, questions: 25 })
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/bankSnapshot.test.ts`
Expected: FAIL，找不到模組 `./bankSnapshot`。

- [ ] **Step 3: 寫實作**

建立 `src/lib/bankSnapshot.ts`：

```ts
import { loadIndex, fetchChapterRaw, type RawResult } from './dataLoader'
import { countQuestions } from './bankHealth'
import type { SubjectMeta } from './layout'
import type { IndexData } from './schema'

export type BankSnapshot = {
  index: IndexData
  raws: Map<string, RawResult>
  counts: Map<string, number>
}

export async function loadBankSnapshot(): Promise<BankSnapshot> {
  const index = await loadIndex()
  const entries = await Promise.all(
    index.chapters.map(async (chapter) => [chapter.id, await fetchChapterRaw(chapter.id)] as const),
  )
  const raws = new Map<string, RawResult>(entries)
  return { index, raws, counts: countQuestions(raws) }
}

export function subjectMeta(
  index: IndexData,
  counts: Map<string, number>,
): Map<string, SubjectMeta> {
  const meta = new Map<string, SubjectMeta>()
  for (const subject of index.subjects) {
    const own = index.chapters.filter((c) => c.subjectId === subject.id)
    meta.set(subject.id, {
      chapters: own.length,
      questions: own.reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0),
    })
  }
  return meta
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS，90 個測試。

- [ ] **Step 5: Commit**

```bash
git add src/lib/bankSnapshot.ts src/lib/bankSnapshot.test.ts
git commit -m "feat: extract the shared bank snapshot load"
```

---

## Task 7: 題庫頁改版

**Files:**
- Modify: `src/pages/BankPage.tsx`
- Modify: `src/pages/bank.css`
- Test: `src/pages/BankPage.test.tsx`

**Interfaces:**
- Consumes: `AppShell`、`SubjectShelf`、`MarginColumn`、`ChapterToc`（Task 3–5）、`loadBankSnapshot`、`subjectMeta`（Task 6）、`checkBank`、`Finding`（已存在）。

**行為（不變）：** 朱批區永遠列出**整個題庫**的 findings，不因選中科目而過濾 —— 過濾會把問題藏起來。`index.json` 本身壞掉時整頁只顯示一條朱批。

**行為（新增）：** 書眉欄上半是概況（全題庫 N 科 · M 章 · K 題），下半是朱批。全題庫僅 1 章時，概況下方補一句檔案位置。

- [ ] **Step 1: 改測試**

`src/pages/BankPage.test.tsx` 整份換成：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import BankPage from './BankPage'
import * as bankSnapshot from '../lib/bankSnapshot'

vi.mock('../lib/bankSnapshot', async (importOriginal) => {
  const actual = await importOriginal<typeof bankSnapshot>()
  return { ...actual, loadBankSnapshot: vi.fn() }
})

const indexData = {
  subjects: [{ id: 's1', name: '國文', order: 0 }],
  chapters: [
    { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
    { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
  ],
}

const question = (id: string, chapterId: string) => ({
  id, chapterId, stem: '題幹',
  options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
})

function renderBank() {
  return render(
    <MemoryRouter initialEntries={['/bank']}>
      <BankPage />
    </MemoryRouter>,
  )
}

describe('BankPage', () => {
  it('reports a clean bank and totals it in the margin', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue({
      index: indexData,
      raws: new Map([
        ['c1', { ok: true, data: [question('q1', 'c1'), question('q2', 'c1')] }],
        ['c2', { ok: true, data: [question('q3', 'c2')] }],
      ]),
      counts: new Map([['c1', 2], ['c2', 1]]),
    })

    renderBank()

    expect(await screen.findByText('題庫沒有問題。')).toBeInTheDocument()
    expect(screen.getByText('1 科 · 2 章 · 3 題')).toBeInTheDocument()
  })

  it('shows a finding naming the chapter whose file is missing', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue({
      index: indexData,
      raws: new Map([
        ['c1', { ok: true, data: [question('q1', 'c1')] }],
        ['c2', { ok: false, reason: 'http', detail: 'HTTP 404' }],
      ]),
      counts: new Map([['c1', 1]]),
    })

    renderBank()

    expect(await screen.findByText(/第二章 · 檔案不存在/)).toBeInTheDocument()
    expect(screen.getByText(/\/data\/questions\/c2\.json/)).toBeInTheDocument()
    expect(screen.queryByText('題庫沒有問題。')).not.toBeInTheDocument()
  })

  it('lists the chapters of the selected subject with their question counts', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue({
      index: indexData,
      raws: new Map([
        ['c1', { ok: true, data: [question('q1', 'c1'), question('q2', 'c1')] }],
        ['c2', { ok: true, data: [question('q3', 'c2')] }],
      ]),
      counts: new Map([['c1', 2], ['c2', 1]]),
    })

    renderBank()

    await userEvent.click(await screen.findByRole('button', { name: '國文' }))

    expect(screen.getByText('第一章')).toBeInTheDocument()
    expect(screen.getByText('2 題')).toBeInTheDocument()
    expect(screen.getByText('1 題')).toBeInTheDocument()
  })

  it('shows a single finding when the index itself cannot be read', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockRejectedValue(new Error('題庫索引格式錯誤：boom'))

    renderBank()

    expect(await screen.findByText(/題庫索引格式錯誤/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/pages/BankPage.test.tsx`
Expected: FAIL，`loadBankSnapshot` 未被 `BankPage` 使用，且找不到「1 科 · 2 章 · 3 題」。

- [ ] **Step 3: 改寫 `src/pages/BankPage.tsx`**

```tsx
import './bank.css'
import { useEffect, useState } from 'react'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { MarginColumn } from '../components/shell/MarginColumn'
import { ChapterToc } from '../components/shell/ChapterToc'
import { loadBankSnapshot, subjectMeta, type BankSnapshot } from '../lib/bankSnapshot'
import { checkBank, type Finding } from '../lib/bankHealth'

export default function BankPage() {
  const [snapshot, setSnapshot] = useState<BankSnapshot | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBankSnapshot()
      .then((s) => {
        if (cancelled) return
        setSnapshot(s)
        setFindings(checkBank(s.index, s.raws))
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <AppShell zone="bank">
        <div className="bk-finding">
          <p className="bk-finding-title">題庫索引讀不到</p>
          <p className="bk-finding-detail">{error}</p>
        </div>
      </AppShell>
    )
  }

  if (!snapshot) {
    return (
      <AppShell zone="bank">
        <p className="sh-empty">檢查題庫中…</p>
      </AppShell>
    )
  }

  const { index, counts } = snapshot
  const meta = subjectMeta(index, counts)
  const subjects = [...index.subjects].sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null
  const chapters = index.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const totalQuestions = [...counts.values()].reduce((sum, n) => sum + n, 0)
  const maxCount = Math.max(1, ...chapters.map((c) => counts.get(c.id) ?? 0))

  return (
    <AppShell zone="bank">
      <SubjectShelf
        subjects={subjects}
        selectedId={selectedSubjectId}
        onSelect={setSelectedSubjectId}
        meta={meta}
      />
      <div className="sh-body">
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '題庫'}</h1>
          </div>

          {selectedSubject ? (
            <ChapterToc itemCount={chapters.length}>
              {chapters.map((chapter) => {
                const count = counts.get(chapter.id)
                return (
                  <li key={chapter.id}>
                    <div className="sh-toc-row">
                      <span className="sh-toc-name">{chapter.name}</span>
                      <span className={count === undefined ? 'sh-toc-aside bk-broken' : 'sh-toc-aside'}>
                        {count === undefined ? '讀不到' : `${count} 題`}
                      </span>
                    </div>
                    <div
                      className="bk-bar"
                      style={{ width: `${((count ?? 0) / maxCount) * 100}%` }}
                    />
                  </li>
                )
              })}
            </ChapterToc>
          ) : (
            <p className="sh-empty">選一個科目看它收了哪些章。</p>
          )}
        </div>

        <MarginColumn>
          <section>
            <p className="sh-margin-head">概況</p>
            <p className="bk-total">
              {index.subjects.length} 科 · {index.chapters.length} 章 · {totalQuestions} 題
            </p>
            {index.chapters.length <= 1 && (
              <p className="sh-empty">題庫檔案放在 <code>public/data/</code>。</p>
            )}
          </section>
          <section>
            <p className="sh-margin-head">朱批</p>
            {findings.length === 0 ? (
              <p className="bk-clean">題庫沒有問題。</p>
            ) : (
              findings.map((finding, i) => (
                <div className="bk-finding" data-severity={finding.severity} key={i}>
                  <p className="bk-finding-title">{finding.title}</p>
                  <p className="bk-finding-detail">{finding.detail}</p>
                </div>
              ))
            )}
          </section>
        </MarginColumn>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 4: 把新樣式加進 `src/pages/bank.css`**

在檔案最後加上，並把既有的 `.bk-annot`、`.bk-annot-head` 兩塊刪掉（改用 `.sh-margin-head`）：

```css
.bk-total { margin: 0 0 .4rem; font-family: var(--font-mono); font-size: 1rem; color: var(--ink); }
.bk-bar { height: 2px; background: var(--accent-line); border-radius: 1px; margin-bottom: .1rem; }
.sh-toc[data-columns="1"] .bk-bar { height: 3px; }
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test`
Expected: PASS，91 個測試。

- [ ] **Step 6: Commit**

```bash
git add src/pages/BankPage.tsx src/pages/BankPage.test.tsx src/pages/bank.css
git commit -m "feat: rebuild the bank page on the full-bleed shelf layout"
```

---

## Task 8: 選題頁改版

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/home.css`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `AppShell`、`SubjectShelf`、`MarginColumn`、`ChapterToc`、`loadBankSnapshot`、`subjectMeta`、`shuffle`。

**行為（不得改變）：** 跨科目切換清空章選取、合併選中章的題目、未選章時「開始複習」停用、導向 `/quiz` 時帶 `{ questions, title }`，title 為 `` `${科目名} 總複習` ``。

**行為（新增）：** 書眉欄放「已選 N 章 · 約 M 題」、隨機排序開關、開始複習鍵，固定可見。

**⚠️** 既有四個測試 mock 的是 `../lib/dataLoader`；改用 `loadBankSnapshot` 之後要改 mock 目標，但**斷言不得放寬**。

- [ ] **Step 1: 改測試**

`src/pages/HomePage.test.tsx` 的 mock 與 fixture 區段換成：

```tsx
import * as bankSnapshot from '../lib/bankSnapshot'
import * as dataLoader from '../lib/dataLoader'

vi.mock('../lib/bankSnapshot', async (importOriginal) => {
  const actual = await importOriginal<typeof bankSnapshot>()
  return { ...actual, loadBankSnapshot: vi.fn() }
})
vi.mock('../lib/dataLoader')

function snapshotOf(index: typeof indexData, counts: Array<[string, number]>) {
  return {
    index,
    raws: new Map(counts.map(([id]) => [id, { ok: true as const, data: [] }])),
    counts: new Map(counts),
  }
}
```

把四個測試裡的 `vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)` 換成：

```tsx
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(indexData, [['c1', 25], ['c2', 18]]),
    )
```

（用 `multiSubjectIndexData` 的測試則換成 `snapshotOf(multiSubjectIndexData, [['c1', 25], ['c2', 18], ['c3', 30]])`。）

`loadMergedQuestions` 仍由 `dataLoader` 提供，那幾行 mock 不動。

再加一個新測試：

```tsx
  it('shows the selected chapter and question totals in the margin', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(indexData, [['c1', 25], ['c2', 18]]),
    )

    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: '國文' }))
    await userEvent.click(screen.getByLabelText('第一章'))

    expect(screen.getByText('已選 1 章 · 約 25 題')).toBeInTheDocument()
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL，`HomePage` 還在呼叫 `loadIndex`。

- [ ] **Step 3: 改寫 `src/pages/HomePage.tsx`**

```tsx
// src/pages/HomePage.tsx
import './home.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { MarginColumn } from '../components/shell/MarginColumn'
import { ChapterToc } from '../components/shell/ChapterToc'
import { loadBankSnapshot, subjectMeta, type BankSnapshot } from '../lib/bankSnapshot'
import { loadMergedQuestions } from '../lib/dataLoader'
import { shuffle } from '../lib/quizLogic'

export default function HomePage() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<BankSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())
  const [shuffleEnabled, setShuffleEnabled] = useState(true)

  useEffect(() => {
    loadBankSnapshot().then(setSnapshot).catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <AppShell zone="quiz"><p className="sh-empty">{error}</p></AppShell>
  if (!snapshot) return <AppShell zone="quiz"><p className="sh-empty">載入題庫中…</p></AppShell>

  const { index, counts } = snapshot
  const meta = subjectMeta(index, counts)
  const subjects = [...index.subjects].sort((a, b) => a.order - b.order)
  const chaptersForSubject = index.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null
  const selectedQuestionCount = [...selectedChapterIds].reduce(
    (sum, id) => sum + (counts.get(id) ?? 0),
    0,
  )

  function selectSubject(id: string) {
    setSelectedSubjectId(id)
    setSelectedChapterIds(new Set())
  }

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleStart() {
    if (!selectedSubject || selectedChapterIds.size === 0) return
    const merged = await loadMergedQuestions([...selectedChapterIds])
    const finalQuestions = shuffleEnabled ? shuffle(merged) : merged
    navigate('/quiz', { state: { questions: finalQuestions, title: `${selectedSubject.name} 總複習` } })
  }

  return (
    <AppShell zone="quiz">
      <SubjectShelf
        subjects={subjects}
        selectedId={selectedSubjectId}
        onSelect={selectSubject}
        meta={meta}
      />
      <div className="sh-body">
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '複習'}</h1>
          </div>

          {selectedSubject ? (
            <ChapterToc itemCount={chaptersForSubject.length}>
              {chaptersForSubject.map((chapter) => (
                <li key={chapter.id}>
                  <div className="sh-toc-row">
                    <label className="hm-check">
                      <input
                        type="checkbox"
                        checked={selectedChapterIds.has(chapter.id)}
                        onChange={() => toggleChapter(chapter.id)}
                      />
                      <span className="sh-toc-name">{chapter.name}</span>
                    </label>
                    <span className="sh-toc-aside">{counts.get(chapter.id) ?? 0} 題</span>
                  </div>
                </li>
              ))}
            </ChapterToc>
          ) : (
            <p className="sh-empty">選一個科目，挑幾章來複習。</p>
          )}
        </div>

        <MarginColumn>
          <section>
            <p className="sh-margin-head">本次範圍</p>
            <p className="hm-total">
              已選 {selectedChapterIds.size} 章 · 約 {selectedQuestionCount} 題
            </p>
            <label className="hm-shuffle">
              <input
                type="checkbox"
                checked={shuffleEnabled}
                onChange={(e) => setShuffleEnabled(e.target.checked)}
              />
              隨機排序題目
            </label>
            <button
              type="button"
              className="hm-start"
              disabled={selectedChapterIds.size === 0}
              onClick={handleStart}
            >
              開始複習
            </button>
          </section>
        </MarginColumn>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 4: 改 `src/pages/home.css`**

把 `.hm-bar` 那塊刪掉（開始鍵已移進書眉欄），並加上：

```css
.hm-total { margin: 0 0 .8rem; font-family: var(--font-mono); font-size: 1rem; color: var(--ink); }
.hm-shuffle { margin-bottom: .9rem; }
.hm-start { width: 100%; }
```

`.hm-check`、`.hm-shuffle`、`.hm-start` 其餘規則不動。

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test`
Expected: PASS，92 個測試。既有四個 HomePage 測試必須維持綠燈。

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/home.css
git commit -m "feat: rebuild the picker page with a sticky range margin"
```

---

## Task 9: 測驗頁三欄

**Files:**
- Create: `src/components/quiz/LiveScore.tsx`
- Modify: `src/components/quiz/QuizEngine.tsx`
- Modify: `src/components/quiz/quiz.css`
- Test: `src/components/quiz/LiveScore.test.tsx`
- Test: `src/components/quiz/QuizEngine.test.tsx`

**Interfaces:**
- Produces: `LiveScore({ answered, total, hits, wrongEntries })`，其中 `wrongEntries: Array<{ questionNumber: number; tag?: string }>`。

**⚠️ 兩條紅線：**
1. **`QuizEngine` 不得 import `AppShell`** —— `QuizEngine.test.tsx` 直接渲染它、沒有 Router，import 進去四個測試會全紅。外框由 `QuizPage` 負責（已經是了，本 task 不動 `QuizPage`）。
2. **作答行為不得改變** —— 鍵盤、點選、鎖定、下一題、重測的邏輯一行都不動，只加版面容器與右欄。

進度軌轉直排**只靠 CSS**（父層 `.quiz-3col` 底下改 `.rail` 的方向），不改 `ProgressRail.tsx`，這樣它既有三個測試不受影響。

- [ ] **Step 1: 寫失敗測試**

建立 `src/components/quiz/LiveScore.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LiveScore } from './LiveScore'

describe('LiveScore', () => {
  it('shows how many are answered and how many are right', () => {
    render(<LiveScore answered={12} total={25} hits={10} wrongEntries={[]} />)

    expect(screen.getByText('12 / 25')).toBeInTheDocument()
    expect(screen.getByText('答對 10')).toBeInTheDocument()
  })

  it('says nothing is wrong yet when there are no wrong answers', () => {
    render(<LiveScore answered={3} total={25} hits={3} wrongEntries={[]} />)

    expect(screen.getByText('還沒有錯題。')).toBeInTheDocument()
  })

  it('lists wrong answers with their number and tag', () => {
    render(
      <LiveScore
        answered={8}
        total={25}
        hits={6}
        wrongEntries={[{ questionNumber: 2, tag: '形近字' }, { questionNumber: 7 }]}
      />,
    )

    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('形近字')).toBeInTheDocument()
    expect(screen.getByText('07')).toBeInTheDocument()
  })
})
```

在 `src/components/quiz/QuizEngine.test.tsx` 的 describe 內加入。該檔案已 import `render, screen` 與 `userEvent`，**需要把 `within` 加進 `@testing-library/react` 的 import**：

```tsx
import { render, screen, within } from '@testing-library/react'
```

```tsx
  it('accumulates wrong answers in the live score while the quiz runs', async () => {
    const questions: Question[] = [
      { id: 'q1', chapterId: 'c1', tag: '形近字', stem: '第一題', options: ['甲', '乙', '丙', '丁'], answerIndex: 0, explanation: 'e1' },
      { id: 'q2', chapterId: 'c1', stem: '第二題', options: ['甲', '乙', '丙', '丁'], answerIndex: 0, explanation: 'e2' },
    ]
    render(<QuizEngine questions={questions} title="測試" />)

    expect(screen.getByText('還沒有錯題。')).toBeInTheDocument()

    await userEvent.click(screen.getByText('乙'))   // 正解是 index 0（甲），所以這是答錯

    const live = within(screen.getByRole('complementary'))
    expect(live.getByText('01')).toBeInTheDocument()
    expect(live.getByText('形近字')).toBeInTheDocument()
    expect(live.getByText('答對 0')).toBeInTheDocument()
  })
```

**必須用 `within(...)` 限定在 `LiveScore` 內查詢** —— `QuestionCard` 的題頭也會渲染同一個 tag「形近字」，直接 `screen.getByText('形近字')` 會撞到兩個元素而拋錯。`LiveScore` 渲染的是 `<aside>`，在 `QuizEngine` 裡是唯一的 `complementary` landmark。

選項文字用甲乙丙丁，與該檔案既有測試的慣例一致，也避免與選項代號 (A)(B)(C)(D) 混淆。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/quiz/LiveScore.test.tsx src/components/quiz/QuizEngine.test.tsx`
Expected: FAIL，找不到模組 `./LiveScore`，且 QuizEngine 沒有「還沒有錯題。」。

- [ ] **Step 3: 建立 `src/components/quiz/LiveScore.tsx`**

```tsx
import './quiz.css'

export function LiveScore({
  answered,
  total,
  hits,
  wrongEntries,
}: {
  answered: number
  total: number
  hits: number
  wrongEntries: Array<{ questionNumber: number; tag?: string }>
}) {
  return (
    <aside className="quiz-live">
      <section>
        <p className="quiz-live-head">進度</p>
        <p className="quiz-live-big">{answered} / {total}</p>
        <p className="quiz-live-sub">答對 {hits}</p>
      </section>
      <section>
        <p className="quiz-live-head">錯題</p>
        {wrongEntries.length === 0 ? (
          <p className="quiz-live-sub">還沒有錯題。</p>
        ) : (
          <ul className="quiz-live-wrong">
            {wrongEntries.map((entry) => (
              <li key={entry.questionNumber}>
                <span className="quiz-live-n">{String(entry.questionNumber).padStart(2, '0')}</span>
                {entry.tag && <span className="quiz-live-tag">{entry.tag}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
```

- [ ] **Step 4: 改 `QuizEngine` 的 return（`if (finished)` 分支不動）**

在 import 區加上：

```tsx
import { LiveScore } from './LiveScore'
```

把最後的 return 換成：

```tsx
  const answered = answers.filter((a) => a !== null).length
  const hits = answers.filter((a, i) => a !== null && a === questions[i].answerIndex).length
  const liveWrong = questions
    .map((question, i) => ({ question, questionNumber: i + 1, picked: answers[i] }))
    .filter(({ question, picked }) => picked !== null && picked !== question.answerIndex)
    .map(({ question, questionNumber }) => ({ questionNumber, tag: question.tag }))

  return (
    <div className="quiz-3col">
      <ProgressRail total={questions.length} current={currentIndex} results={results} />
      <div className="quiz-center">
        <h1 className="quiz-title">{title}</h1>
        <QuestionCard
          question={questions[currentIndex]}
          questionNumber={currentIndex + 1}
          total={questions.length}
          picked={answers[currentIndex]}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={isLast}
        />
      </div>
      <LiveScore answered={answered} total={questions.length} hits={hits} wrongEntries={liveWrong} />
    </div>
  )
```

`const results = ...` 那一行維持在 return 之前不動。

- [ ] **Step 5: 把三欄樣式加進 `src/components/quiz/quiz.css`**

把既有的 `.quiz-page` 那塊換成：

```css
.quiz-3col {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 280px;
  gap: clamp(1rem, 3vw, 2.5rem);
  align-items: start;
}
.quiz-center { display: flex; flex-direction: column; gap: 1rem; line-height: 1.9; max-width: 68ch; }
.quiz-3col .rail {
  grid-auto-flow: row;
  grid-template-columns: 1fr;
  gap: 3px;
  position: sticky;
  top: 1.5rem;
}
.quiz-3col .rail li { height: auto; min-height: 14px; }

.quiz-live {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 3px;
  box-shadow: var(--shadow);
  padding: 1rem;
  line-height: 1.55;
  position: sticky;
  top: 1.5rem;
}
.quiz-live section + section { margin-top: 1.5rem; }
.quiz-live-head { font-family: var(--font-mono); font-size: .875rem; letter-spacing: .12em; color: var(--ink-3); margin: 0 0 .4rem; }
.quiz-live-big { font-family: var(--font-mono); font-size: 1.75rem; color: var(--accent); margin: 0; line-height: 1.2; }
.quiz-live-sub { font-size: .9375rem; color: var(--ink-2); margin: .2rem 0 0; }
.quiz-live-wrong { list-style: none; margin: 0; padding: 0; }
.quiz-live-wrong li { display: flex; align-items: baseline; gap: .6rem; padding: .35rem 0; border-bottom: 1px solid var(--rule-soft); }
.quiz-live-n { font-family: var(--font-mono); font-size: .875rem; color: var(--vermilion); }
.quiz-live-tag { font-size: .875rem; color: var(--ink-3); }

.quiz-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: .06em;
  margin: 0;
}

@media (max-width: 1100px) {
  .quiz-3col { grid-template-columns: 56px minmax(0, 1fr); }
  .quiz-live { grid-column: 1 / -1; position: static; }
}

@media (max-width: 640px) {
  .quiz-3col { grid-template-columns: 1fr; }
  .quiz-3col .rail { grid-auto-flow: column; grid-template-columns: repeat(auto-fit, minmax(6px, 1fr)); position: static; }
  .quiz-3col .rail li { height: 10px; min-height: 0; }
}
```

- [ ] **Step 6: 跑測試與建置**

Run: `npm test && npm run build`
Expected: PASS，96 個測試、建置成功。`QuizEngine` 既有四個測試必須維持綠燈。

- [ ] **Step 7: Commit**

```bash
git add src/components/quiz/LiveScore.tsx src/components/quiz/LiveScore.test.tsx src/components/quiz/QuizEngine.tsx src/components/quiz/QuizEngine.test.tsx src/components/quiz/quiz.css
git commit -m "feat: lay the quiz out in three columns with a live score margin"
```

---

## Task 10: 目視驗收

**Files:** 無（不改 code；若發現問題，修正後併入本 task 的 commit）

- [ ] **Step 1: 起 dev server**

Run: `npm run dev`

注意 vite 若遇 5173 被佔用會自動改用 5174，以終端輸出的網址為準。

- [ ] **Step 2: 建立多科目測試資料**

只有 1 科 1 章時看不出書架與多欄目次，先造一份暫時的索引：

```bash
cp public/data/index.json /tmp/index.json.bak
node -e "
const fs=require('fs');
const subjects=[{id:'s-guowen',name:'國文',order:0},{id:'s-math',name:'數學',order:1},{id:'s-history',name:'歷史',order:2},{id:'s-english',name:'英文',order:3}];
const chapters=[{id:'c-buyin',subjectId:'s-guowen',name:'ㄅ音錯別字',order:0}];
for(let i=1;i<=16;i++)chapters.push({id:'c-fake'+i,subjectId:'s-guowen',name:'第'+i+'章',order:i});
fs.writeFileSync('public/data/index.json',JSON.stringify({subjects,chapters},null,2));
"
```

這會讓 17 章裡有 16 章「檔案不存在」—— 那是刻意的，同時驗證多欄目次與朱批。

- [ ] **Step 3: 逐項確認**

| # | 檢查 |
|---|---|
| 1 | 書架橫排在頁首下方，4 根書背直排中文，底下有「N 章 · M 題」 |
| 2 | 點書背往下推出、轉松綠底；Tab 走到書背有可見焦點框 |
| 3 | 內容佔滿視窗寬度，左右只剩固定邊距，無橫向捲軸 |
| 4 | 選國文 → 17 章目次呈**三欄**，逐欄由上往下讀 |
| 5 | 右側書眉欄固定可見，捲動時不跑掉；上半概況、下半朱批列出 16 條「檔案不存在」 |
| 6 | 字明顯比改版前大（最小字約 15.8px，不再有 12px） |
| 7 | `/` 選題頁：勾選章後書眉顯示「已選 N 章 · 約 M 題」，開始鍵在書眉裡且免捲動 |
| 8 | 測驗頁三欄：左側進度軌直排、中間題卡不過寬、右側即時成績；答錯後右欄長出錯題 |
| 9 | 視窗縮到 1100px 以下：書眉欄移到內容下方 |
| 10 | 縮到 640px 以下：書架橫向捲動且文字轉橫排、目次單欄、進度軌回到題卡上方 |
| 11 | 系統深色模式：兩區可讀，朱批仍是朱紅 |
| 12 | 系統「減少動態效果」：選中書背不位移，只換色 |

- [ ] **Step 4: 還原索引**

`public/data/` 已不在版控中，**不能用 `git checkout` 還原**（見 ADR-0002），必須用備份：

```bash
cp /tmp/index.json.bak public/data/index.json
```

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('public/data/index.json','utf8')).chapters.length + ' 章')"`
Expected: `1 章`

- [ ] **Step 5: 確認稀疏狀態**

重新整理 `/bank`，確認 1 科 1 章時：書背加寬至 160px、目次單欄且條目放大、書眉欄出現「題庫檔案放在 `public/data/`。」、朱批顯示「題庫沒有問題。」。畫面不該有大片無意義留白。

- [ ] **Step 6: 跑完整驗證**

Run: `npm test && npm run build`
Expected: 96 個測試全過、建置成功。

Run: `git status --short`
Expected: 沒有未預期的異動。

- [ ] **Step 7: 若步驟 3 或 5 有修正，commit**

```bash
git add -A
git commit -m "fix: address visual review findings on the full-bleed layout"
```

若沒有任何修正，跳過這一步，不要製造空 commit。
