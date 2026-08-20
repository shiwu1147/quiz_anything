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

