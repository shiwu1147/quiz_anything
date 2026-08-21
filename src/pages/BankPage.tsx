import './bank.css'
import { useEffect, useState } from 'react'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { loadIndex, fetchChapterRaw, type RawResult } from '../lib/dataLoader'
import { checkBank, countQuestions, type Finding } from '../lib/bankHealth'
import type { IndexData } from '../lib/schema'

export default function BankPage() {
  const [indexData, setIndexData] = useState<IndexData | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const index = await loadIndex()
        const entries = await Promise.all(
          index.chapters.map(async (chapter) => [chapter.id, await fetchChapterRaw(chapter.id)] as const),
        )
        if (cancelled) return
        const raws = new Map<string, RawResult>(entries)
        setIndexData(index)
        setFindings(checkBank(index, raws))
        setCounts(countQuestions(raws))
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <AppShell zone="bank">
        <div className="sh-sheet">
          <div className="bk-finding">
            <p className="bk-finding-title">題庫索引讀不到</p>
            <p className="bk-finding-detail">{error}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!indexData) {
    return (
      <AppShell zone="bank">
        <p className="sh-empty">檢查題庫中…</p>
      </AppShell>
    )
  }

  const subjects = [...indexData.subjects].sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null
  const chapters = indexData.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const totalQuestions = chapters.reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0)

  return (
    <AppShell zone="bank">
      <div className="sh-shelf-layout">
        <SubjectShelf subjects={subjects} selectedId={selectedSubjectId} onSelect={setSelectedSubjectId} />
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '題庫'}</h1>
            {selectedSubject && (
              <span className="sh-sheet-meta">{chapters.length} 卷 · {totalQuestions} 題</span>
            )}
          </div>

          {selectedSubject ? (
            <ul className="sh-toc">
              {chapters.map((chapter) => {
                const count = counts.get(chapter.id)
                return (
                  <li key={chapter.id} className="sh-toc-row">
                    <span className="sh-toc-name">{chapter.name}</span>
                    <span className={count === undefined ? 'sh-toc-aside bk-broken' : 'sh-toc-aside'}>
                      {count === undefined ? '讀不到' : `${count} 題`}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="sh-empty">選一個科目看它收了哪些章節。</p>
          )}

          <section className="bk-annot">
            <p className="bk-annot-head">朱批</p>
            {findings.length === 0 ? (
              <p className="bk-clean">題庫沒有問題。</p>
            ) : (
              findings.map((finding, i) => (
                <div className="bk-finding" data-severity={finding.severity} key={i}>
                  <p className="bk-finding-title">{finding.title}</p>
                  <p className="bk-finding-detail">{finding.detail}</p>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </AppShell>
  )
}
