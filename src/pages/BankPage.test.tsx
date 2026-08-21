import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import BankPage from './BankPage'
import * as dataLoader from '../lib/dataLoader'

vi.mock('../lib/dataLoader')

const indexData = {
  subjects: [{ id: 's1', name: '國文', order: 0 }],
  chapters: [
    { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
    { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
  ],
}

const question = (id: string, chapterId: string) => ({
  id, chapterId, stem: '題幹',
  options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
})

function renderBank() {
  return render(
    <MemoryRouter initialEntries={['/bank']}>
      <BankPage />
    </MemoryRouter>,
  )
}

describe('BankPage', () => {
  it('reports a clean bank', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) => ({
      ok: true,
      data: [question(`${id}-q1`, id)],
    }))

    renderBank()

    expect(await screen.findByText('題庫沒有問題。')).toBeInTheDocument()
  })

  it('shows a finding naming the chapter whose file is missing', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) =>
      id === 'c2'
        ? { ok: false, reason: 'http' as const, detail: 'HTTP 404' }
        : { ok: true, data: [question('c1-q1', 'c1')] },
    )

    renderBank()

    expect(await screen.findByText(/第二章 · 檔案不存在/)).toBeInTheDocument()
    expect(screen.getByText(/\/data\/questions\/c2\.json/)).toBeInTheDocument()
    expect(screen.queryByText('題庫沒有問題。')).not.toBeInTheDocument()
  })

  it('lists the chapters of the selected subject with their question counts', async () => {
    vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) => ({
      ok: true,
      data: id === 'c1'
        ? [question('c1-q1', 'c1'), question('c1-q2', 'c1')]
        : [question('c2-q1', 'c2')],
    }))

    renderBank()

    await userEvent.click(await screen.findByRole('button', { name: '國文' }))

    expect(screen.getByText('第一章')).toBeInTheDocument()
    expect(screen.getByText('2 題')).toBeInTheDocument()
    expect(screen.getByText('1 題')).toBeInTheDocument()
  })

  it('shows a single finding when the index itself cannot be read', async () => {
    vi.mocked(dataLoader.loadIndex).mockRejectedValue(new Error('題庫索引格式錯誤：boom'))

    renderBank()

    expect(await screen.findByText(/題庫索引格式錯誤/)).toBeInTheDocument()
  })
})
