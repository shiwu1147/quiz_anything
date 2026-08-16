# Quiz App Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the read-only quiz-taking side of the app — a Vite + React + TypeScript SPA with a generalized `QuizEngine`, a same-subject multi-chapter picker, and seeded sample question-bank data — so it works end to end before the Dashboard (a separate follow-up plan) adds content-editing.

**Architecture:** Client-only SPA. `public/data/index.json` + `public/data/questions/<chapterId>.json` are fetched at runtime and validated with Zod schemas. A pure, presentation-only `QuizEngine` component (ported from the reference artifact's UI/interaction) renders whatever `Question[]` it's given. A picker page lets the user choose one subject, then multiple chapters within it, merges + optionally shuffles their questions, and hands them to the quiz page via React Router navigation state.

**Tech Stack:** Vite, React 18, TypeScript, react-router-dom, zod, Vitest, @testing-library/react, jsdom.

## Global Constraints

- Pure frontend, no backend/database — data lives in static JSON under `public/data/`.
- Single user, no auth/login anywhere in this plan.
- Chapter multi-select is scoped to one subject at a time (not cross-subject).
- Visual style must follow the reference artifact's "稿紙" (grid paper) aesthetic: the CSS variables, colors, rail/card/option/note/score styling are ported, not reinvented.
- Physical data folder is `public/data/` (Vite serves `public/` at the site root, so this is fetched at `/data/...` at runtime — this exact path is what the Dashboard plan will later write into).

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/index.css`
- Create: `src/test/setup.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: `App` default export (`src/App.tsx`) — a React component, currently a placeholder, replaced by routing in Task 9.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "quiz-anything",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Write vite.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Write src/test/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Write index.html**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>問答題庫</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write src/index.css**

Root variables and base styles ported from the reference artifact, shared by every page/component.

```css
:root {
  --ground:      #F2F4EF;
  --surface:     #FCFDFA;
  --surface-2:   #E9EDE5;
  --rule:        #D3DACB;
  --rule-soft:   rgba(31,107,79,.10);
  --ink:         #1B211D;
  --ink-2:       #4E574F;
  --ink-3:       #7C857D;
  --accent:      #1F6B4F;
  --accent-ink:  #12402F;
  --accent-soft: #DCE9E0;
  --accent-line: #9EC4AE;
  --vermilion:   #A93226;
  --verm-soft:   #F6E2DF;
  --verm-line:   #DCA69E;
  --shadow: 0 1px 2px rgba(27,33,29,.05), 0 8px 24px -12px rgba(27,33,29,.18);
  --font-display: "Noto Serif TC","Source Han Serif TC","Songti TC","PMingLiU","MingLiU",serif;
  --font-body: "Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC","Helvetica Neue",sans-serif;
  --font-mono: ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground:      #12160F;
    --surface:     #1A1F19;
    --surface-2:   #232921;
    --rule:        #333B31;
    --rule-soft:   rgba(122,193,157,.10);
    --ink:         #E7EBE2;
    --ink-2:       #A9B2A6;
    --ink-3:       #7C857B;
    --accent:      #7AC19D;
    --accent-ink:  #C6E6D5;
    --accent-soft: #1E3229;
    --accent-line: #3E6852;
    --vermilion:   #E3897C;
    --verm-soft:   #33211E;
    --verm-line:   #6E403A;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px -14px rgba(0,0,0,.7);
  }
}

* { box-sizing: border-box; }

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

- [ ] **Step 7: Write src/App.tsx (placeholder)**

```tsx
export default function App() {
  return <h1>問答題庫</h1>
}
```

- [ ] **Step 8: Write src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Write the smoke test src/App.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('問答題庫')).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Write .gitignore**

```
node_modules
dist
.vite
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json` and `node_modules/`.

- [ ] **Step 12: Run the test suite to verify it passes**

Run: `npm test`
Expected: PASS — 1 test passed (`App > renders without crashing`).

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src .gitignore
git commit -m "chore: scaffold Vite + React + TypeScript project with Vitest"
```

---

## Task 2: Data Model & Schema Validation

**Files:**
- Create: `src/lib/schema.ts`
- Test: `src/lib/schema.test.ts`

**Interfaces:**
- Produces: `subjectSchema`, `chapterSchema`, `questionSchema`, `indexDataSchema`, `questionArraySchema` (Zod schemas), and types `Subject`, `Chapter`, `Question`, `IndexData` — used by every later task that touches question-bank data.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/schema.test.ts
import { describe, it, expect } from 'vitest'
import { subjectSchema, chapterSchema, questionSchema, indexDataSchema } from './schema'

describe('subjectSchema', () => {
  it('accepts a valid subject', () => {
    expect(subjectSchema.safeParse({ id: 's1', name: '國文', order: 0 }).success).toBe(true)
  })

  it('rejects a subject missing a name', () => {
    expect(subjectSchema.safeParse({ id: 's1', order: 0 }).success).toBe(false)
  })
})

describe('chapterSchema', () => {
  it('accepts a valid chapter', () => {
    const result = chapterSchema.safeParse({ id: 'c1', subjectId: 's1', name: '第一章', order: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects a chapter missing subjectId', () => {
    expect(chapterSchema.safeParse({ id: 'c1', name: '第一章', order: 0 }).success).toBe(false)
  })
})

describe('questionSchema', () => {
  const base = {
    id: 'q1',
    chapterId: 'c1',
    stem: '題幹',
    options: ['A', 'B', 'C', 'D'],
    answerIndex: 1,
    explanation: '解析',
  }

  it('accepts a valid question', () => {
    expect(questionSchema.safeParse(base).success).toBe(true)
  })

  it('accepts a valid question with an optional tag', () => {
    expect(questionSchema.safeParse({ ...base, tag: '分類' }).success).toBe(true)
  })

  it('rejects an answerIndex out of range', () => {
    expect(questionSchema.safeParse({ ...base, answerIndex: 4 }).success).toBe(false)
  })

  it('rejects options with fewer than 4 entries', () => {
    expect(questionSchema.safeParse({ ...base, options: ['A', 'B'] }).success).toBe(false)
  })
})

describe('indexDataSchema', () => {
  it('accepts subjects and chapters together', () => {
    const result = indexDataSchema.safeParse({
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [{ id: 'c1', subjectId: 's1', name: '第一章', order: 0 }],
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL — cannot find module `./schema`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/schema.ts
import { z } from 'zod'

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
})

export const chapterSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  tag: z.string().optional(),
  stem: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
})

export const indexDataSchema = z.object({
  subjects: z.array(subjectSchema),
  chapters: z.array(chapterSchema),
})

export const questionArraySchema = z.array(questionSchema)

export type Subject = z.infer<typeof subjectSchema>
export type Chapter = z.infer<typeof chapterSchema>
export type Question = z.infer<typeof questionSchema>
export type IndexData = z.infer<typeof indexDataSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat: add Zod schemas for subjects, chapters and questions"
```

---

## Task 3: Data Loader

**Files:**
- Create: `src/lib/dataLoader.ts`
- Test: `src/lib/dataLoader.test.ts`

**Interfaces:**
- Consumes: `indexDataSchema`, `questionArraySchema`, `IndexData`, `Question` from `src/lib/schema.ts` (Task 2).
- Produces: `loadIndex(): Promise<IndexData>`, `loadChapterQuestions(chapterId: string): Promise<Question[]>`, `loadMergedQuestions(chapterIds: string[]): Promise<Question[]>` — used by the picker page (Task 7).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/dataLoader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadIndex, loadChapterQuestions, loadMergedQuestions } from './dataLoader'

function mockFetchOnce(url: string, body: unknown, ok = true, status = 200) {
  return { url, ok, status, json: async () => body }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('loadIndex', () => {
  it('fetches and parses /data/index.json', async () => {
    const payload = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [{ id: 'c1', subjectId: 's1', name: '第一章', order: 0 }],
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, payload)))

    const result = await loadIndex()

    expect(fetch).toHaveBeenCalledWith('/data/index.json')
    expect(result).toEqual(payload)
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, {}, false, 404)))

    await expect(loadIndex()).rejects.toThrow(/HTTP 404/)
  })

  it('throws a descriptive error when the shape is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, { subjects: 'not-an-array' })))

    await expect(loadIndex()).rejects.toThrow(/題庫索引格式錯誤/)
  })
})

describe('loadChapterQuestions', () => {
  it('fetches and parses /data/questions/<chapterId>.json', async () => {
    const payload = [{
      id: 'q1', chapterId: 'c1', stem: '題幹',
      options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
    }]
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, payload)))

    const result = await loadChapterQuestions('c1')

    expect(fetch).toHaveBeenCalledWith('/data/questions/c1.json')
    expect(result).toEqual(payload)
  })

  it('throws a descriptive error naming the chapter when the shape is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, [{ id: 'q1' }])))

    await expect(loadChapterQuestions('c1')).rejects.toThrow(/章節 c1 的題目格式錯誤/)
  })
})

describe('loadMergedQuestions', () => {
  it('concatenates questions from multiple chapters in the given order', async () => {
    const q = (id: string, chapterId: string) => ({
      id, chapterId, stem: '題幹', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
    })
    const byUrl: Record<string, unknown> = {
      '/data/questions/c1.json': [q('q1', 'c1')],
      '/data/questions/c2.json': [q('q2', 'c2'), q('q3', 'c2')],
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, byUrl[url])))

    const result = await loadMergedQuestions(['c1', 'c2'])

    expect(result.map((q) => q.id)).toEqual(['q1', 'q2', 'q3'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dataLoader.test.ts`
Expected: FAIL — cannot find module `./dataLoader`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/dataLoader.ts
import { indexDataSchema, questionArraySchema, type IndexData, type Question } from './schema'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`無法載入 ${url}（HTTP ${res.status}）`)
  }
  return res.json()
}

export async function loadIndex(): Promise<IndexData> {
  const raw = await fetchJson('/data/index.json')
  const result = indexDataSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`題庫索引格式錯誤：${result.error.message}`)
  }
  return result.data
}

