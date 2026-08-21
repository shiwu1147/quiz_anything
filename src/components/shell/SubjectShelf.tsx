import './shell.css'
import type { Subject } from '../../lib/schema'

export function SubjectShelf({
  subjects,
  selectedId,
  onSelect,
}: {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <ul className="sh-shelf">
      {subjects.map((subject) => (
        <li key={subject.id}>
          <button
            type="button"
            className="sh-spine"
            aria-pressed={subject.id === selectedId}
            onClick={() => onSelect(subject.id)}
          >
            {subject.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
