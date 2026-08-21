// src/pages/HomePage.tsx
import './home.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
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

  if (error) return <AppShell zone="quiz"><p className="sh-empty">{error}</p></AppShell>
  if (!indexData) return <AppShell zone="quiz"><p className="sh-empty">載入題庫中…</p></AppShell>

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
    <AppShell zone="quiz">
      <div className="sh-shelf-layout">
        <SubjectShelf subjects={subjects} selectedId={selectedSubjectId} onSelect={selectSubject} />
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '複習'}</h1>
            {selectedSubject && (
              <span className="sh-sheet-meta">已選 {selectedChapterIds.size} 卷</span>
            )}
          </div>

          {selectedSubject ? (
            <>
              <ul className="sh-toc">
                {chaptersForSubject.map((chapter) => (
                  <li key={chapter.id} className="sh-toc-row">
                    <label className="hm-check">
                      <input
                        type="checkbox"
                        checked={selectedChapterIds.has(chapter.id)}
                        onChange={() => toggleChapter(chapter.id)}
                      />
                      <span className="sh-toc-name">{chapter.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="hm-bar">
                <label className="hm-shuffle">
                  <input
                    type="checkbox"
                    checked={shuffleEnabled}
                    onChange={(e) => setShuffleEnabled(e.target.checked)}
                  />
                  隨機排序題目
                </label>
                <button
                  type="button"
                  className="hm-start"
                  disabled={selectedChapterIds.size === 0}
                  onClick={handleStart}
                >
                  開始複習
                </button>
              </div>
            </>
          ) : (
            <p className="sh-empty">選一個科目，挑幾卷來複習。</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
