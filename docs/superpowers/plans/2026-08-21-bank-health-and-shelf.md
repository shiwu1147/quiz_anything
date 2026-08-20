# 題庫體檢表與共用書架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 幫這個 app 補上它從來沒有的 app shell（直排書背的書架 + 目次），並把 Dashboard 實作成唯讀的題庫體檢表。

**Architecture:** 新增一個共用的 shell 模組（`AppShell` + `SubjectShelf`），測驗區與題庫區共用同一個書架與目次骨架。體檢邏輯是 `bankHealth.ts` 裡的純函式，吃索引與各章的原始載入結果、吐 `Finding[]`，完全不碰 DOM 與網路。`dataLoader` 新增一條不丟例外的載入路徑 `fetchChapterRaw`，讓體檢表能拿到每一章各自的結果而不是第一個錯誤。全站零寫入。

**Tech Stack:** Vite、React 18、TypeScript、react-router-dom v6、zod v3、Vitest、@testing-library/react、jsdom。

**Spec:** `docs/superpowers/specs/2026-08-21-quiz-dashboard-design.md`

## Global Constraints

- **全站零寫入。** 不得引入 File System Access API、檔案下載、或任何修改 `public/data/` 的程式碼。
- **不新增任何色票。** 只能使用 `src/index.css` 既有的 token：`--ground` `--surface` `--surface-2` `--rule` `--rule-soft` `--ink` `--ink-2` `--ink-3` `--accent` `--accent-ink` `--accent-soft` `--accent-line` `--vermilion` `--verm-soft` `--verm-line` `--shadow` `--font-display` `--font-body` `--font-mono`。
- 題庫區背景用 `--surface-2`，目次紙用 `--surface`，體檢錯誤用 `--vermilion`，體檢提醒用 `--ink-3`。
- 字體分工：書背與章節名用 `--font-display`；題數、日期、id 用 `--font-mono`；按鈕與提示用 `--font-body`（body 預設）。
- 行距：測驗區 1.9，題庫區 1.55。
- 容器 `max-width: 960px` 置中；書背軌寬 60px；`max-width: 640px` 以下書架轉成頂端橫向可捲的科目條、文字改橫排。
- 書背用 `writing-mode: vertical-rl`，必須是真正的 `<button>`，`:focus-visible` 要有可見外框。
- 選中書背 `transform: translateX(6px)`、過場 160ms；`prefers-reduced-motion: reduce` 下不得位移，只換色。
- **題庫區不得 import `src/components/quiz/quiz.css`。** 朱批視覺在 `bank.css` 用相同 token 重寫。
- 新 CSS class 一律加前綴（`sh-` shell、`hm-` home、`bk-` bank），不得與 `quiz.css` 既有的 `.card` `.rail` `.opt` `.note` `.bar` `.score` `.review` 撞名。
- 文案用使用者要做的事命名；錯誤訊息指出是什麼、在哪裡，不道歉、不含糊。
- 每個 task 結束前跑 `npm test`，全綠才 commit。現有 41 個測試不得變紅。

---

## Task 1: 不丟例外的章節載入

**Files:**
- Modify: `src/lib/dataLoader.ts`
- Test: `src/lib/dataLoader.test.ts`

**Interfaces:**
- Produces: `RawResult` type 與 `fetchChapterRaw(chapterId: string): Promise<RawResult>`，Task 2 與 Task 4 都會用到。
- 既有的 `loadIndex` / `loadChapterQuestions` / `loadMergedQuestions` 不得更動，測驗區依賴它們現有的丟例外行為。

- [ ] **Step 1: 寫失敗測試**

在 `src/lib/dataLoader.test.ts` 最上方的 import 補上 `fetchChapterRaw`：

```ts
import { loadIndex, loadChapterQuestions, loadMergedQuestions, fetchChapterRaw } from './dataLoader'
```

在檔案最後加上：

```ts
describe('fetchChapterRaw', () => {
  const question = {
    id: 'q1', chapterId: 'c1', stem: '題幹',
    options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
  }

  it('returns the raw body when the response is ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, [question])))

    const result = await fetchChapterRaw('c1')

    expect(fetch).toHaveBeenCalledWith('/data/questions/c1.json')
    expect(result).toEqual({ ok: true, data: [question] })
  })

  it('reports an http failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, {}, false, 404)))

    const result = await fetchChapterRaw('c-missing')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.reason).toBe('http')
    expect(result.detail).toMatch(/404/)
  })

  it('reports a json failure when the body cannot be parsed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token }') },
    })))

    const result = await fetchChapterRaw('c-broken')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.reason).toBe('json')
    expect(result.detail).toMatch(/Unexpected token/)
  })

  it('reports an http failure when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    const result = await fetchChapterRaw('c1')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.reason).toBe('http')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/dataLoader.test.ts`
Expected: FAIL，訊息類似 `fetchChapterRaw is not a function`。

- [ ] **Step 3: 寫實作**

在 `src/lib/dataLoader.ts` 的 `fetchJson` 之後、`loadIndex` 之前插入：

