import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SubjectShelf } from './SubjectShelf'

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
})
