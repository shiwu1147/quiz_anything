// src/components/quiz/QuizEngine.tsx
import './quiz.css'
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
}
