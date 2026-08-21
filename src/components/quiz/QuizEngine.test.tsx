// src/components/quiz/QuizEngine.test.tsx
import { render, screen, within } from '@testing-library/react'
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
  it('accumulates wrong answers in the live score while the quiz runs', async () => {
    const questions: Question[] = [
      { id: 'q1', chapterId: 'c1', tag: '形近字', stem: '第一題', options: ['甲', '乙', '丙', '丁'], answerIndex: 0, explanation: 'e1' },
      { id: 'q2', chapterId: 'c1', stem: '第二題', options: ['甲', '乙', '丙', '丁'], answerIndex: 0, explanation: 'e2' },
    ]
    render(<QuizEngine questions={questions} title="測試" />)

    expect(screen.getByText('還沒有錯題。')).toBeInTheDocument()

    await userEvent.click(screen.getByText('乙'))

    const live = within(screen.getByRole('complementary'))
    expect(live.getByText('01')).toBeInTheDocument()
    expect(live.getByText('形近字')).toBeInTheDocument()
    expect(live.getByText('答對 0')).toBeInTheDocument()
  })
})
