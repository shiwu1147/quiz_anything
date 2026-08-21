import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AppShell } from './AppShell'

function renderShell(zone: 'quiz' | 'bank', path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell zone={zone}>
        <p>內容</p>
      </AppShell>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  it('renders the brand and both zone links', () => {
    renderShell('quiz')

    expect(screen.getByText('問答題庫')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '複習' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '題庫' })).toHaveAttribute('href', '/dashboard')
  })

  it('renders its children', () => {
    renderShell('quiz')

    expect(screen.getByText('內容')).toBeInTheDocument()
  })

  it('marks the current zone on the root element', () => {
    const { container } = renderShell('bank', '/dashboard')

    expect(container.querySelector('.sh-root')).toHaveAttribute('data-zone', 'bank')
  })
})
