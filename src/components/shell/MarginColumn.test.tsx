import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarginColumn } from './MarginColumn'

describe('MarginColumn', () => {
  it('renders its children inside a complementary landmark', () => {
    render(<MarginColumn><p>概況</p></MarginColumn>)

    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByText('概況')).toBeInTheDocument()
  })
})
