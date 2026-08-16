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
