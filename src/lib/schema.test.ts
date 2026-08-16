import { describe, it, expect } from 'vitest'
import { subjectSchema, chapterSchema, questionSchema, indexDataSchema } from './schema'

describe('subjectSchema', () => {
  it('accepts a valid subject', () => {
    expect(subjectSchema.safeParse({ id: 's1', name: '國文', order: 0 }).success).toBe(true)
  })

  it('rejects a subject missing a name', () => {
    expect(subjectSchema.safeParse({ id: 's1', order: 0 }).success).toBe(false)
  })
})

describe('chapterSchema', () => {
  it('accepts a valid chapter', () => {
    const result = chapterSchema.safeParse({ id: 'c1', subjectId: 's1', name: '第一章', order: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects a chapter missing subjectId', () => {
    expect(chapterSchema.safeParse({ id: 'c1', name: '第一章', order: 0 }).success).toBe(false)
  })
})

describe('questionSchema', () => {
  const base = {
    id: 'q1',
    chapterId: 'c1',
    stem: '題幹',
    options: ['A', 'B', 'C', 'D'],
    answerIndex: 1,
    explanation: '解析',
  }

  it('accepts a valid question', () => {
    expect(questionSchema.safeParse(base).success).toBe(true)
  })

  it('accepts a valid question with an optional tag', () => {
    expect(questionSchema.safeParse({ ...base, tag: '分類' }).success).toBe(true)
  })

  it('rejects an answerIndex out of range', () => {
    expect(questionSchema.safeParse({ ...base, answerIndex: 4 }).success).toBe(false)
  })

  it('rejects options with fewer than 4 entries', () => {
    expect(questionSchema.safeParse({ ...base, options: ['A', 'B'] }).success).toBe(false)
  })
})

describe('indexDataSchema', () => {
  it('accepts subjects and chapters together', () => {
    const result = indexDataSchema.safeParse({
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [{ id: 'c1', subjectId: 's1', name: '第一章', order: 0 }],
    })
    expect(result.success).toBe(true)
  })
})