```ts
export type RawResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: 'http' | 'json'; detail: string }

export async function fetchChapterRaw(chapterId: string): Promise<RawResult> {
  let res: Response
  try {
    res = await fetch(`/data/questions/${chapterId}.json`)
  } catch (e) {
    return { ok: false, reason: 'http', detail: (e as Error).message }
  }
  if (!res.ok) {
    return { ok: false, reason: 'http', detail: `HTTP ${res.status}` }
  }
  try {
    return { ok: true, data: await res.json() }
  } catch (e) {
    return { ok: false, reason: 'json', detail: (e as Error).message }
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS，測試數從 41 增加到 45。

- [ ] **Step 5: Commit**

```bash
git add src/lib/dataLoader.ts src/lib/dataLoader.test.ts
git commit -m "feat: add non-throwing chapter fetch for the bank health check"
```

---

## Task 2: 體檢邏輯

**Files:**
- Create: `src/lib/bankHealth.ts`
- Test: `src/lib/bankHealth.test.ts`

**Interfaces:**
- Consumes: `RawResult`（Task 1）、`questionArraySchema` 與 `IndexData` / `Chapter`（`src/lib/schema.ts`，已存在）。
- Produces:
  - `type Finding = { severity: 'error' | 'warning'; subjectId?: string; chapterId?: string; title: string; detail: string }`
  - `checkBank(index: IndexData, raws: Map<string, RawResult>): Finding[]`
  - `countQuestions(raws: Map<string, RawResult>): Map<string, number>`

  Task 4 的 `BankPage` 會用到這三個。

**體檢規則（八條，與 spec 的表格一一對應）:**

| 規則 | severity |
|---|---|
| 章節登記了但 JSON 抓不到 | error |
| JSON 語法壞掉 | error |
| schema 驗證失敗 | error |
| 檔案裡的 `chapterId` 與登記的不符 | error |
| 章節的 `subjectId` 指向不存在的科目 | error |
| 同一章出現重複的 `id` | error |
| 章節有登記但零題 | warning |
| 同一層級的 `order` 重號 | warning |

- [ ] **Step 1: 寫失敗測試**

建立 `src/lib/bankHealth.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { checkBank, countQuestions } from './bankHealth'
import type { RawResult } from './dataLoader'
import type { IndexData } from './schema'

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1', chapterId: 'c1', stem: '題幹',
    options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
    ...overrides,
  }
}

const index: IndexData = {
  subjects: [{ id: 's1', name: '國文', order: 0 }],
  chapters: [{ id: 'c1', subjectId: 's1', name: '第一章', order: 0 }],
}

function raws(entries: Record<string, RawResult>): Map<string, RawResult> {
  return new Map(Object.entries(entries))
}

