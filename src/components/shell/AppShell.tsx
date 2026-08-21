import './shell.css'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'is-on' : undefined
}

export function AppShell({ zone, children }: { zone: 'quiz' | 'bank'; children: ReactNode }) {
  return (
    <div className="sh-root" data-zone={zone}>
      <header className="sh-head">
        <div className="sh-head-inner">
          <div className="sh-brand">問答題庫</div>
          <nav className="sh-nav">
            <NavLink to="/" end className={navClass}>複習</NavLink>
            <NavLink to="/bank" className={navClass}>題庫</NavLink>
          </nav>
        </div>
      </header>
      <main className="sh-main">{children}</main>
    </div>
  )
}
