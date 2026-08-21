import './shell.css'
import { shelfDensity, type SubjectMeta } from '../../lib/layout'
import type { Subject } from '../../lib/schema'

export function SubjectShelf({
  subjects,
  selectedId,
  onSelect,
  meta,
}: {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string) => void
  meta?: Map<string, SubjectMeta>
}) {
  return (
    <ul className="sh-shelf" data-density={shelfDensity(subjects.length)}>
      {subjects.map((subject) => {
        const m = meta?.get(subject.id)
        return (
          <li key={subject.id}>
            <button
              type="button"
              className="sh-spine"
              aria-label={subject.name}
              aria-pressed={subject.id === selectedId}
              onClick={() => onSelect(subject.id)}
            >
              <span className="sh-spine-name">{subject.name}</span>
              {m && <span className="sh-spine-meta">{m.chapters} 章 · {m.questions} 題</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
