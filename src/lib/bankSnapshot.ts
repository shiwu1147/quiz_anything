import { loadIndex, fetchChapterRaw, type RawResult } from './dataLoader'
import { countQuestions } from './bankHealth'
import type { SubjectMeta } from './layout'
import type { IndexData } from './schema'

export type BankSnapshot = {
  index: IndexData
  raws: Map<string, RawResult>
  counts: Map<string, number>
}

export async function loadBankSnapshot(): Promise<BankSnapshot> {
  const index = await loadIndex()
  const entries = await Promise.all(
    index.chapters.map(async (chapter) => [chapter.id, await fetchChapterRaw(chapter.id)] as const),
  )
  const raws = new Map<string, RawResult>(entries)
  return { index, raws, counts: countQuestions(raws) }
}

export function subjectMeta(
  index: IndexData,
  counts: Map<string, number>,
): Map<string, SubjectMeta> {
  const meta = new Map<string, SubjectMeta>()
  for (const subject of index.subjects) {
    const own = index.chapters.filter((c) => c.subjectId === subject.id)
    meta.set(subject.id, {
      chapters: own.length,
      questions: own.reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0),
    })
  }
  return meta
}
