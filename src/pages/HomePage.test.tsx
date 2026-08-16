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
    expect(screen.getByText(/QUIZ:國文 總複習:2/)).toBeInTheDocument()
  })

  it('disables the start button until at least one chapter is selected', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)

    renderHome()

    await userEvent.click(await screen.findByText('國文'))
    expect(screen.getByRole('button', { name: /開始複習/ })).toBeDisabled()
  })
})
