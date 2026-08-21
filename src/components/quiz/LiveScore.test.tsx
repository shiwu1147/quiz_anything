import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LiveScore } from './LiveScore'

describe('LiveScore', () => {
  it('shows how many are answered and how many are right', () => {
    render(<LiveScore answered={12} total={25} hits={10} wrongEntries={[]} />)

    expect(screen.getByText('12 / 25')).toBeInTheDocument()
    expect(screen.getByText('答對 10')).toBeInTheDocument()
  })

  it('says nothing is wrong yet when there are no wrong answers', () => {
    render(<LiveScore answered={3} total={25} hits={3} wrongEntries={[]} />)

    expect(screen.getByText('還沒有錯題。')).toBeInTheDocument()
  })

  it('lists wrong answers with their number and tag', () => {
    render(
      <LiveScore
        answered={8}
        total={25}
        hits={6}
        wrongEntries={[{ questionNumber: 2, tag: '形近字' }, { questionNumber: 7 }]}
      />,
    )

    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('形近字')).toBeInTheDocument()
    expect(screen.getByText('07')).toBeInTheDocument()
  })
})
