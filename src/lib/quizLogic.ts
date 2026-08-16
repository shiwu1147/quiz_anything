export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function scoreCommentary(pct: number): string {
  if (pct >= 90) return '掌握度已經相當穩固，可以往下一個範圍推進。'
  if (pct >= 70) return '基礎不錯，把答錯的題目再看過一次解析即可。'
  if (pct >= 50) return '還有一半左右不熟，建議重讀相關內容後再測一次。'
  return '先把答錯題目的解析讀熟，再回頭重測一次會更有感。'
}
