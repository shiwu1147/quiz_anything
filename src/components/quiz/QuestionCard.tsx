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
