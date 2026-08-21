// src/pages/HomePage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import HomePage from './HomePage'
import * as dataLoader from '../lib/dataLoader'
import * as bankSnapshot from '../lib/bankSnapshot'

vi.mock('../lib/dataLoader')
vi.mock('../lib/bankSnapshot', async (importOriginal) => {
  const actual = await importOriginal<typeof bankSnapshot>()
  return { ...actual, loadBankSnapshot: vi.fn() }
})

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

const multiSubjectIndexData = {
  subjects: [
    { id: 's1', name: '國文', order: 0 },
    { id: 's2', name: '數學', order: 1 },
  ],
  chapters: [
    { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
    { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
    { id: 'c3', subjectId: 's2', name: '第一章', order: 0 },
  ],
}

function snapshotOf(
  index: { subjects: Array<{ id: string; name: string; order: number }>; chapters: Array<{ id: string; subjectId: string; name: string; order: number }> },
  counts: Array<[string, number]>,
) {
  return {
    index,
    raws: new Map(counts.map(([id]) => [id, { ok: true as const, data: [] }])),
    counts: new Map(counts),
  }
}

describe('HomePage', () => {
  it('renders subjects as shelf buttons inside the app shell', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(multiSubjectIndexData, [['c1', 25], ['c2', 18], ['c3', 30]]),
    )

    renderHome()

    const spine = await screen.findByRole('button', { name: '國文' })
    expect(spine).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(spine)
    expect(screen.getByRole('button', { name: '國文' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: '題庫' })).toBeInTheDocument()
  })

  it('lists chapters for the selected subject and starts the quiz with merged questions', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(indexData, [['c1', 25], ['c2', 18]]),
    )
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
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(indexData, [['c1', 25], ['c2', 18]]),
    )

    renderHome()

    await userEvent.click(await screen.findByText('國文'))
    expect(screen.getByRole('button', { name: /開始複習/ })).toBeDisabled()
  })

  it('clears the chapter selection when switching to another subject and back', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(multiSubjectIndexData, [['c1', 25], ['c2', 18], ['c3', 30]]),
    )

    renderHome()

    await userEvent.click(await screen.findByText('國文'))
    const firstChapterCheckbox = screen.getByLabelText('第一章') as HTMLInputElement
    await userEvent.click(firstChapterCheckbox)
    expect(firstChapterCheckbox).toBeChecked()

    await userEvent.click(screen.getByText('數學'))
    await userEvent.click(screen.getByText('國文'))

    const firstChapterCheckboxAgain = screen.getByLabelText('第一章') as HTMLInputElement
    expect(firstChapterCheckboxAgain).not.toBeChecked()
  })
  it('shows the selected chapter and question totals in the margin', async () => {
    vi.mocked(bankSnapshot.loadBankSnapshot).mockResolvedValue(
      snapshotOf(indexData, [['c1', 25], ['c2', 18]]),
    )

    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: '國文' }))
    await userEvent.click(screen.getByLabelText('第一章'))

    expect(screen.getByText('已選 1 章 · 約 25 題')).toBeInTheDocument()
  })
})