describe('checkBank', () => {
  it('returns no findings for a healthy bank', () => {
    const result = checkBank(index, raws({ c1: { ok: true, data: [question()] } }))

    expect(result).toEqual([])
  })

  it('flags a chapter whose file cannot be fetched', () => {
    const result = checkBank(index, raws({ c1: { ok: false, reason: 'http', detail: 'HTTP 404' } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].chapterId).toBe('c1')
    expect(result[0].title).toContain('第一章')
    expect(result[0].detail).toContain('/data/questions/c1.json')
  })

  it('flags a chapter with no load result at all', () => {
    const result = checkBank(index, raws({}))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].chapterId).toBe('c1')
  })

  it('flags a chapter whose json is malformed', () => {
    const result = checkBank(index, raws({ c1: { ok: false, reason: 'json', detail: 'Unexpected token }' } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].title).toContain('JSON')
  })

  it('names the offending question and field when the schema fails', () => {
    const broken = [question(), question({ id: 'q2' }), question({ id: 'q3', answerIndex: undefined })]
    const result = checkBank(index, raws({ c1: { ok: true, data: broken } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('第 3 題')
    expect(result[0].detail).toContain('answerIndex')
  })

  it('flags questions whose chapterId does not match the registered chapter', () => {
    const data = [question(), question({ id: 'q2', chapterId: 'c-other' })]
    const result = checkBank(index, raws({ c1: { ok: true, data } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('q2')
    expect(result[0].detail).toContain('c-other')
  })

  it('flags a chapter pointing at a subject that does not exist', () => {
    const orphanIndex: IndexData = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [{ id: 'c1', subjectId: 's-gone', name: '第一章', order: 0 }],
    }
    const result = checkBank(orphanIndex, raws({ c1: { ok: true, data: [question()] } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('s-gone')
  })

  it('flags duplicate question ids within a chapter', () => {
    const data = [question(), question({ stem: '另一題' })]
    const result = checkBank(index, raws({ c1: { ok: true, data } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('q1')
  })

  it('warns about a registered chapter with no questions', () => {
    const result = checkBank(index, raws({ c1: { ok: true, data: [] } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].title).toContain('第一章')
  })

  it('warns about duplicate order among chapters of the same subject', () => {
    const dupIndex: IndexData = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [
        { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
        { id: 'c2', subjectId: 's1', name: '第二章', order: 0 },
      ],
    }
    const result = checkBank(dupIndex, raws({
      c1: { ok: true, data: [question()] },
      c2: { ok: true, data: [question({ id: 'q2', chapterId: 'c2' })] },
    }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].detail).toContain('order')
  })

  it('does not warn when the same order is used under different subjects', () => {
    const twoSubjects: IndexData = {
      subjects: [
        { id: 's1', name: '國文', order: 0 },
        { id: 's2', name: '數學', order: 1 },
      ],
      chapters: [
        { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
        { id: 'c2', subjectId: 's2', name: '第一章', order: 0 },
      ],
    }
    const result = checkBank(twoSubjects, raws({
      c1: { ok: true, data: [question()] },
      c2: { ok: true, data: [question({ id: 'q2', chapterId: 'c2' })] },
    }))

    expect(result).toEqual([])
  })

  it('warns about duplicate order among subjects', () => {
    const dupIndex: IndexData = {
      subjects: [
        { id: 's1', name: '國文', order: 0 },
        { id: 's2', name: '數學', order: 0 },
      ],
      chapters: [],
    }
    const result = checkBank(dupIndex, raws({}))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].title).toContain('科目')
  })

  it('reports every problem when several coexist', () => {
    const messy: IndexData = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [
        { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
        { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
      ],
    }
    const result = checkBank(messy, raws({
      c1: { ok: false, reason: 'http', detail: 'HTTP 404' },
      c2: { ok: true, data: [] },
    }))

    expect(result).toHaveLength(2)
    expect(result.map((f) => f.severity)).toEqual(['error', 'warning'])
  })
})

describe('countQuestions', () => {
  it('counts questions per chapter for files that parse', () => {
    const result = countQuestions(raws({
      c1: { ok: true, data: [question(), question({ id: 'q2' })] },
      c2: { ok: true, data: [] },
    }))

    expect(result.get('c1')).toBe(2)
    expect(result.get('c2')).toBe(0)
  })

  it('omits chapters whose file is missing or malformed', () => {
    const result = countQuestions(raws({
      c1: { ok: false, reason: 'http', detail: 'HTTP 404' },
      c2: { ok: true, data: [{ id: 'nope' }] },
    }))

    expect(result.has('c1')).toBe(false)
    expect(result.has('c2')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/bankHealth.test.ts`
Expected: FAIL，找不到模組 `./bankHealth`。

- [ ] **Step 3: 寫實作**

建立 `src/lib/bankHealth.ts`：

```ts
import { z } from 'zod'
import { questionArraySchema, type Chapter, type IndexData } from './schema'
import type { RawResult } from './dataLoader'

export type Finding = {
  severity: 'error' | 'warning'
  subjectId?: string
  chapterId?: string
  title: string
  detail: string
}

export function checkBank(index: IndexData, raws: Map<string, RawResult>): Finding[] {
  const findings: Finding[] = []
  const subjectIds = new Set(index.subjects.map((s) => s.id))

  for (const order of duplicates(index.subjects.map((s) => s.order))) {
    findings.push({
      severity: 'warning',
      title: `科目排序重號 · order ${order}`,
      detail: `有多個科目的 order 都是 ${order}，排序結果不穩定。`,
    })
  }

  for (const subject of index.subjects) {
    const own = index.chapters.filter((c) => c.subjectId === subject.id)
    for (const order of duplicates(own.map((c) => c.order))) {
      findings.push({
        severity: 'warning',
        subjectId: subject.id,
        title: `${subject.name} · 章節排序重號 · order ${order}`,
        detail: `${subject.name} 底下有多個章節的 order 都是 ${order}，排序結果不穩定。`,
      })
    }
  }

  for (const chapter of index.chapters) {
    if (!subjectIds.has(chapter.subjectId)) {
      findings.push({
        severity: 'error',
        chapterId: chapter.id,
        title: `${chapter.name} · 科目不存在`,
        detail: `章節 ${chapter.id} 的 subjectId 是 ${chapter.subjectId}，但 index.json 沒有這個科目。`,
      })
    }
  }

  for (const chapter of index.chapters) {
    findings.push(...checkChapter(chapter, raws.get(chapter.id)))
  }

  return findings
}

export function countQuestions(raws: Map<string, RawResult>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const [chapterId, raw] of raws) {
    if (!raw.ok) continue
    const parsed = questionArraySchema.safeParse(raw.data)
    if (parsed.success) counts.set(chapterId, parsed.data.length)
  }
  return counts
}

function checkChapter(chapter: Chapter, raw: RawResult | undefined): Finding[] {
  const file = `/data/questions/${chapter.id}.json`
  const where = { subjectId: chapter.subjectId, chapterId: chapter.id }

  if (raw === undefined || (!raw.ok && raw.reason === 'http')) {
    const why = raw === undefined ? '沒有載入結果' : raw.detail
    return [{
      ...where,
      severity: 'error',
      title: `${chapter.name} · 檔案不存在`,
      detail: `index.json 登記了 ${chapter.id}，但 ${file} 抓不到（${why}）。`,
    }]
  }

  if (!raw.ok) {
    return [{
      ...where,
      severity: 'error',
      title: `${chapter.name} · JSON 壞掉`,
      detail: `${file} 不是合法的 JSON（${raw.detail}）。`,
    }]
  }

  const parsed = questionArraySchema.safeParse(raw.data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return [{
      ...where,
      severity: 'error',
      title: `${chapter.name} · 格式不符`,
      detail: `${file}：${describePath(issue.path)} ${describeIssue(issue)}。`,
    }]
  }

  const questions = parsed.data
  const findings: Finding[] = []

  if (questions.length === 0) {
    findings.push({
      ...where,
      severity: 'warning',
      title: `${chapter.name} · 沒有題目`,
      detail: `${chapter.name} 有登記，但這一章還沒有題目。`,
    })
  }

  const mismatched = questions.filter((q) => q.chapterId !== chapter.id)
  if (mismatched.length > 0) {
    const first = mismatched[0]
    findings.push({
      ...where,
      severity: 'error',
      title: `${chapter.name} · chapterId 對不上`,
      detail: `${file} 裡有 ${mismatched.length} 題的 chapterId 不是 ${chapter.id}（第一個是 ${first.id}，寫的是 ${first.chapterId}）。`,
    })
  }

  for (const id of duplicates(questions.map((q) => q.id))) {
    findings.push({
      ...where,
      severity: 'error',
      title: `${chapter.name} · 題號重複`,
      detail: `${file} 裡有多題的 id 都是 ${id}。`,
    })
  }

  return findings
}

function duplicates<T>(values: T[]): T[] {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].filter(([, n]) => n > 1).map(([value]) => value)
}

function describePath(path: Array<string | number>): string {
  const [index, ...rest] = path
  if (typeof index !== 'number') return path.length > 0 ? path.join('.') : '整份檔案'
  const field = rest.join('.')
  return field ? `第 ${index + 1} 題的 ${field}` : `第 ${index + 1} 題`
}

function describeIssue(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') return '缺少此欄位'
  return issue.message
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test`
Expected: PASS，測試數從 45 增加到 60。

- [ ] **Step 5: Commit**

```bash
git add src/lib/bankHealth.ts src/lib/bankHealth.test.ts
git commit -m "feat: add pure bank integrity checks"
```

---

## Task 3: 共用 shell 與書架

**Files:**
- Create: `src/components/shell/AppShell.tsx`
- Create: `src/components/shell/SubjectShelf.tsx`
- Create: `src/components/shell/shell.css`
- Test: `src/components/shell/AppShell.test.tsx`
- Test: `src/components/shell/SubjectShelf.test.tsx`

**Interfaces:**
- Consumes: `Subject`（`src/lib/schema.ts`）、`NavLink`（react-router-dom）。
- Produces:
  - `AppShell({ zone, children }: { zone: 'quiz' | 'bank'; children: ReactNode })` — 需要 Router context。
  - `SubjectShelf({ subjects, selectedId, onSelect }: { subjects: Subject[]; selectedId: string | null; onSelect: (id: string) => void })` — 純展示，呼叫端負責排序。
  - CSS class：`sh-root` `sh-head` `sh-head-inner` `sh-brand` `sh-nav` `sh-main` `sh-shelf-layout` `sh-shelf` `sh-spine` `sh-sheet` `sh-sheet-head` `sh-sheet-title` `sh-sheet-meta` `sh-toc` `sh-toc-row` `sh-toc-name` `sh-toc-aside` `sh-empty`。Task 4 與 Task 5 直接沿用。

- [ ] **Step 1: 寫失敗測試**

建立 `src/components/shell/SubjectShelf.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SubjectShelf } from './SubjectShelf'

const subjects = [
  { id: 's1', name: '國文', order: 0 },
  { id: 's2', name: '數學', order: 1 },
]

describe('SubjectShelf', () => {
  it('renders one button per subject', () => {
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: '國文' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '數學' })).toBeInTheDocument()
  })

  it('marks only the selected subject as pressed', () => {
    render(<SubjectShelf subjects={subjects} selectedId="s2" onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: '國文' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '數學' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports the clicked subject id', async () => {
    const onSelect = vi.fn()
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: '數學' }))

    expect(onSelect).toHaveBeenCalledWith('s2')
  })

  it('renders no buttons when there are no subjects', () => {
    render(<SubjectShelf subjects={[]} selectedId={null} onSelect={() => {}} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
```

建立 `src/components/shell/AppShell.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AppShell } from './AppShell'

function renderShell(zone: 'quiz' | 'bank', path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell zone={zone}>
        <p>內容</p>
      </AppShell>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  it('renders the brand and both zone links', () => {
    renderShell('quiz')

    expect(screen.getByText('問答題庫')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '複習' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '題庫' })).toHaveAttribute('href', '/dashboard')
  })

  it('renders its children', () => {
    renderShell('quiz')

    expect(screen.getByText('內容')).toBeInTheDocument()
  })

  it('marks the current zone on the root element', () => {
    const { container } = renderShell('bank', '/dashboard')

    expect(container.querySelector('.sh-root')).toHaveAttribute('data-zone', 'bank')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/components/shell`
Expected: FAIL，找不到模組 `./SubjectShelf` 與 `./AppShell`。

- [ ] **Step 3: 寫 `src/components/shell/shell.css`**

```css
.sh-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ground);
}
.sh-root[data-zone="bank"] { background: var(--surface-2); }

.sh-head {
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
}
.sh-head-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: .85rem clamp(1rem, 4vw, 1.5rem);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.sh-brand {
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: .14em;
  color: var(--ink);
}
.sh-nav { display: flex; gap: 1.1rem; font-size: .88rem; }
.sh-nav a {
  color: var(--ink-3);
  text-decoration: none;
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
}
.sh-nav a:hover { color: var(--ink-2); }
.sh-nav a.is-on { color: var(--accent); border-bottom-color: var(--accent); }
.sh-nav a:focus-visible,
.sh-spine:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sh-main {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 1.5rem) 3rem;
  flex: 1;
}

.sh-shelf-layout {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: clamp(1rem, 3vw, 1.75rem);
  align-items: start;
}
.sh-shelf {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sh-spine {
  writing-mode: vertical-rl;
  font: inherit;
  font-family: var(--font-display);
  font-size: .98rem;
  letter-spacing: .22em;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 1rem .45rem;
  min-height: 7rem;
  width: 100%;
  text-align: start;
  cursor: pointer;
  transition: transform 160ms ease, color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}
.sh-spine:hover { color: var(--ink); border-color: var(--accent-line); }
.sh-spine[aria-pressed="true"] {
  color: var(--accent-ink);
  background: var(--accent-soft);
  border-color: var(--accent);
  transform: translateX(6px);
}

.sh-sheet {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 3px;
  box-shadow: var(--shadow);
  padding: clamp(1.1rem, 3.5vw, 1.75rem);
  line-height: 1.55;
}
.sh-sheet-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: .75rem;
  border-bottom: 1px solid var(--rule);
}
.sh-sheet-title {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 3vw, 1.35rem);
  font-weight: 600;
  letter-spacing: .06em;
  margin: 0;
}
.sh-sheet-meta {
  font-family: var(--font-mono);
  font-size: .78rem;
  color: var(--ink-3);
}

.sh-toc { margin: 0; padding: 0; list-style: none; }
.sh-toc-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: .6rem 0;
  border-bottom: 1px solid var(--rule-soft);
}
.sh-toc-name { font-family: var(--font-display); }
.sh-toc-aside { font-family: var(--font-mono); font-size: .78rem; color: var(--ink-3); flex: none; }

.sh-empty { color: var(--ink-3); font-size: .92rem; }

@media (prefers-reduced-motion: reduce) {
  .sh-spine { transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease; }
  .sh-spine[aria-pressed="true"] { transform: none; }
}

@media (max-width: 640px) {
  .sh-shelf-layout { grid-template-columns: 1fr; }
  .sh-shelf { flex-direction: row; overflow-x: auto; padding-bottom: .3rem; }
  .sh-spine {
    writing-mode: horizontal-tb;
    min-height: 0;
    width: auto;
    flex: none;
    padding: .45rem .9rem;
    letter-spacing: .08em;
  }
  .sh-spine[aria-pressed="true"] { transform: none; }
}
```

- [ ] **Step 4: 寫 `src/components/shell/SubjectShelf.tsx`**

```tsx
import './shell.css'
import type { Subject } from '../../lib/schema'

export function SubjectShelf({
  subjects,
  selectedId,
  onSelect,
}: {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <ul className="sh-shelf">
      {subjects.map((subject) => (
        <li key={subject.id}>
          <button
            type="button"
            className="sh-spine"
            aria-pressed={subject.id === selectedId}
            onClick={() => onSelect(subject.id)}
          >
            {subject.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: 寫 `src/components/shell/AppShell.tsx`**

```tsx
import './shell.css'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'is-on' : undefined
}

export function AppShell({ zone, children }: { zone: 'quiz' | 'bank'; children: ReactNode }) {
  return (
    <div className="sh-root" data-zone={zone}>
      <header className="sh-head">
        <div className="sh-head-inner">
          <div className="sh-brand">問答題庫</div>
          <nav className="sh-nav">
            <NavLink to="/" end className={navClass}>複習</NavLink>
            <NavLink to="/dashboard" className={navClass}>題庫</NavLink>
          </nav>
        </div>
      </header>
      <main className="sh-main">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npm test`
Expected: PASS，測試數從 60 增加到 67。

- [ ] **Step 7: Commit**

```bash
git add src/components/shell
git commit -m "feat: add shared app shell and vertical subject shelf"
```

---

## Task 4: 題庫體檢頁

**Files:**
- Create: `src/pages/BankPage.tsx`
- Create: `src/pages/bank.css`
- Test: `src/pages/BankPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AppShell`、`SubjectShelf`（Task 3）、`loadIndex`、`fetchChapterRaw`、`RawResult`（Task 1）、`checkBank`、`countQuestions`、`Finding`（Task 2）。
- Produces: `BankPage` default export，掛在 `/dashboard`。

**行為:**
- 進頁時載入 `index.json`，再對**每一個**章節呼叫 `fetchChapterRaw`，把結果餵給 `checkBank`。
- 朱批區永遠列出**整個題庫**的 findings，不因選中科目而過濾 —— 過濾會把問題藏起來。
- 目次只顯示選中科目的章節；沒選科目時顯示提示。
- `index.json` 本身壞掉時整頁只顯示一條朱批，不嘗試部分渲染。

- [ ] **Step 1: 寫失敗測試**

建立 `src/pages/BankPage.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import BankPage from './BankPage'
import * as dataLoader from '../lib/dataLoader'

vi.mock('../lib/dataLoader')

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
    <MemoryRouter initialEntries={['/dashboard']}>
      <BankPage />
    </MemoryRouter>,
  )
}

describe('BankPage', () => {
  it('reports a clean bank', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) => ({
      ok: true,
      data: [question(`${id}-q1`, id)],
    }))

    renderBank()

    expect(await screen.findByText('題庫沒有問題。')).toBeInTheDocument()
  })

  it('shows a finding naming the chapter whose file is missing', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) =>
      id === 'c2'
        ? { ok: false, reason: 'http' as const, detail: 'HTTP 404' }
        : { ok: true, data: [question('c1-q1', 'c1')] },
    )

    renderBank()

    expect(await screen.findByText(/第二章 · 檔案不存在/)).toBeInTheDocument()
    expect(screen.getByText(/\/data\/questions\/c2\.json/)).toBeInTheDocument()
    expect(screen.queryByText('題庫沒有問題。')).not.toBeInTheDocument()
  })

  it('lists the chapters of the selected subject with their question counts', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) => ({
      ok: true,
      data: id === 'c1'
        ? [question('c1-q1', 'c1'), question('c1-q2', 'c1')]
        : [question('c2-q1', 'c2')],
    }))

    renderBank()

    await userEvent.click(await screen.findByRole('button', { name: '國文' }))

    expect(screen.getByText('第一章')).toBeInTheDocument()
    expect(screen.getByText('2 題')).toBeInTheDocument()
    expect(screen.getByText('1 題')).toBeInTheDocument()
  })

  it('shows a single finding when the index itself cannot be read', async () => {
    vi.mocked(dataLoader.loadIndex).mockRejectedValue(new Error('題庫索引格式錯誤：boom'))

    renderBank()

    expect(await screen.findByText(/題庫索引格式錯誤/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/pages/BankPage.test.tsx`
Expected: FAIL，找不到模組 `./BankPage`。

- [ ] **Step 3: 寫 `src/pages/bank.css`**

朱批的視覺刻意與 `quiz.css` 的 `.note` 一致（朱紅左邊線 + `--surface-2` 底），但獨立宣告，不 import 測驗模組的樣式。

```css
.bk-annot { margin-top: 1.5rem; }
.bk-annot-head {
  font-family: var(--font-mono);
  font-size: .75rem;
  letter-spacing: .12em;
  color: var(--ink-3);
  margin: 0 0 .6rem;
}
.bk-finding {
  border-left: 3px solid var(--vermilion);
  background: var(--surface-2);
  border-radius: 0 2px 2px 0;
  padding: .7rem .9rem;
  margin-bottom: .5rem;
}
.bk-finding[data-severity="warning"] { border-left-color: var(--ink-3); }
.bk-finding-title {
  font-family: var(--font-display);
  font-size: .92rem;
  color: var(--vermilion);
  margin: 0 0 .2rem;
}
.bk-finding[data-severity="warning"] .bk-finding-title { color: var(--ink-2); }
.bk-finding-detail {
  margin: 0;
  font-size: .86rem;
  line-height: 1.7;
  color: var(--ink-2);
  word-break: break-all;
}
.bk-clean { margin: 0; font-size: .92rem; color: var(--ink-2); }
.bk-broken { color: var(--vermilion); }
```

- [ ] **Step 4: 寫 `src/pages/BankPage.tsx`**

```tsx
import './bank.css'
import { useEffect, useState } from 'react'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { loadIndex, fetchChapterRaw, type RawResult } from '../lib/dataLoader'
import { checkBank, countQuestions, type Finding } from '../lib/bankHealth'
import type { IndexData } from '../lib/schema'

export default function BankPage() {
  const [indexData, setIndexData] = useState<IndexData | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const index = await loadIndex()
        const entries = await Promise.all(
          index.chapters.map(async (chapter) => [chapter.id, await fetchChapterRaw(chapter.id)] as const),
        )
        if (cancelled) return
        const raws = new Map<string, RawResult>(entries)
        setIndexData(index)
        setFindings(checkBank(index, raws))
        setCounts(countQuestions(raws))
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <AppShell zone="bank">
        <div className="sh-sheet">
          <div className="bk-finding">
            <p className="bk-finding-title">題庫索引讀不到</p>
            <p className="bk-finding-detail">{error}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!indexData) {
    return (
      <AppShell zone="bank">
        <p className="sh-empty">檢查題庫中…</p>
      </AppShell>
    )
  }

  const subjects = [...indexData.subjects].sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null
  const chapters = indexData.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const totalQuestions = chapters.reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0)

  return (
    <AppShell zone="bank">
      <div className="sh-shelf-layout">
        <SubjectShelf subjects={subjects} selectedId={selectedSubjectId} onSelect={setSelectedSubjectId} />
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '題庫'}</h1>
            {selectedSubject && (
              <span className="sh-sheet-meta">{chapters.length} 卷 · {totalQuestions} 題</span>
            )}
          </div>

          {selectedSubject ? (
            <ul className="sh-toc">
              {chapters.map((chapter) => {
                const count = counts.get(chapter.id)
                return (
                  <li key={chapter.id} className="sh-toc-row">
                    <span className="sh-toc-name">{chapter.name}</span>
                    <span className={count === undefined ? 'sh-toc-aside bk-broken' : 'sh-toc-aside'}>
                      {count === undefined ? '讀不到' : `${count} 題`}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="sh-empty">選一個科目看它收了哪些章節。</p>
          )}

          <section className="bk-annot">
            <p className="bk-annot-head">朱批</p>
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
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 5: 把 `/dashboard` 掛上路由**

把 `src/App.tsx` 整份換成：

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import BankPage from './pages/BankPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/dashboard" element={<BankPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npm test`
Expected: PASS，測試數從 67 增加到 71。

- [ ] **Step 7: Commit**

```bash
git add src/pages/BankPage.tsx src/pages/BankPage.test.tsx src/pages/bank.css src/App.tsx
git commit -m "feat: add read-only bank health page at /dashboard"
```

---

## Task 5: 選題頁換上書架

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Create: `src/pages/home.css`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `AppShell`、`SubjectShelf`（Task 3）、既有的 `loadIndex` / `loadMergedQuestions` / `shuffle`。
- 產出的行為必須與現況完全一致：跨科目切換清空章節選取、合併選中章節的題目、未選章節時「開始複習」停用、導向 `/quiz` 時帶 `{ questions, title }` navigation state，title 為 `` `${科目名} 總複習` ``。

**注意:** `HomePage.test.tsx` 既有三個測試是這次改版的回歸網。它們用 `screen.findByText('國文')` 點科目、`getByLabelText('第一章')` 取章節 checkbox、`getByRole('button', { name: /開始複習/ })` 取開始鍵。改版後這些查詢必須仍然成立 —— 科目變成 `<button>` 之後 `findByText` 仍會找到按鈕本身。`AppShell` 的導覽列文字是「複習」與「題庫」，不含「開始複習」，不會與開始鍵的查詢衝突。

- [ ] **Step 1: 寫失敗測試**

在 `src/pages/HomePage.test.tsx` 的 `describe('HomePage', ...)` 內最上方加入一個新測試：

```tsx
  it('renders subjects as shelf buttons inside the app shell', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(multiSubjectIndexData)

    renderHome()

    const spine = await screen.findByRole('button', { name: '國文' })
    expect(spine).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(spine)
    expect(screen.getByRole('button', { name: '國文' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: '題庫' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: 新測試 FAIL（找不到 `aria-pressed` 屬性，或找不到「題庫」連結），既有三個測試 PASS。

- [ ] **Step 3: 寫 `src/pages/home.css`**

```css
.hm-check {
  display: flex;
  align-items: center;
  gap: .6rem;
  cursor: pointer;
}
.hm-check input { accent-color: var(--accent); cursor: pointer; }

.hm-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--rule);
}
.hm-shuffle {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: .86rem;
  color: var(--ink-2);
  cursor: pointer;
}
.hm-shuffle input { accent-color: var(--accent); cursor: pointer; }
.hm-start {
  font: inherit;
  font-size: .92rem;
  letter-spacing: .06em;
  color: var(--surface);
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 2px;
  padding: .5rem 1.4rem;
  cursor: pointer;
}
.hm-start:disabled {
  color: var(--ink-3);
  background: var(--surface-2);
  border-color: var(--rule);
  cursor: not-allowed;
}
.hm-start:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- [ ] **Step 4: 改寫 `src/pages/HomePage.tsx`**

state 與三個 handler 的邏輯一字不改，只換 import 與 return。完整檔案：

```tsx
// src/pages/HomePage.tsx
import './home.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { loadIndex, loadMergedQuestions } from '../lib/dataLoader'
import { shuffle } from '../lib/quizLogic'
import type { IndexData } from '../lib/schema'

export default function HomePage() {
  const navigate = useNavigate()
  const [indexData, setIndexData] = useState<IndexData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())
  const [shuffleEnabled, setShuffleEnabled] = useState(true)

  useEffect(() => {
    loadIndex().then(setIndexData).catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <AppShell zone="quiz"><p className="sh-empty">{error}</p></AppShell>
  if (!indexData) return <AppShell zone="quiz"><p className="sh-empty">載入題庫中…</p></AppShell>

  const subjects = [...indexData.subjects].sort((a, b) => a.order - b.order)
  const chaptersForSubject = indexData.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null

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
      <div className="sh-shelf-layout">
        <SubjectShelf subjects={subjects} selectedId={selectedSubjectId} onSelect={selectSubject} />
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '複習'}</h1>
            {selectedSubject && (
              <span className="sh-sheet-meta">已選 {selectedChapterIds.size} 卷</span>
            )}
          </div>

          {selectedSubject ? (
            <>
              <ul className="sh-toc">
                {chaptersForSubject.map((chapter) => (
                  <li key={chapter.id} className="sh-toc-row">
                    <label className="hm-check">
                      <input
                        type="checkbox"
                        checked={selectedChapterIds.has(chapter.id)}
                        onChange={() => toggleChapter(chapter.id)}
                      />
                      <span className="sh-toc-name">{chapter.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="hm-bar">
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
              </div>
            </>
          ) : (
            <p className="sh-empty">選一個科目，挑幾卷來複習。</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 5: 跑測試確認全部通過**

Run: `npm test`
Expected: PASS，測試數從 71 增加到 72。既有三個 HomePage 測試必須維持綠燈 —— 若 `getByLabelText('第一章')` 失敗，代表 `<label className="hm-check">` 與 checkbox 的關聯斷了，修 label 而不是改測試。

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/home.css
git commit -m "feat: put the subject shelf and contents sheet on the picker page"
```

---

## Task 6: 測驗頁的外框

**Files:**
- Modify: `src/pages/QuizPage.tsx`
- Modify: `src/components/quiz/QuizEngine.tsx`
- Modify: `src/components/quiz/quiz.css`
- Test: `src/pages/QuizPage.test.tsx`

**Interfaces:**
- Consumes: `AppShell`（Task 3）。
- `QuizEngine` 的 props（`{ questions, title }`）與所有作答行為不得更動 —— 只加版面容器與 className。**`QuizEngine` 不得 import `AppShell`**，外框由 `QuizPage` 負責，這樣 `QuizEngine.test.tsx` 才不需要 Router context。

- [ ] **Step 1: 寫失敗測試**

`src/pages/QuizPage.test.tsx` 已經有一個 `renderAt(initialEntries)` helper，沿用它。在 `describe('QuizPage', ...)` 內加入：

```tsx
  it('wraps the quiz in the app shell', () => {
    renderAt([
      {
        pathname: '/quiz',
        state: {
          title: '測試複習',
          questions: [
            { id: 'q1', chapterId: 'c1', stem: '題目一', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: 'e' },
          ],
        },
      },
    ])

    expect(screen.getByText('問答題庫')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '題庫' })).toBeInTheDocument()
  })
```

既有的 `redirects to home when there is no navigation state` 測試不受影響 —— `Navigate` 在 `AppShell` 之前就回傳了，shell 根本不會渲染。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/pages/QuizPage.test.tsx`
Expected: FAIL，找不到「問答題庫」。

- [ ] **Step 3: 在 `src/components/quiz/quiz.css` 最上方加入版面容器**

```css
.quiz-page { display: flex; flex-direction: column; gap: 1rem; line-height: 1.9; }
.quiz-title {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 3vw, 1.35rem);
  font-weight: 600;
  letter-spacing: .06em;
  margin: 0;
}
```

- [ ] **Step 4: 給 `QuizEngine` 的 return 加上容器**

`QuizEngine.tsx` 目前沒有 import `./quiz.css`（樣式由子元件帶入），用到新 class 後需要自己 import。在檔案的 import 區加入：

```tsx
import './quiz.css'
```

再把最後的 return 換成（`if (finished)` 分支不動）：

```tsx
  return (
    <div className="quiz-page">
      <h1 className="quiz-title">{title}</h1>
      <ProgressRail total={questions.length} current={currentIndex} results={results} />
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
  )
```

- [ ] **Step 5: 把 `QuizPage` 包進 shell**

把 `src/pages/QuizPage.tsx` 整份換成：

```tsx
import { Navigate, useLocation } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { QuizEngine } from '../components/quiz/QuizEngine'
import type { Question } from '../lib/schema'

type QuizNavigationState = { questions: Question[]; title: string }

export default function QuizPage() {
  const location = useLocation()
  const state = location.state as QuizNavigationState | null

  if (!state?.questions || state.questions.length === 0) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell zone="quiz">
      <QuizEngine questions={state.questions} title={state.title ?? '測驗'} />
    </AppShell>
  )
}
```

- [ ] **Step 6: 跑完整測試**

Run: `npm test`
Expected: PASS，測試數從 72 增加到 73。`QuizEngine.test.tsx` 的四個測試必須維持綠燈 —— 它直接渲染 `QuizEngine`、沒有 Router，所以 `QuizEngine` 絕對不能 import `AppShell`。

- [ ] **Step 7: 建置確認**

Run: `npm run build`
Expected: TypeScript 編譯與 Vite 打包皆成功。

- [ ] **Step 8: Commit**

```bash
git add src/pages/QuizPage.tsx src/pages/QuizPage.test.tsx src/components/quiz/QuizEngine.tsx src/components/quiz/quiz.css
git commit -m "feat: frame the quiz page with the shared app shell"
```

---

## Task 7: 目視驗收

**Files:** 無（不改 code；若發現問題，修正後併入本 task 的 commit）

視覺本身不寫自動化測試，這一關用眼睛確認。

- [ ] **Step 1: 起 dev server**

Run: `npm run dev`

- [ ] **Step 2: 逐項確認**

在瀏覽器打開 `http://localhost:5173`：

1. 首頁書背是**直排**中文，點選後往右推出、變成松綠底。
2. 點科目 → 目次列出章節，勾選後「開始複習」由停用轉為可用。
3. 開始複習 → 測驗頁有頁首與標題，作答、朱批、成績單行為與改版前一致。
4. 進 `http://localhost:5173/dashboard` → 書架與目次出現，朱批區顯示「題庫沒有問題。」
5. 頁首的「複習 / 題庫」會隨當前頁面高亮。
6. 鍵盤 Tab 走一遍：書背與導覽連結都有可見的松綠外框。
7. 視窗縮到 640px 以下：書架變成頂端橫向可捲的科目條，文字轉橫排，頁面沒有橫向捲軸。
8. 作業系統切成深色模式：兩區都可讀，朱批仍是朱紅。
9. 作業系統開啟「減少動態效果」：選中書背不位移，只換色。

- [ ] **Step 3: 製造一個壞掉的章節，確認體檢表抓得到**

```bash
node -e "const fs=require('fs');const p='public/data/index.json';const d=JSON.parse(fs.readFileSync(p,'utf8'));d.chapters.push({id:'c-ghost',subjectId:'s-guowen',name:'幽靈章節',order:9});fs.writeFileSync(p,JSON.stringify(d,null,2))"
```

重新整理 `/dashboard`，確認朱批出現「幽靈章節 · 檔案不存在」，且訊息指出 `/data/questions/c-ghost.json`。

- [ ] **Step 4: 還原種子資料**

```bash
git checkout public/data/index.json
```

Run: `git status --short`
Expected: 沒有未預期的異動。

- [ ] **Step 5: 跑完整驗證**

Run: `npm test && npm run build`
Expected: 73 個測試全過、建置成功。

- [ ] **Step 6: 若步驟 2 有修正，commit**

```bash
git add -A
git commit -m "fix: address visual review findings on the shelf and bank page"
```

若沒有任何修正，跳過這一步，不要製造空 commit。
