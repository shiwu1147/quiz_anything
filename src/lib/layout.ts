export type SubjectMeta = { chapters: number; questions: number }

export type ShelfDensity = 'wide' | 'normal'

export function shelfDensity(subjectCount: number): ShelfDensity {
  return subjectCount <= 2 ? 'wide' : 'normal'
}

export function tocColumns(chapterCount: number): 1 | 2 | 3 {
  if (chapterCount <= 6) return 1
  if (chapterCount <= 14) return 2
  return 3
}
