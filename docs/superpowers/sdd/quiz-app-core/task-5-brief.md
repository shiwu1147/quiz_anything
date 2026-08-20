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

