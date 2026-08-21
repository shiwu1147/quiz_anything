import './bank.css'
import { useEffect, useState } from 'react'
import { AppShell } from '../components/shell/AppShell'
import { SubjectShelf } from '../components/shell/SubjectShelf'
import { MarginColumn } from '../components/shell/MarginColumn'
import { ChapterToc } from '../components/shell/ChapterToc'
import { loadBankSnapshot, subjectMeta, type BankSnapshot } from '../lib/bankSnapshot'
import { checkBank, type Finding } from '../lib/bankHealth'

export default function BankPage() {
  const [snapshot, setSnapshot] = useState<BankSnapshot | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBankSnapshot()
      .then((s) => {
        if (cancelled) return
        setSnapshot(s)
        setFindings(checkBank(s.index, s.raws))
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <AppShell zone="bank">
        <div className="bk-finding">
          <p className="bk-finding-title">題庫索引讀不到</p>
          <p className="bk-finding-detail">{error}</p>
        </div>
      </AppShell>
    )
  }

  if (!snapshot) {
    return (
      <AppShell zone="bank">
        <p className="sh-empty">檢查題庫中…</p>
      </AppShell>
    )
  }

  const { index, counts } = snapshot
  const meta = subjectMeta(index, counts)
  const subjects = [...index.subjects].sort((a, b) => a.order - b.order)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null
  const chapters = index.chapters
    .filter((c) => c.subjectId === selectedSubjectId)
    .sort((a, b) => a.order - b.order)
  const totalQuestions = [...counts.values()].reduce((sum, n) => sum + n, 0)
  const maxCount = Math.max(1, ...chapters.map((c) => counts.get(c.id) ?? 0))

  return (
    <AppShell zone="bank">
      <SubjectShelf
        subjects={subjects}
        selectedId={selectedSubjectId}
        onSelect={setSelectedSubjectId}
        meta={meta}
      />
      <div className="sh-body">
        <div className="sh-sheet">
          <div className="sh-sheet-head">
            <h1 className="sh-sheet-title">{selectedSubject ? selectedSubject.name : '題庫'}</h1>
          </div>

          {selectedSubject ? (
            <ChapterToc itemCount={chapters.length}>
              {chapters.map((chapter) => {
                const count = counts.get(chapter.id)
                return (
                  <li key={chapter.id}>
                    <div className="sh-toc-row">
                      <span className="sh-toc-name">{chapter.name}</span>
                      <span className={count === undefined ? 'sh-toc-aside bk-broken' : 'sh-toc-aside'}>
                        {count === undefined ? '讀不到' : `${count} 題`}
                      </span>
                    </div>
                    <div
                      className="bk-bar"
                      style={{ width: `${((count ?? 0) / maxCount) * 100}%` }}
                    />
                  </li>
                )
              })}
            </ChapterToc>
          ) : (
            <p className="sh-empty">選一個科目看它收了哪些章。</p>
          )}
        </div>

        <MarginColumn>
          <section>
            <p className="sh-margin-head">概況</p>
            <p className="bk-total">
              {index.subjects.length} 科 · {index.chapters.length} 章 · {totalQuestions} 題
            </p>
            {index.chapters.length <= 1 && (
              <p className="sh-empty">題庫檔案放在 <code>public/data/</code>。</p>
            )}
          </section>
          <section>
            <p className="sh-margin-head">朱批</p>
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
        </MarginColumn>
      </div>
    </AppShell>
  )
}