export async function loadChapterQuestions(chapterId: string): Promise<Question[]> {
  const raw = await fetchJson(`/data/questions/${chapterId}.json`)
  const result = questionArraySchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`章節 ${chapterId} 的題目格式錯誤：${result.error.message}`)
  }
  return result.data
}

export async function loadMergedQuestions(chapterIds: string[]): Promise<Question[]> {
  const lists = await Promise.all(chapterIds.map((id) => loadChapterQuestions(id)))
  return lists.flat()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dataLoader.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dataLoader.ts src/lib/dataLoader.test.ts
git commit -m "feat: add data loader that fetches and validates question-bank JSON"
```

---

## Task 4: Quiz Pure Logic (shuffle & scoring)

**Files:**
- Create: `src/lib/quizLogic.ts`
- Test: `src/lib/quizLogic.test.ts`

**Interfaces:**
- Produces: `shuffle<T>(items: T[], rng?: () => number): T[]`, `scoreCommentary(pct: number): string` — used by the picker page (Task 7) and `ScoreSummary` (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/quizLogic.test.ts
import { describe, it, expect } from 'vitest'
import { shuffle, scoreCommentary } from './quizLogic'

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4]
    const result = shuffle(input, () => 0.999)
    expect(result).not.toBe(input)
    expect([...result].sort()).toEqual([1, 2, 3, 4])
  })

  it('produces a deterministic order for a deterministic rng', () => {
    const result = shuffle([1, 2, 3, 4], () => 0)
    expect(result).toEqual([2, 3, 4, 1])
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    shuffle(input, () => 0)
    expect(input).toEqual([1, 2, 3])
  })
})

describe('scoreCommentary', () => {
  it('returns the top-tier message at 90% and above', () => {
    expect(scoreCommentary(90)).toMatch(/推進/)
    expect(scoreCommentary(100)).toMatch(/推進/)
  })

  it('returns the second-tier message between 70% and 89%', () => {
    expect(scoreCommentary(70)).toMatch(/解析/)
    expect(scoreCommentary(89)).toMatch(/解析/)
  })

  it('returns the third-tier message between 50% and 69%', () => {
    expect(scoreCommentary(50)).toMatch(/重讀/)
    expect(scoreCommentary(69)).toMatch(/重讀/)
  })

  it('returns the lowest-tier message below 50%', () => {
    expect(scoreCommentary(0)).toMatch(/答錯題目/)
    expect(scoreCommentary(49)).toMatch(/答錯題目/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/quizLogic.test.ts`
Expected: FAIL — cannot find module `./quizLogic`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/quizLogic.ts
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function scoreCommentary(pct: number): string {
  if (pct >= 90) return '掌握度已經相當穩固，可以往下一個範圍推進。'
  if (pct >= 70) return '基礎不錯，把答錯的題目再看過一次解析即可。'
  if (pct >= 50) return '還有一半左右不熟，建議重讀相關內容後再測一次。'
  return '先把答錯題目的解析讀熟，再回頭重測一次會更有感。'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/quizLogic.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quizLogic.ts src/lib/quizLogic.test.ts
git commit -m "feat: add shuffle and score-commentary pure logic"
```

---

## Task 5: Presentational Quiz Components

**Files:**
- Create: `src/components/quiz/ProgressRail.tsx`
- Create: `src/components/quiz/QuestionCard.tsx`
- Create: `src/components/quiz/ScoreSummary.tsx`
- Create: `src/components/quiz/quiz.css`
- Test: `src/components/quiz/ProgressRail.test.tsx`
- Test: `src/components/quiz/QuestionCard.test.tsx`
- Test: `src/components/quiz/ScoreSummary.test.tsx`

**Interfaces:**
- Consumes: `Question` type from `src/lib/schema.ts` (Task 2), `scoreCommentary` from `src/lib/quizLogic.ts` (Task 4).
- Produces:
  - `ProgressRail(props: { total: number; current: number; results: Array<'right' | 'wrong' | null> })`
  - `QuestionCard(props: { question: Question; questionNumber: number; total: number; picked: number | null; onAnswer: (index: number) => void; onNext: () => void; isLast: boolean })`
  - `ScoreSummary(props: { hits: number; total: number; wrongEntries: Array<{ question: Question; questionNumber: number }>; onRestart: () => void })`
  - all consumed by `QuizEngine` (Task 6).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/quiz/ProgressRail.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressRail } from './ProgressRail'

describe('ProgressRail', () => {
  it('renders one list item per question', () => {
    const { container } = render(<ProgressRail total={5} current={0} results={[null, null, null, null, null]} />)
    expect(container.querySelectorAll('li')).toHaveLength(5)
  })

  it('marks answered questions as right or wrong', () => {
    const { container } = render(
      <ProgressRail total={3} current={2} results={['right', 'wrong', null]} />,
    )
    const items = container.querySelectorAll('li')
    expect(items[0]).toHaveClass('is-right')
    expect(items[1]).toHaveClass('is-wrong')
    expect(items[2]).not.toHaveClass('is-right')
    expect(items[2]).not.toHaveClass('is-wrong')
  })

  it('marks the current unanswered question as "here"', () => {
    const { container } = render(<ProgressRail total={2} current={1} results={['right', null]} />)
    const items = container.querySelectorAll('li')
    expect(items[1]).toHaveClass('is-here')
    expect(items[0]).not.toHaveClass('is-here')
  })
})
```

```tsx
// src/components/quiz/QuestionCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QuestionCard } from './QuestionCard'
import type { Question } from '../../lib/schema'

const question: Question = {
  id: 'q1',
  chapterId: 'c1',
  tag: '測試分類',
  stem: '這是題幹',
  options: ['選項一', '選項二', '選項三', '選項四'],
  answerIndex: 1,
  explanation: '這是解析',
}

describe('QuestionCard', () => {
  it('renders the stem and all options', () => {
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        total={10}
        picked={null}
        onAnswer={() => {}}
        onNext={() => {}}
        isLast={false}
      />,
    )
    expect(screen.getByText('這是題幹')).toBeInTheDocument()
    expect(screen.getByText('選項二')).toBeInTheDocument()
  })

  it('calls onAnswer with the clicked option index when unanswered', async () => {
    const onAnswer = vi.fn()
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        total={10}
        picked={null}
        onAnswer={onAnswer}
        onNext={() => {}}
        isLast={false}
      />,
    )
    await userEvent.click(screen.getByText('選項二'))
    expect(onAnswer).toHaveBeenCalledWith(1)
  })

  it('shows the explanation and disables options once answered', () => {
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        total={10}
        picked={1}
        onAnswer={() => {}}
        onNext={() => {}}
        isLast={false}
      />,
    )
    expect(screen.getByText('這是解析')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /選項一/ })).toBeDisabled()
  })

  it('labels the next button "看成績" on the last question', () => {
    render(
      <QuestionCard
        question={question}
        questionNumber={10}
        total={10}
        picked={1}
        onAnswer={() => {}}
        onNext={() => {}}
        isLast={true}
      />,
    )
    expect(screen.getByRole('button', { name: /看成績/ })).toBeInTheDocument()
  })
})
```

```tsx
// src/components/quiz/ScoreSummary.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ScoreSummary } from './ScoreSummary'
import type { Question } from '../../lib/schema'

const question: Question = {
  id: 'q1',
  chapterId: 'c1',
  stem: '題幹',
  options: ['A', 'B', 'C', 'D'],
  answerIndex: 2,
  explanation: '解析文字',
}

describe('ScoreSummary', () => {
  it('shows the hit count and total', () => {
    render(<ScoreSummary hits={8} total={10} wrongEntries={[]} onRestart={() => {}} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('/10')).toBeInTheDocument()
  })

  it('lists wrong entries with their explanation', () => {
    render(
      <ScoreSummary
        hits={0}
        total={1}
        wrongEntries={[{ question, questionNumber: 1 }]}
        onRestart={() => {}}
      />,
    )
    expect(screen.getByText('解析文字')).toBeInTheDocument()
  })

  it('calls onRestart when the restart button is clicked', async () => {
    const onRestart = vi.fn()
    render(<ScoreSummary hits={1} total={1} wrongEntries={[]} onRestart={onRestart} />)
    await userEvent.click(screen.getByRole('button', { name: /再測一次/ }))
    expect(onRestart).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/quiz`
Expected: FAIL — cannot find modules `./ProgressRail`, `./QuestionCard`, `./ScoreSummary`.

- [ ] **Step 3: Write src/components/quiz/quiz.css**

```css
.card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 3px;
  box-shadow: var(--shadow);
  padding: clamp(1.25rem, 4vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background-image:
    repeating-linear-gradient(to right, var(--rule-soft) 0 1px, transparent 1px 28px),
    repeating-linear-gradient(to bottom, var(--rule-soft) 0 1px, transparent 1px 28px);
}

.rail { display: grid; grid-template-columns: repeat(auto-fit, minmax(6px, 1fr)); gap: 3px; padding: 0; margin: 0; list-style: none; }
.rail li { height: 10px; border: 1px solid var(--rule); background: var(--surface); border-radius: 1px; }
.rail li.is-right { background: var(--accent); border-color: var(--accent); }
.rail li.is-wrong { background: var(--vermilion); border-color: var(--vermilion); }
.rail li.is-here { border-color: var(--ink); border-width: 2px; }

.qhead { display: flex; align-items: baseline; gap: .75rem; }
.qnum {
  font-family: var(--font-mono); font-size: .78rem; color: var(--accent);
  border: 1px solid var(--accent-line); background: var(--accent-soft);
  padding: .1rem .45rem; border-radius: 2px;
}
.qtag { font-size: .74rem; letter-spacing: .08em; color: var(--ink-3); }
.stem { font-family: var(--font-display); font-size: clamp(1.05rem, 2.6vw, 1.2rem); line-height: 1.9; margin: 0; }
.stem em { font-style: normal; border-bottom: 2px solid var(--accent-line); padding-bottom: 1px; }

.opts { display: flex; flex-direction: column; gap: .55rem; }
.opt {
  display: flex; align-items: flex-start; gap: .7rem; width: 100%; text-align: left;
  font: inherit; font-family: var(--font-display); line-height: 1.8; color: var(--ink);
  background: var(--surface); border: 1px solid var(--rule); border-radius: 2px;
  padding: .7rem .9rem; cursor: pointer;
}
.opt:hover:not(:disabled) { border-color: var(--accent-line); background: var(--accent-soft); }
.opt:disabled { cursor: default; }
.opt .key { font-family: var(--font-mono); font-size: .8rem; color: var(--ink-3); flex: none; min-width: 1.6rem; }
.opt.right { border-color: var(--accent); background: var(--accent-soft); }
.opt.right .key { color: var(--accent); }
.opt.wrong { border-color: var(--vermilion); background: var(--verm-soft); }
.opt.wrong .key { color: var(--vermilion); }
.opt.dim { opacity: .5; }

.note {
  border-left: 3px solid var(--vermilion); background: var(--surface-2);
  padding: .85rem 1rem; display: flex; flex-direction: column; gap: .4rem; border-radius: 0 2px 2px 0;
}
.note .verdict { font-family: var(--font-mono); font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; }
.note.ok .verdict { color: var(--accent); }
.note.ok { border-left-color: var(--accent); }
.note.no .verdict { color: var(--vermilion); }
.note p { margin: 0; font-size: .92rem; color: var(--ink-2); line-height: 1.85; }

.bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
button.go {
  font: inherit; font-size: .92rem; letter-spacing: .04em; color: var(--surface);
  background: var(--accent); border: 1px solid var(--accent); border-radius: 2px;
  padding: .5rem 1.4rem; cursor: pointer;
}
button.ghost {
  font: inherit; font-size: .88rem; color: var(--ink-2); background: transparent;
  border: 1px solid var(--rule); border-radius: 2px; padding: .45rem 1.1rem; cursor: pointer;
}

.score { display: flex; flex-direction: column; gap: .3rem; align-items: center; text-align: center; padding: 1rem 0 .5rem; }
.score .big { font-family: var(--font-mono); font-size: clamp(3rem, 12vw, 4.5rem); line-height: 1; color: var(--accent); }
.score .big span { font-size: .35em; color: var(--ink-3); }

.review { display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0; list-style: none; }
.review li { display: grid; grid-template-columns: 3rem 1fr; gap: .8rem; padding: .8rem 0; border-top: 1px solid var(--rule); font-size: .9rem; }
.review li .n { font-family: var(--font-mono); font-size: .78rem; color: var(--vermilion); }
.review li .txt { color: var(--ink-2); line-height: 1.8; }
```

- [ ] **Step 4: Write src/components/quiz/ProgressRail.tsx**

```tsx
// src/components/quiz/ProgressRail.tsx
import './quiz.css'

export type RailResult = 'right' | 'wrong' | null

export function ProgressRail({
  total,
  current,
  results,
}: {
  total: number
  current: number
  results: RailResult[]
}) {
  return (
    <ol className="rail" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i]
        const classes = ['']
        if (result === 'right') classes.push('is-right')
        if (result === 'wrong') classes.push('is-wrong')
        if (i === current && result === null) classes.push('is-here')
        return <li key={i} className={classes.filter(Boolean).join(' ')} />
      })}
    </ol>
  )
}
```

- [ ] **Step 5: Write src/components/quiz/QuestionCard.tsx**

```tsx
// src/components/quiz/QuestionCard.tsx
import './quiz.css'
import type { Question } from '../../lib/schema'

const KEYS = ['(A)', '(B)', '(C)', '(D)']

export function QuestionCard({
  question,
  questionNumber,
  total,
  picked,
  onAnswer,
  onNext,
  isLast,
}: {
  question: Question
  questionNumber: number
  total: number
  picked: number | null
  onAnswer: (index: number) => void
  onNext: () => void
  isLast: boolean
}) {
  const locked = picked !== null
  const ok = locked && picked === question.answerIndex

  return (
    <div className="card">
      <div className="qhead">
        <span className="qnum">Q{String(questionNumber).padStart(2, '0')}</span>
        {question.tag && <span className="qtag">{question.tag}</span>}
      </div>
      <p className="stem" dangerouslySetInnerHTML={{ __html: question.stem }} />
      <div className="opts">
        {question.options.map((text, n) => {
          const classes = ['opt']
          if (locked) {
            if (n === question.answerIndex) classes.push('right')
            else if (n === picked) classes.push('wrong')
            else classes.push('dim')
          }
          return (
            <button
              key={n}
              type="button"
              className={classes.join(' ')}
              disabled={locked}
              onClick={() => onAnswer(n)}
            >
              <span className="key">{KEYS[n]}</span>
              <span dangerouslySetInnerHTML={{ __html: text }} />
            </button>
          )
        })}
      </div>
      {locked && (
        <div className={`note ${ok ? 'ok' : 'no'}`}>
          <span className="verdict">{ok ? '答對' : `答錯　正解 ${KEYS[question.answerIndex]}`}</span>
          <p dangerouslySetInnerHTML={{ __html: question.explanation }} />
        </div>
      )}
      <div className="bar">
        <span>第 {questionNumber} / {total} 題</span>
        {locked && (
          <button type="button" className="go" onClick={onNext}>
            {isLast ? '看成績 →' : '下一題 →'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write src/components/quiz/ScoreSummary.tsx**

```tsx
// src/components/quiz/ScoreSummary.tsx
import './quiz.css'
import type { Question } from '../../lib/schema'
import { scoreCommentary } from '../../lib/quizLogic'

export function ScoreSummary({
  hits,
  total,
  wrongEntries,
  onRestart,
}: {
  hits: number
  total: number
  wrongEntries: Array<{ question: Question; questionNumber: number }>
  onRestart: () => void
}) {
  const pct = total === 0 ? 0 : Math.round((hits / total) * 100)

  return (
    <div className="card">
      <div className="score">
        <div className="big">{hits}<span>/{total}</span></div>
        <div>答對率 {pct}%</div>
        <p>{scoreCommentary(pct)}</p>
      </div>
      {wrongEntries.length > 0 ? (
        <ul className="review">
          {wrongEntries.map(({ question, questionNumber }) => (
            <li key={question.id}>
              <span className="n">Q{String(questionNumber).padStart(2, '0')}</span>
              <span className="txt" dangerouslySetInnerHTML={{ __html: question.explanation }} />
            </li>
          ))}
        </ul>
      ) : (
        <p>全數答對，無錯題</p>
      )}
      <div className="bar">
        <span>重測會清空計分</span>
        <button type="button" className="ghost" onClick={onRestart}>再測一次</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components/quiz`
Expected: PASS — 10 tests passed.

- [ ] **Step 8: Commit**

```bash
git add src/components/quiz
git commit -m "feat: add presentational quiz components (rail, question card, score summary)"
```

---

## Task 6: QuizEngine Orchestrator

**Files:**
- Create: `src/components/quiz/QuizEngine.tsx`
- Test: `src/components/quiz/QuizEngine.test.tsx`

**Interfaces:**
- Consumes: `Question` type (Task 2), `ProgressRail`/`RailResult`, `QuestionCard`, `ScoreSummary` (Task 5).
- Produces: `QuizEngine(props: { questions: Question[]; title: string })` — used by `QuizPage` (Task 8).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/quiz/QuizEngine.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { QuizEngine } from './QuizEngine'
import type { Question } from '../../lib/schema'

const questions: Question[] = [
  {
    id: 'q1', chapterId: 'c1', stem: '第一題', options: ['甲', '乙', '丙', '丁'],
    answerIndex: 0, explanation: '第一題解析',
  },
  {
    id: 'q2', chapterId: 'c1', stem: '第二題', options: ['甲', '乙', '丙', '丁'],
    answerIndex: 2, explanation: '第二題解析',
  },
]

describe('QuizEngine', () => {
  it('answers via click, shows explanation, and advances to the next question', async () => {
    render(<QuizEngine questions={questions} title="測試" />)
    expect(screen.getByText('第一題')).toBeInTheDocument()

    await userEvent.click(screen.getByText('甲'))
    expect(screen.getByText('第一題解析')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /下一題/ }))
    expect(screen.getByText('第二題')).toBeInTheDocument()
  })

  it('answers via keyboard (1-4) and advances via Enter', async () => {
    render(<QuizEngine questions={questions} title="測試" />)
    await userEvent.keyboard('1')
    expect(screen.getByText('第一題解析')).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText('第二題')).toBeInTheDocument()
  })

  it('shows the score summary after the last question, with correct hit count', async () => {
    render(<QuizEngine questions={questions} title="測試" />)
    await userEvent.click(screen.getByText('甲')) // correct (answerIndex 0)
    await userEvent.click(screen.getByRole('button', { name: /下一題/ }))
    await userEvent.click(screen.getByText('甲')) // wrong (answerIndex is 丙/index 2)
    await userEvent.click(screen.getByRole('button', { name: /看成績/ }))

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('/2')).toBeInTheDocument()
  })

  it('restarts the quiz when "再測一次" is clicked', async () => {
    render(<QuizEngine questions={questions} title="測試" />)
    await userEvent.click(screen.getByText('甲'))
    await userEvent.click(screen.getByRole('button', { name: /下一題/ }))
    await userEvent.click(screen.getByText('甲'))
    await userEvent.click(screen.getByRole('button', { name: /看成績/ }))

    await userEvent.click(screen.getByRole('button', { name: /再測一次/ }))
    expect(screen.getByText('第一題')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/quiz/QuizEngine.test.tsx`
Expected: FAIL — cannot find module `./QuizEngine`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/quiz/QuizEngine.tsx
import { useEffect, useState } from 'react'
import { ProgressRail, type RailResult } from './ProgressRail'
import { QuestionCard } from './QuestionCard'
import { ScoreSummary } from './ScoreSummary'
import type { Question } from '../../lib/schema'

const KEY_MAP: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }

export function QuizEngine({ questions, title }: { questions: Question[]; title: string }) {
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [finished, setFinished] = useState(false)

  const locked = answers[currentIndex] !== null
  const isLast = currentIndex === questions.length - 1

  function handleAnswer(pick: number) {
    if (locked || finished) return
    setAnswers((prev) => {
      const next = [...prev]
      next[currentIndex] = pick
      return next
    })
  }

  function handleNext() {
    if (!locked || finished) return
    if (isLast) {
      setFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function handleRestart() {
    setAnswers(questions.map(() => null))
    setCurrentIndex(0)
    setFinished(false)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (finished) return
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (locked) handleNext()
        return
      }
      if (locked) return
      const n = KEY_MAP[e.key.toLowerCase()]
      if (n !== undefined) handleAnswer(n)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (finished) {
    const hits = answers.filter((a, i) => a === questions[i].answerIndex).length
    const wrongEntries = questions
      .map((question, i) => ({ question, questionNumber: i + 1, picked: answers[i] }))
      .filter(({ question, picked }) => picked !== null && picked !== question.answerIndex)
      .map(({ question, questionNumber }) => ({ question, questionNumber }))

    return <ScoreSummary hits={hits} total={questions.length} wrongEntries={wrongEntries} onRestart={handleRestart} />
  }

  const results: RailResult[] = answers.map((a, i) =>
    a === null ? null : a === questions[i].answerIndex ? 'right' : 'wrong',
  )

  return (
    <div>
      <h1>{title}</h1>
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
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/quiz/QuizEngine.test.tsx`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz/QuizEngine.tsx src/components/quiz/QuizEngine.test.tsx
git commit -m "feat: add QuizEngine orchestrator with keyboard and click answering"
```

---

## Task 7: Picker Page (HomePage)

**Files:**
- Create: `src/pages/HomePage.tsx`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `loadIndex`, `loadMergedQuestions` from `src/lib/dataLoader.ts` (Task 3), `shuffle` from `src/lib/quizLogic.ts` (Task 4), `IndexData` type (Task 2).
- Produces: `HomePage` default export. Navigates to `/quiz` with `location.state = { questions: Question[], title: string }` — consumed by `QuizPage` (Task 8).

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/HomePage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import HomePage from './HomePage'
import * as dataLoader from '../lib/dataLoader'

vi.mock('../lib/dataLoader')

function QuizStub() {
  const location = useLocation()
  const state = location.state as { title?: string; questions?: unknown[] } | null
  return <div>QUIZ:{state?.title}:{state?.questions?.length}</div>
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz" element={<QuizStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

const indexData = {
  subjects: [{ id: 's1', name: '國文', order: 0 }],
  chapters: [
    { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
    { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
  ],
}

describe('HomePage', () => {
  it('lists chapters for the selected subject and starts the quiz with merged questions', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.loadMergedQuestions).mockResolvedValue([
      { id: 'q1', chapterId: 'c1', stem: '題', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: 'e' },
      { id: 'q2', chapterId: 'c2', stem: '題', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: 'e' },
    ])

    renderHome()

    await userEvent.click(await screen.findByText('國文'))
    await userEvent.click(screen.getByText('第一章'))
    await userEvent.click(screen.getByText('第二章'))
    await userEvent.click(screen.getByRole('button', { name: /開始複習/ }))

    expect(dataLoader.loadMergedQuestions).toHaveBeenCalledWith(['c1', 'c2'])
    expect(await screen.findByText(/QUIZ:國文/)).toBeInTheDocument()
    expect(screen.getByText(/QUIZ:國文:2/)).toBeInTheDocument()
  })

  it('disables the start button until at least one chapter is selected', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)

    renderHome()

    await userEvent.click(await screen.findByText('國文'))
    expect(screen.getByRole('button', { name: /開始複習/ })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — cannot find module `./HomePage`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/pages/HomePage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  if (error) return <p>{error}</p>
  if (!indexData) return <p>載入題庫中…</p>

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
    <div>
      <h1>問答題庫</h1>
      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            <button type="button" onClick={() => selectSubject(subject.id)}>
              {subject.name}
            </button>
          </li>
        ))}
      </ul>
      {selectedSubject && (
        <div>
          <ul>
            {chaptersForSubject.map((chapter) => (
              <li key={chapter.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedChapterIds.has(chapter.id)}
                    onChange={() => toggleChapter(chapter.id)}
                  />
                  {chapter.name}
                </label>
              </li>
            ))}
          </ul>
          <label>
            <input
              type="checkbox"
              checked={shuffleEnabled}
              onChange={(e) => setShuffleEnabled(e.target.checked)}
            />
            隨機排序題目
          </label>
          <button type="button" disabled={selectedChapterIds.size === 0} onClick={handleStart}>
            開始複習
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: add subject/chapter picker page"
```

---

## Task 8: Quiz Page

**Files:**
- Create: `src/pages/QuizPage.tsx`
- Test: `src/pages/QuizPage.test.tsx`

**Interfaces:**
- Consumes: `QuizEngine` from `src/components/quiz/QuizEngine.tsx` (Task 6), `Question` type (Task 2).
- Produces: `QuizPage` default export, reads `location.state` produced by `HomePage` (Task 7).

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/QuizPage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import QuizPage from './QuizPage'

function renderAt(initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/quiz" element={<QuizPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('QuizPage', () => {
  it('renders the quiz when navigation state has questions', () => {
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
    expect(screen.getByText('題目一')).toBeInTheDocument()
  })

  it('redirects to home when there is no navigation state', () => {
    renderAt(['/quiz'])
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/QuizPage.test.tsx`
Expected: FAIL — cannot find module `./QuizPage`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/pages/QuizPage.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { QuizEngine } from '../components/quiz/QuizEngine'
import type { Question } from '../lib/schema'

type QuizNavigationState = { questions: Question[]; title: string }

export default function QuizPage() {
  const location = useLocation()
  const state = location.state as QuizNavigationState | null

  if (!state?.questions || state.questions.length === 0) {
    return <Navigate to="/" replace />
  }

  return <QuizEngine questions={state.questions} title={state.title ?? '測驗'} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/QuizPage.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/QuizPage.tsx src/pages/QuizPage.test.tsx
git commit -m "feat: add quiz page with navigation-state guard"
```

---

## Task 9: Routing, App Shell & Seed Data

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/App.test.tsx` (superseded by `HomePage.test.tsx` / `QuizPage.test.tsx`)
- Create: `public/data/index.json`
- Create: `public/data/questions/c-buyin.json`

**Interfaces:**
- Consumes: `HomePage` (Task 7), `QuizPage` (Task 8).
- Produces: the assembled app, and the seed question bank served at `/data/index.json` and `/data/questions/c-buyin.json` (consumed at runtime by `dataLoader`, Task 3).

- [ ] **Step 1: Replace src/App.tsx with routing**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz" element={<QuizPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Delete the now-superseded smoke test**

Run: `rm src/App.test.tsx` (or delete the file directly)

- [ ] **Step 3: Create public/data/index.json**

```json
{
  "subjects": [
    { "id": "s-guowen", "name": "國文", "order": 0 }
  ],
  "chapters": [
    { "id": "c-buyin", "subjectId": "s-guowen", "name": "ㄅ音錯別字", "order": 0 }
  ]
}
```

- [ ] **Step 4: Create public/data/questions/c-buyin.json**

Ported from the reference artifact's 25-question set (`tag`→`tag`, `stem`→`stem`, `opts`→`options`, `ans`→`answerIndex`, `ex`→`explanation`), IDs `q01`–`q25`, `chapterId: "c-buyin"`.

```json
[
  { "id": "q01", "chapterId": "c-buyin", "tag": "找出完全沒有錯別字的選項", "stem": "下列文句，完全沒有錯別字的選項是：", "options": ["他為人剛復自用，聽不進任何勸諫", "這篇評論鞭僻入裡，切中時弊", "案情水落石出，歹徒終於原形畢露", "稗官野史雖非正史，卻能裨補闕露"], "answerIndex": 2, "explanation": "(A)剛「復」→<b>愎</b>，愎ㄅㄧˋ，任性固執。(B)鞭「僻」→<b>辟</b>，鞭辟入裡指分析透澈。(D)闕「露」→<b>漏</b>，裨補闕漏指補足缺失。" },
  { "id": "q02", "chapterId": "c-buyin", "tag": "弊／蔽／敝／蹩", "stem": "下列「」內的字，字形完全正確的選項是：", "options": ["烏雲「弊」空", "「蔽」絕風清", "「敝」帚自珍", "這藉口實在太「憋」腳"], "answerIndex": 2, "explanation": "(A)烏雲<b>蔽</b>空，蔽為遮蓋。(B)<b>弊</b>絕風清，弊為害處，形容政風清明。(D)<b>蹩</b>腳（ㄅㄧㄝˊ），指品質低劣。" },
  { "id": "q03", "chapterId": "c-buyin", "tag": "字形前後是否相同", "stem": "下列各組「」內的字，前後字形<em>完全相同</em>的選項是：", "options": ["金「ㄅㄧˋ」輝煌／「ㄅㄧˋ」壘分明", "不修邊「ㄈㄨˊ」／文章篇「ㄈㄨˊ」", "「ㄅㄟˋ」受恩寵／人才「ㄅㄟˋ」出", "「ㄅㄨˋ」其後塵／按「ㄅㄨˋ」就班"], "answerIndex": 1, "explanation": "(B)兩者皆為<b>幅</b>。(A)金<b>碧</b>輝煌／<b>壁</b>壘分明。(C)<b>倍</b>受恩寵／人才<b>輩</b>出。(D)<b>步</b>其後塵／按<b>部</b>就班。" },
  { "id": "q04", "chapterId": "c-buyin", "tag": "字義辨析", "stem": "「備嘗辛苦」與「倍受恩寵」二詞中，「ㄅㄟˋ」字的意義依序是：", "options": ["盡／更加", "更加／盡", "皆／加一倍", "準備／背棄"], "answerIndex": 0, "explanation": "<b>備</b>嘗辛苦的「備」是「盡、全部」，指艱辛嘗遍；<b>倍</b>受恩寵的「倍」是「更加、益增」。兩字音同而義異，最易誤寫。" },
  { "id": "q05", "chapterId": "c-buyin", "tag": "找出完全沒有錯別字的選項", "stem": "下列文句，用字完全正確的選項是：", "options": ["對方咄咄逼人，他索性板回一城", "讀書要按部就班，不能一步登天", "他天生異秉，過目不忘", "兩人道不同，只好分道揚鏢"], "answerIndex": 1, "explanation": "(A)「板」→<b>扳</b>回一城（ㄅㄢ，挽回頹勢）；板起面孔才用板。(C)異「秉」→<b>稟</b>，稟為資質。(D)揚「鏢」→<b>鑣</b>，鑣是馬銜；鏢是暗器。" },
  { "id": "q06", "chapterId": "c-buyin", "tag": "稗／裨／俾", "stem": "下列「」內的字，用法正確的選項是：", "options": ["「稗」補闕漏", "「裨」官野史", "「俾」眾周知", "「稗」益良多"], "answerIndex": 2, "explanation": "<b>俾</b>（ㄅㄧˇ）為「使」，俾眾周知即使眾人知曉。<b>稗</b>（ㄅㄞˋ）為微小、卑賤，用於稗官野史；<b>裨</b>（ㄅㄧˋ）為補助，用於裨補闕漏、裨益良多。" },
  { "id": "q07", "chapterId": "c-buyin", "tag": "讀音辨識", "stem": "下列「」內的字，讀音與其他三者<em>不同</em>的選項是：", "options": ["「稗」官野史", "「裨」補闕漏", "剛「愎」自用", "蓬「蓽」生輝"], "answerIndex": 0, "explanation": "(A)稗讀<b>ㄅㄞˋ</b>；(B)裨、(C)愎、(D)蓽皆讀<b>ㄅㄧˋ</b>。裨另有ㄆㄧˊ音（偏裨、裨將）。" },
  { "id": "q08", "chapterId": "c-buyin", "tag": "依序填入", "stem": "「他為人耿直，凡事□公處理；面對積習已久的陋規，敢於針□時弊，終使機關□絕風清。」依序最適合填入的字是：", "options": ["秉／砭／弊", "稟／貶／蔽", "秉／貶／敝", "稟／砭／弊"], "answerIndex": 0, "explanation": "<b>秉</b>公＝依據公理；針<b>砭</b>（ㄅㄧㄢ）＝古代治病的石針，引申為指出並救治缺失；<b>弊</b>絕風清＝弊端絕跡、政風清明。針「貶」為常見誤寫。" },
  { "id": "q09", "chapterId": "c-buyin", "tag": "斑／般／班", "stem": "下列「」內的字，字形正確的選項是：", "options": ["由此可見一「般」", "不必與他一「斑」見識", "窺豹一「斑」", "「斑」門弄斧"], "answerIndex": 2, "explanation": "<b>斑</b>為斑點，引申指事物的一小部分，故可見一斑、窺豹一斑。<b>般</b>為樣、種類，故一般見識。<b>班</b>門弄斧的班指魯班。" },
  { "id": "q10", "chapterId": "c-buyin", "tag": "跋／拔", "stem": "「他個性飛揚□扈，但意志堅定，牢不可□。」依序最適合填入的字是：", "options": ["跋／拔", "拔／跋", "跋／跋", "拔／拔"], "answerIndex": 0, "explanation": "飛揚<b>跋</b>扈形容驕橫放肆；牢不可<b>拔</b>指堅固而無法動搖、改變。兩字形近義異。" },
  { "id": "q11", "chapterId": "c-buyin", "tag": "成語釋義", "stem": "下列成語的解釋，正確的選項是：", "options": ["蓬蓽生輝：形容居所簡陋，用以貶抑他人", "壁壘分明：界限清楚，雙方立場對立", "金碧輝煌：形容人品高潔，不同流俗", "死灰復燃：比喻事情已徹底結束"], "answerIndex": 1, "explanation": "壁壘原指軍隊駐守的營壘，引申為界限。(A)蓬蓽生輝是<b>謙詞</b>，謝人來訪或贈物使寒舍增光。(C)金碧輝煌形容建築華麗。(D)死灰復燃指已平息的事物再度活躍。" },
  { "id": "q12", "chapterId": "c-buyin", "tag": "憋／彆／蹩／鱉", "stem": "下列文句「」內的字，使用正確的選項是：", "options": ["他「彆」住一口氣潛入水中", "兩人鬧「憋」扭，互不理睬", "這藉口太「蹩」腳，沒人相信", "甕中捉「彆」"], "answerIndex": 2, "explanation": "<b>憋</b>（ㄅㄧㄝ）＝閉住、壓抑，故憋住氣息。<b>彆</b>（ㄅㄧㄝˋ）＝不順、執拗，故彆扭。<b>蹩</b>腳＝低劣。甕中捉<b>鱉</b>。" },
  { "id": "q13", "chapterId": "c-buyin", "tag": "簸／跛／播", "stem": "下列文句，沒有錯別字的選項是：", "options": ["山路難行，他一路顛跛地前進", "老人跛腳而行，仍不肯拄杖", "車行顛播，令人頭暈目眩", "他因車禍簸腳多年"], "answerIndex": 1, "explanation": "顛<b>簸</b>（ㄅㄛˇ）指上下搖動；<b>跛</b>（ㄅㄛˇ）指腳有殘疾。兩字同音而形義俱異，(A)(C)(D)皆誤。" },
  { "id": "q14", "chapterId": "c-buyin", "tag": "篳／畢／必", "stem": "「□路藍縷，以啟山林」、「原形□露」、「立志□堅」，三處依序應填入的字是：", "options": ["篳／畢／必", "畢／必／篳", "必／篳／畢", "篳／必／畢"], "answerIndex": 0, "explanation": "<b>篳</b>（同蓽）為柴車、荊竹編物；<b>畢</b>為全部，故原形畢露；<b>必</b>為一定。另有「蓬蓽生輝」亦取編竹為門之義。" },
  { "id": "q15", "chapterId": "c-buyin", "tag": "辟／僻／闢／避", "stem": "下列「」內的字，使用正確的選項是：", "options": ["鞭「僻」入裡", "窮鄉「辟」壤", "獨「闢」蹊徑", "「闢」重就輕"], "answerIndex": 2, "explanation": "獨<b>闢</b>蹊徑＝另行開闢新路。(A)鞭<b>辟</b>入裡。(B)窮鄉<b>僻</b>壤，僻為偏遠。(D)<b>避</b>重就輕。" },
  { "id": "q16", "chapterId": "c-buyin", "tag": "芭／笆／疤／巴", "stem": "下列文句，用字完全正確的選項是：", "options": ["雨打芭蕉，聲聲入耳", "竹編的離笆圍住小院", "他手臂上留下一道芭", "他氣得一芭掌打過去"], "answerIndex": 0, "explanation": "(B)「離」笆→<b>籬</b>笆，以竹或柳條編成。(C)→<b>疤</b>，傷痕。(D)→<b>巴</b>掌。四字聲符相同而義各異。" },
  { "id": "q17", "chapterId": "c-buyin", "tag": "駁／搏／膊", "stem": "「□斥謬論」、「放手一□」、「赤□上陣」，三處依序應填入的字是：", "options": ["駁／搏／膊", "博／駁／搏", "駁／博／膊", "搏／駁／博"], "answerIndex": 0, "explanation": "<b>駁</b>＝爭辯、否定；<b>搏</b>＝撲打、奮力爭取；<b>膊</b>＝上臂。放手一「博」為極常見的錯寫。" },
  { "id": "q18", "chapterId": "c-buyin", "tag": "字義辨析", "stem": "下列「」內字的字義說明，正確的選項是：", "options": ["按「部」就班：軍隊的部隊", "「步」其後塵：跟從、仿效", "天生異「稟」：向上級稟報", "「秉」公處理：手持刀刃"], "answerIndex": 1, "explanation": "(A)部為門類、次第，按部就班指依次序進行。(C)稟為天賦資質。(D)秉本義為手持禾把，引申為依據、堅持。" },
  { "id": "q19", "chapterId": "c-buyin", "tag": "愎／復／複／覆", "stem": "下列各組詞語，用字完全正確的選項是：", "options": ["剛愎自用／死灰復燃", "剛復自用／死灰複燃", "剛愎自用／死灰覆燃", "剛復自用／死灰復燃"], "answerIndex": 0, "explanation": "<b>愎</b>（ㄅㄧˋ）＝任性固執；死灰<b>復</b>燃的復＝再、又。複為重疊，覆為翻倒、遮蓋，皆不可通用。" },
  { "id": "q20", "chapterId": "c-buyin", "tag": "字義辨析", "stem": "「不修邊幅」的「幅」，意義最接近下列何者？", "options": ["幸福、福氣", "布帛的邊緣，引申指人的儀容外表", "輔助、幫助", "重複、繁多"], "answerIndex": 1, "explanation": "邊幅本指布帛的邊緣裝飾，引申為人的儀容衣著；不修邊幅即不講究外表。「文章篇幅」的幅則指版面大小。" },
  { "id": "q21", "chapterId": "c-buyin", "tag": "找出完全沒有錯別字的選項", "stem": "下列文句，完全沒有錯別字的選項是：", "options": ["這件事須從長計議，不可放手一博", "他倍嘗艱辛，終於學有所成", "人才輩出的時代，更需要謙虛自持", "他勇氣加輩，衝向終點"], "answerIndex": 2, "explanation": "(A)一「博」→<b>搏</b>。(B)「倍」嘗→<b>備</b>嘗，備為盡。(D)加「輩」→<b>倍</b>。輩指同類的一批人，故人才輩出。" },
  { "id": "q22", "chapterId": "c-buyin", "tag": "碧／壁／璧", "stem": "下列「」內的字，使用正確的選項是：", "options": ["金「壁」輝煌", "完「璧」歸趙", "「碧」壘分明", "銅牆鐵「璧」"], "answerIndex": 1, "explanation": "<b>璧</b>為圓形玉器，故完璧歸趙。<b>碧</b>為青綠色美石，故金碧輝煌。<b>壁</b>為牆垣，故壁壘分明、銅牆鐵壁。" },
  { "id": "q23", "chapterId": "c-buyin", "tag": "依序填入", "stem": "「小說家取材於□官野史，寫來活靈活現；史家則講求信實，唯恐一字之失，故必□補闕漏，反覆推敲。」依序應填入：", "options": ["稗／裨", "裨／稗", "俾／裨", "稗／俾"], "answerIndex": 0, "explanation": "<b>稗</b>官原為記錄民間瑣事的小官，故稗官野史指野史小說；<b>裨</b>補闕漏語出〈出師表〉，指補足缺失。兩字皆從「卑」而音義有別。" },
  { "id": "q24", "chapterId": "c-buyin", "tag": "憋／彆／鱉／蹩", "stem": "下列文句，用字完全正確的選項是：", "options": ["他個性內向，凡事都憋在心裡", "他們倆為了小事鬧憋扭", "情勢已如甕中捉憋", "他把真心話蹩了半天說不出口"], "answerIndex": 0, "explanation": "(B)→<b>彆</b>扭。(C)→甕中捉<b>鱉</b>。(D)→<b>憋</b>，憋為悶住不說。蹩僅用於蹩腳、蹩進。" },
  { "id": "q25", "chapterId": "c-buyin", "tag": "綜合驗收", "stem": "下列文句，用字完全正確的選項是：", "options": ["他明知山有虎，仍抱薪救火，終致原形必露", "面對積弊，唯有針貶時弊，方能弊絕風清", "他雖出身窮鄉僻壤，卻能鞭辟入裡地分析時局", "這位長官剛復自用，部屬只能按步就班"], "answerIndex": 2, "explanation": "(A)原形「必」露→<b>畢</b>露。(B)針「貶」→<b>砭</b>。(D)剛「復」→<b>愎</b>；按「步」→<b>部</b>。" }
]
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests across every task pass (App.test.tsx no longer exists; HomePage/QuizPage/QuizEngine/component/lib tests all green).

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open the printed local URL, and confirm:
1. Home page shows subject "國文"; clicking it reveals chapter "ㄅ音錯別字".
2. Checking the chapter and clicking "開始複習" navigates to a 25-question quiz.
3. Answering with mouse clicks and with keyboard (`1`-`4`, `Enter`) both work; right/wrong coloring and explanation text appear as expected.
4. Reaching the last question and clicking "看成績" shows the score summary with a correct hit count and a wrong-answer review list.
5. Clicking "再測一次" restarts the quiz from question 1 with a clean score.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx public/data
git rm src/App.test.tsx
git commit -m "feat: wire up routing and seed the ㄅ音 question bank"
```

---

## Self-Review Notes

- **Spec coverage:** Generic `QuizEngine` (泛化測驗引擎) — Task 6. Subject/chapter data model — Task 2. Same-subject multi-chapter picker — Task 7. Static JSON at `/data/...`, no backend — Tasks 3 & 9. Reference-artifact visual style — Task 5's `quiz.css`. Error handling for malformed JSON — Task 3's schema-validation errors. Dashboard, File System Access CRUD, and export/backup are **out of scope for this plan** — they are the follow-up "Dashboard" plan referenced in the spec's "多個獨立子系統" split.
- **Placeholder scan:** no TBD/TODO; every step has complete, runnable code.
- **Type consistency:** `Question`/`Subject`/`Chapter`/`IndexData` (Task 2) are the single source of truth used verbatim by `dataLoader` (Task 3), all quiz components (Tasks 5–6), and both pages (Tasks 7–8). `RailResult` is defined once in `ProgressRail.tsx` and imported by `QuizEngine.tsx`.
