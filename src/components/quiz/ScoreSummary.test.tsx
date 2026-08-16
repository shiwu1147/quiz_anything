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
