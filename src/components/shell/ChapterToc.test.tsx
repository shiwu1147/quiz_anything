import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChapterToc } from './ChapterToc'

describe('ChapterToc', () => {
  it('renders its children as list items', () => {
    render(<ChapterToc itemCount={2}><li>第一章</li><li>第二章</li></ChapterToc>)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('第一章')).toBeInTheDocument()
  })

  it('uses a single column for six chapters or fewer', () => {
    const { container } = render(<ChapterToc itemCount={6}><li>x</li></ChapterToc>)

    expect(container.querySelector('.sh-toc')).toHaveAttribute('data-columns', '1')
  })

  it('uses two columns from seven chapters', () => {
    const { container } = render(<ChapterToc itemCount={7}><li>x</li></ChapterToc>)

    expect(container.querySelector('.sh-toc')).toHaveAttribute('data-columns', '2')
  })

  it('uses three columns from fifteen chapters', () => {
    const { container } = render(<ChapterToc itemCount={15}><li>x</li></ChapterToc>)

    expect(container.querySelector('.sh-toc')).toHaveAttribute('data-columns', '3')
  })
})
