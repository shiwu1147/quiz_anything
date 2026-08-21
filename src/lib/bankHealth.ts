import { z } from 'zod'
import { questionArraySchema, type Chapter, type IndexData } from './schema'
import type { RawResult } from './dataLoader'

export type Finding = {
  severity: 'error' | 'warning'
  subjectId?: string
  chapterId?: string
  title: string
  detail: string
}

export function checkBank(index: IndexData, raws: Map<string, RawResult>): Finding[] {
  const findings: Finding[] = []
  const subjectIds = new Set(index.subjects.map((s) => s.id))

  for (const order of duplicates(index.subjects.map((s) => s.order))) {
    findings.push({
      severity: 'warning',
      title: `科目排序重號 · order ${order}`,
      detail: `有多個科目的 order 都是 ${order}，排序結果不穩定。`,
    })
  }

  for (const subject of index.subjects) {
    const own = index.chapters.filter((c) => c.subjectId === subject.id)
    for (const order of duplicates(own.map((c) => c.order))) {
      findings.push({
        severity: 'warning',
        subjectId: subject.id,
        title: `${subject.name} · 章節排序重號 · order ${order}`,
        detail: `${subject.name} 底下有多個章節的 order 都是 ${order}，排序結果不穩定。`,
      })
    }
  }

  for (const chapter of index.chapters) {
    if (!subjectIds.has(chapter.subjectId)) {
      findings.push({
        severity: 'error',
        chapterId: chapter.id,
        title: `${chapter.name} · 科目不存在`,
        detail: `章節 ${chapter.id} 的 subjectId 是 ${chapter.subjectId}，但 index.json 沒有這個科目。`,
      })
    }
  }

  for (const chapter of index.chapters) {
    findings.push(...checkChapter(chapter, raws.get(chapter.id)))
  }

  return findings
}

export function countQuestions(raws: Map<string, RawResult>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const [chapterId, raw] of raws) {
    if (!raw.ok) continue
    const parsed = questionArraySchema.safeParse(raw.data)
    if (parsed.success) counts.set(chapterId, parsed.data.length)
  }
  return counts
}

function checkChapter(chapter: Chapter, raw: RawResult | undefined): Finding[] {
  const file = `/data/questions/${chapter.id}.json`
  const where = { subjectId: chapter.subjectId, chapterId: chapter.id }

  if (raw === undefined || (!raw.ok && raw.reason === 'http')) {
    const why = raw === undefined ? '沒有載入結果' : raw.detail
    return [{
      ...where,
      severity: 'error',
      title: `${chapter.name} · 檔案不存在`,
      detail: `index.json 登記了 ${chapter.id}，但 ${file} 抓不到（${why}）。`,
    }]
  }

  if (!raw.ok) {
    return [{
      ...where,
      severity: 'error',
      title: `${chapter.name} · JSON 壞掉`,
      detail: `${file} 不是合法的 JSON（${raw.detail}）。`,
    }]
  }

  const parsed = questionArraySchema.safeParse(raw.data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return [{
      ...where,
      severity: 'error',
      title: `${chapter.name} · 格式不符`,
      detail: `${file}：${describePath(issue.path)} ${describeIssue(issue)}。`,
    }]
  }

  const questions = parsed.data
  const findings: Finding[] = []

  if (questions.length === 0) {
    findings.push({
      ...where,
      severity: 'warning',
      title: `${chapter.name} · 沒有題目`,
      detail: `${chapter.name} 有登記，但這一章還沒有題目。`,
    })
  }

  const mismatched = questions.filter((q) => q.chapterId !== chapter.id)
  if (mismatched.length > 0) {
    const first = mismatched[0]
    findings.push({
      ...where,
      severity: 'error',
      title: `${chapter.name} · chapterId 對不上`,
      detail: `${file} 裡有 ${mismatched.length} 題的 chapterId 不是 ${chapter.id}（第一個是 ${first.id}，寫的是 ${first.chapterId}）。`,
    })
  }

  for (const id of duplicates(questions.map((q) => q.id))) {
    findings.push({
      ...where,
      severity: 'error',
      title: `${chapter.name} · 題號重複`,
      detail: `${file} 裡有多題的 id 都是 ${id}。`,
    })
  }

  return findings
}

function duplicates<T>(values: T[]): T[] {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].filter(([, n]) => n > 1).map(([value]) => value)
}

function describePath(path: Array<string | number>): string {
  const [index, ...rest] = path
  if (typeof index !== 'number') return path.length > 0 ? path.join('.') : '整份檔案'
  const field = rest.join('.')
  return field ? `第 ${index + 1} 題的 ${field}` : `第 ${index + 1} 題`
}

function describeIssue(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') return '缺少此欄位'
  return issue.message
}
