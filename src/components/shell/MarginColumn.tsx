import './shell.css'
import type { ReactNode } from 'react'

export function MarginColumn({ children }: { children: ReactNode }) {
  return <aside className="sh-margin">{children}</aside>
}
