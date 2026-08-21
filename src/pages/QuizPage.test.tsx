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

  it('wraps the quiz in the app shell', () => {
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

    expect(screen.getByText('問答題庫')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '題庫' })).toBeInTheDocument()
  })

  it('redirects to home when there is no navigation state', () => {
    renderAt(['/quiz'])
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })
})
