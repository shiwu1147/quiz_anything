import { indexDataSchema, questionArraySchema, type IndexData, type Question } from './schema'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`無法載入 ${url}（HTTP ${res.status}）`)
  }
  return res.json()
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
