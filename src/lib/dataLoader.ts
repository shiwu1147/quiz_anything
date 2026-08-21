import { indexDataSchema, questionArraySchema, type IndexData, type Question } from './schema'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`無法載入 ${url}（HTTP ${res.status}）`)
  }
  return res.json()
}

export type RawResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: 'http' | 'json'; detail: string }

export async function fetchChapterRaw(chapterId: string): Promise<RawResult> {
  let res: Response
  try {
    res = await fetch(`/data/questions/${chapterId}.json`)
  } catch (e) {
    return { ok: false, reason: 'http', detail: (e as Error).message }
  }
  if (!res.ok) {
    return { ok: false, reason: 'http', detail: `HTTP ${res.status}` }
  }
  try {
    return { ok: true, data: await res.json() }
  } catch (e) {
    return { ok: false, reason: 'json', detail: (e as Error).message }
  }
}

export async function loadIndex(): Promise<IndexData> {
  const raw = await fetchJson('/data/index.json')
  const result = indexDataSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`題庫索引格式錯誤：${result.error.message}`)
  }
  return result.data
}

export async function loadChapterQuestions(chapterId: string): Promise<Question[]> {
  const raw = await fetchJson(`/data/questions/${chapterId}.json`)
  const result = questionArraySchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`章節 ${chapterId} 的題目格式錯誤：${result.error.message}`)
  }
  return result.data
}

export async function loadMergedQuestions(chapterIds: string[]): Promise<Question[]> {
  const lists = await Promise.all(chapterIds.map((id) => loadChapterQuestions(id)))
  return lists.flat()
}
