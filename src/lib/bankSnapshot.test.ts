import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadBankSnapshot, subjectMeta } from './bankSnapshot'
import * as dataLoader from './dataLoader'
import type { IndexData } from './schema'

vi.mock('./dataLoader')

const indexData: IndexData = {
  subjects: [
    { id: 's1', name: '國文', order: 0 },
    { id: 's2', name: '數學', order: 1 },
  ],
  chapters: [
    { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
    { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
    { id: 'c3', subjectId: 's2', name: '第一章', order: 0 },
  ],
}

const question = (id: string, chapterId: string) => ({
  id, chapterId, stem: '題幹',
  options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
})

beforeEach(() => {
  vi.mocked(dataLoader.loadIndex).mockResolvedValue(indexData)
})

describe('loadBankSnapshot', () => {
  it('fetches every registered chapter and counts their questions', async () => {
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) => ({
      ok: true,
      data: id === 'c1' ? [question('q1', 'c1'), question('q2', 'c1')] : [question(`${id}-q`, id)],
    }))

    const snapshot = await loadBankSnapshot()

    expect(dataLoader.fetchChapterRaw).toHaveBeenCalledTimes(3)
    expect(snapshot.index).toEqual(indexData)
    expect(snapshot.counts.get('c1')).toBe(2)
    expect(snapshot.counts.get('c2')).toBe(1)
    expect(snapshot.raws.size).toBe(3)
  })

  it('keeps failed chapters in raws but out of counts', async () => {
    vi.mocked(dataLoader.fetchChapterRaw).mockImplementation(async (id: string) =>
      id === 'c2'
        ? { ok: false, reason: 'http' as const, detail: 'HTTP 404' }
        : { ok: true, data: [question(`${id}-q`, id)] },
    )

    const snapshot = await loadBankSnapshot()

    expect(snapshot.raws.get('c2')).toEqual({ ok: false, reason: 'http', detail: 'HTTP 404' })
    expect(snapshot.counts.has('c2')).toBe(false)
  })
})

describe('subjectMeta', () => {
  it('totals chapters and questions per subject', () => {
    const counts = new Map([['c1', 25], ['c2', 18], ['c3', 30]])

    const meta = subjectMeta(indexData, counts)

    expect(meta.get('s1')).toEqual({ chapters: 2, questions: 43 })
    expect(meta.get('s2')).toEqual({ chapters: 1, questions: 30 })
  })

  it('counts a chapter whose file is unreadable as zero questions', () => {
    const counts = new Map([['c1', 25]])

    const meta = subjectMeta(indexData, counts)

    expect(meta.get('s1')).toEqual({ chapters: 2, questions: 25 })
  })
})
