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

