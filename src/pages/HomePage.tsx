// src/pages/HomePage.tsx
import './home.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { MarginColumn } from '../components/shell/MarginColumn'
import { ChapterToc } from '../components/shell/ChapterToc'
import { loadBankSnapshot, subjectMeta, type BankSnapshot } from '../lib/bankSnapshot'
import { loadMergedQuestions } from '../lib/dataLoader'
import { shuffle } from '../lib/quizLogic'

export default function HomePage() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<BankSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())
  const [shuffleEnabled, setShuffleEnabled] = useState(true)

  useEffect(() => {
    loadBankSnapshot().then(setSnapshot).catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <AppShell zone="quiz"><p className="sh-empty">{error}</p></AppShell>
  if (!snapshot) return <AppShell zone="quiz"><p className="sh-empty">載入題庫中…</p></AppShell>

  const { index, counts } = snapshot
  const meta = subjectMeta(index, counts)
  const subjects = [...index.subjects].sort((a, b) => a.order - b.order)
  const chaptersForSubject = index.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null
  const selectedQuestionCount = [...selectedChapterIds].reduce(
    (sum, id) => sum + (counts.get(id) ?? 0),
    0,
  )

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
      <SubjectShelf
        subjects={subjects}
        selectedId={selectedSubjectId}
        onSelect={selectSubject}
        meta={meta}
      />
      <div className="sh-body">
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '複習'}</h1>
          </div>

          {selectedSubject ? (
            <ChapterToc itemCount={chaptersForSubject.length}>
              {chaptersForSubject.map((chapter) => (
                <li key={chapter.id}>
                  <div className="sh-toc-row">
                    <label className="hm-check">
                      <input
                        type="checkbox"
                        checked={selectedChapterIds.has(chapter.id)}
                        onChange={() => toggleChapter(chapter.id)}
                      />
                      <span className="sh-toc-name">{chapter.name}</span>
                    </label>
                    <span className="sh-toc-aside">{counts.get(chapter.id) ?? 0} 題</span>
                  </div>
                </li>
              ))}
            </ChapterToc>
          ) : (
            <p className="sh-empty">選一個科目，挑幾章來複習。</p>
          )}
        </div>

        <MarginColumn>
          <section>
            <p className="sh-margin-head">本次範圍</p>
            <p className="hm-total">
              已選 {selectedChapterIds.size} 章 · 約 {selectedQuestionCount} 題
            </p>
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
          </section>
        </MarginColumn>
      </div>
    </AppShell>
  )
}
