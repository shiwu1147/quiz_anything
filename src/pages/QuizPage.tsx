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
