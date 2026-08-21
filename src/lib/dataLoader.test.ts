import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadIndex, loadChapterQuestions, loadMergedQuestions, fetchChapterRaw } from './dataLoader'

function mockFetchOnce(url: string, body: unknown, ok = true, status = 200) {
  return { url, ok, status, json: async () => body }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('loadIndex', () => {
  it('fetches and parses /data/index.json', async () => {
    const payload = {
      subjects: [{ id: 's1', name: '國文', order: 0 }],
      chapters: [{ id: 'c1', subjectId: 's1', name: '第一章', order: 0 }],
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, payload)))

    const result = await loadIndex()

    expect(fetch).toHaveBeenCalledWith('/data/index.json')
    expect(result).toEqual(payload)
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, {}, false, 404)))

    await expect(loadIndex()).rejects.toThrow(/HTTP 404/)
  })

  it('throws a descriptive error when the shape is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, { subjects: 'not-an-array' })))

    await expect(loadIndex()).rejects.toThrow(/題庫索引格式錯誤/)
  })
})

describe('loadChapterQuestions', () => {
  it('fetches and parses /data/questions/<chapterId>.json', async () => {
    const payload = [{
      id: 'q1', chapterId: 'c1', stem: '題幹',
      options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
    }]
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, payload)))

    const result = await loadChapterQuestions('c1')

    expect(fetch).toHaveBeenCalledWith('/data/questions/c1.json')
    expect(result).toEqual(payload)
  })

  it('throws a descriptive error naming the chapter when the shape is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, [{ id: 'q1' }])))

    await expect(loadChapterQuestions('c1')).rejects.toThrow(/章節 c1 的題目格式錯誤/)
  })
})

describe('loadMergedQuestions', () => {
  it('concatenates questions from multiple chapters in the given order', async () => {
    const q = (id: string, chapterId: string) => ({
      id, chapterId, stem: '題幹', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
    })
    const byUrl: Record<string, unknown> = {
      '/data/questions/c1.json': [q('q1', 'c1')],
      '/data/questions/c2.json': [q('q2', 'c2'), q('q3', 'c2')],
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, byUrl[url])))

    const result = await loadMergedQuestions(['c1', 'c2'])

    expect(result.map((q) => q.id)).toEqual(['q1', 'q2', 'q3'])
  })
})

describe('fetchChapterRaw', () => {
  const question = {
    id: 'q1', chapterId: 'c1', stem: '題幹',
    options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: '解析',
  }

  it('returns the raw body when the response is ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, [question])))

    const result = await fetchChapterRaw('c1')

    expect(fetch).toHaveBeenCalledWith('/data/questions/c1.json')
    expect(result).toEqual({ ok: true, data: [question] })
  })

  it('reports an http failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => mockFetchOnce(url, {}, false, 404)))

    const result = await fetchChapterRaw('c-missing')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.reason).toBe('http')
    expect(result.detail).toMatch(/404/)
  })

  it('reports a json failure when the body cannot be parsed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token }') },
    })))

    const result = await fetchChapterRaw('c-broken')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.reason).toBe('json')
    expect(result.detail).toMatch(/Unexpected token/)
  })

  it('reports an http failure when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    const result = await fetchChapterRaw('c1')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.reason).toBe('http')
  })
})
