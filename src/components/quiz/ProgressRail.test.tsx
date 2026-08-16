import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressRail } from './ProgressRail'

describe('ProgressRail', () => {
  it('renders one list item per question', () => {
    const { container } = render(<ProgressRail total={5} current={0} results={[null, null, null, null, null]} />)
    expect(container.querySelectorAll('li')).toHaveLength(5)
  })

  it('marks answered questions as right or wrong', () => {
    const { container } = render(
      <ProgressRail total={3} current={2} results={['right', 'wrong', null]} />,
    )
    const items = container.querySelectorAll('li')
    expect(items[0]).toHaveClass('is-right')
    expect(items[1]).toHaveClass('is-wrong')
    expect(items[2]).not.toHaveClass('is-right')
    expect(items[2]).not.toHaveClass('is-wrong')
  })

  it('marks the current unanswered question as "here"', () => {
    const { container } = render(<ProgressRail total={2} current={1} results={['right', null]} />)
    const items = container.querySelectorAll('li')
    expect(items[1]).toHaveClass('is-here')
    expect(items[0]).not.toHaveClass('is-here')
  })
})
