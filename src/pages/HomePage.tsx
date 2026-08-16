// src/pages/HomePage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadIndex, loadMergedQuestions } from '../lib/dataLoader'
import { shuffle } from '../lib/quizLogic'
import type { IndexData } from '../lib/schema'

export default function HomePage() {
  const navigate = useNavigate()
  const [indexData, setIndexData] = useState<IndexData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())
  const [shuffleEnabled, setShuffleEnabled] = useState(true)

  useEffect(() => {
    loadIndex().then(setIndexData).catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p>{error}</p>
  if (!indexData) return <p>載入題庫中…</p>

  const subjects = [...indexData.subjects].sort((a, b) => a.order - b.order)
  const chaptersForSubject = indexData.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null

  function selectSubject(id: string) {
    setSelectedSubjectId(id)
    setSelectedChapterIds(new Set())
  }

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleStart() {
    if (!selectedSubject || selectedChapterIds.size === 0) return
    const merged = await loadMergedQuestions([...selectedChapterIds])
    const finalQuestions = shuffleEnabled ? shuffle(merged) : merged
    navigate('/quiz', { state: { questions: finalQuestions, title: `${selectedSubject.name} 總複習` } })
  }

  return (
    <div>
      <h1>問答題庫</h1>
      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            <button type="button" onClick={() => selectSubject(subject.id)}>
              {subject.name}
            </button>
          </li>
        ))}
      </ul>
      {selectedSubject && (
        <div>
          <ul>
            {chaptersForSubject.map((chapter) => (
              <li key={chapter.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedChapterIds.has(chapter.id)}
                    onChange={() => toggleChapter(chapter.id)}
                  />
                  {chapter.name}
                </label>
              </li>
            ))}
          </ul>
          <label>
            <input
              type="checkbox"
              checked={shuffleEnabled}
              onChange={(e) => setShuffleEnabled(e.target.checked)}
            />
            隨機排序題目
          </label>
          <button type="button" disabled={selectedChapterIds.size === 0} onClick={handleStart}>
            開始複習
          </button>
        </div>
      )}
    </div>
  )
}
