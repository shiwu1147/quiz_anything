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

