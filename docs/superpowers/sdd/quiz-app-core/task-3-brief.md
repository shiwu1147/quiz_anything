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

