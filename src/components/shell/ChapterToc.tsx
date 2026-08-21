import './shell.css'
import type { ReactNode } from 'react'
import { tocColumns } from '../../lib/layout'

export function ChapterToc({ itemCount, children }: { itemCount: number; children: ReactNode }) {
  return (
    <ul className="sh-toc" data-columns={tocColumns(itemCount)}>
      {children}
    </ul>
  )
}
