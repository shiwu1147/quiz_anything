import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SubjectShelf } from './SubjectShelf'
import type { SubjectMeta } from '../../lib/layout'

const subjects = [
  { id: 's1', name: '國文', order: 0 },
  { id: 's2', name: '數學', order: 1 },
]

describe('SubjectShelf', () => {
  it('renders one button per subject', () => {
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: '國文' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '數學' })).toBeInTheDocument()
  })

  it('marks only the selected subject as pressed', () => {
    render(<SubjectShelf subjects={subjects} selectedId="s2" onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: '國文' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '數學' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports the clicked subject id', async () => {
    const onSelect = vi.fn()
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: '數學' }))

    expect(onSelect).toHaveBeenCalledWith('s2')
  })

  it('renders no buttons when there are no subjects', () => {
    render(<SubjectShelf subjects={[]} selectedId={null} onSelect={() => {}} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
  it('shows the chapter and question counts on the spine when meta is given', () => {
    const meta = new Map<string, SubjectMeta>([['s1', { chapters: 3, questions: 61 }]])
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} meta={meta} />)

    expect(screen.getByText('3 章 · 61 題')).toBeInTheDocument()
  })

  it('keeps the subject name as the accessible name even with meta', () => {
    const meta = new Map<string, SubjectMeta>([['s1', { chapters: 3, questions: 61 }]])
    render(<SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} meta={meta} />)

    expect(screen.getByRole('button', { name: '國文' })).toBeInTheDocument()
  })

  it('marks the shelf as wide when there are two subjects or fewer', () => {
    const { container, rerender } = render(
      <SubjectShelf subjects={subjects} selectedId={null} onSelect={() => {}} />,
    )
    expect(container.querySelector('.sh-shelf')).toHaveAttribute('data-density', 'wide')

    rerender(
      <SubjectShelf
        subjects={[...subjects, { id: 's3', name: '歷史', order: 2 }]}
        selectedId={null}
        onSelect={() => {}}
      />,
    )
    expect(container.querySelector('.sh-shelf')).toHaveAttribute('data-density', 'normal')
  })
})
