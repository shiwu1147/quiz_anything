import { describe, it, expect } from 'vitest'
import { checkBank, countQuestions } from './bankHealth'
import type { RawResult } from './dataLoader'
import type { IndexData } from './schema'

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1', chapterId: 'c1', stem: '題幹',
    options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
    ...overrides,
  }
}

const index: IndexData = {
  subjects: [{ id: 's1', name: '國文', order: 0 }],
  chapters: [{ id: 'c1', subjectId: 's1', name: '第一章', order: 0 }],
}

function raws(entries: Record<string, RawResult>): Map<string, RawResult> {
  return new Map(Object.entries(entries))
}

describe('checkBank', () => {
  it('returns no findings for a healthy bank', () => {
    const result = checkBank(index, raws({ c1: { ok: true, data: [question()] } }))

    expect(result).toEqual([])
  })

  it('flags a chapter whose file cannot be fetched', () => {
    const result = checkBank(index, raws({ c1: { ok: false, reason: 'http', detail: 'HTTP 404' } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].chapterId).toBe('c1')
    expect(result[0].title).toContain('第一章')
    expect(result[0].detail).toContain('/data/questions/c1.json')
  })

  it('flags a chapter with no load result at all', () => {
    const result = checkBank(index, raws({}))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].chapterId).toBe('c1')
  })

  it('flags a chapter whose json is malformed', () => {
    const result = checkBank(index, raws({ c1: { ok: false, reason: 'json', detail: 'Unexpected token }' } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].title).toContain('JSON')
  })

  it('names the offending question and field when the schema fails', () => {
    const broken = [question(), question({ id: 'q2' }), question({ id: 'q3', answerIndex: undefined })]
    const result = checkBank(index, raws({ c1: { ok: true, data: broken } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('第 3 題')
    expect(result[0].detail).toContain('answerIndex')
  })

  it('flags questions whose chapterId does not match the registered chapter', () => {
    const data = [question(), question({ id: 'q2', chapterId: 'c-other' })]
    const result = checkBank(index, raws({ c1: { ok: true, data } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('q2')
    expect(result[0].detail).toContain('c-other')
  })

  it('flags a chapter pointing at a subject that does not exist', () => {
    const orphanIndex: IndexData = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [{ id: 'c1', subjectId: 's-gone', name: '第一章', order: 0 }],
    }
    const result = checkBank(orphanIndex, raws({ c1: { ok: true, data: [question()] } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('s-gone')
  })

  it('flags duplicate question ids within a chapter', () => {
    const data = [question(), question({ stem: '另一題' })]
    const result = checkBank(index, raws({ c1: { ok: true, data } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
    expect(result[0].detail).toContain('q1')
  })

  it('warns about a registered chapter with no questions', () => {
    const result = checkBank(index, raws({ c1: { ok: true, data: [] } }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].title).toContain('第一章')
  })

  it('warns about duplicate order among chapters of the same subject', () => {
    const dupIndex: IndexData = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [
        { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
        { id: 'c2', subjectId: 's1', name: '第二章', order: 0 },
      ],
    }
    const result = checkBank(dupIndex, raws({
      c1: { ok: true, data: [question()] },
      c2: { ok: true, data: [question({ id: 'q2', chapterId: 'c2' })] },
    }))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].detail).toContain('order')
  })

  it('does not warn when the same order is used under different subjects', () => {
    const twoSubjects: IndexData = {
      subjects: [
        { id: 's1', name: '國文', order: 0 },
        { id: 's2', name: '數學', order: 1 },
      ],
      chapters: [
        { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
        { id: 'c2', subjectId: 's2', name: '第一章', order: 0 },
      ],
    }
    const result = checkBank(twoSubjects, raws({
      c1: { ok: true, data: [question()] },
      c2: { ok: true, data: [question({ id: 'q2', chapterId: 'c2' })] },
    }))

    expect(result).toEqual([])
  })

  it('warns about duplicate order among subjects', () => {
    const dupIndex: IndexData = {
      subjects: [
        { id: 's1', name: '國文', order: 0 },
        { id: 's2', name: '數學', order: 0 },
      ],
      chapters: [],
    }
    const result = checkBank(dupIndex, raws({}))

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
    expect(result[0].title).toContain('科目')
  })

  it('reports every problem when several coexist', () => {
    const messy: IndexData = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [
        { id: 'c1', subjectId: 's1', name: '第一章', order: 0 },
        { id: 'c2', subjectId: 's1', name: '第二章', order: 1 },
      ],
    }
    const result = checkBank(messy, raws({
      c1: { ok: false, reason: 'http', detail: 'HTTP 404' },
      c2: { ok: true, data: [] },
    }))

    expect(result).toHaveLength(2)
    expect(result.map((f) => f.severity)).toEqual(['error', 'warning'])
  })
})

describe('countQuestions', () => {
  it('counts questions per chapter for files that parse', () => {
    const result = countQuestions(raws({
      c1: { ok: true, data: [question(), question({ id: 'q2' })] },
      c2: { ok: true, data: [] },
    }))

    expect(result.get('c1')).toBe(2)
    expect(result.get('c2')).toBe(0)
  })

  it('omits chapters whose file is missing or malformed', () => {
    const result = countQuestions(raws({
      c1: { ok: false, reason: 'http', detail: 'HTTP 404' },
      c2: { ok: true, data: [{ id: 'nope' }] },
    }))

    expect(result.has('c1')).toBe(false)
    expect(result.has('c2')).toBe(false)
  })
})
