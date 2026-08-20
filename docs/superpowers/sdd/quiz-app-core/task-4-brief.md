## Task 4: Quiz Pure Logic (shuffle & scoring)

**Files:**
- Create: `src/lib/quizLogic.ts`
- Test: `src/lib/quizLogic.test.ts`

**Interfaces:**
- Produces: `shuffle<T>(items: T[], rng?: () => number): T[]`, `scoreCommentary(pct: number): string` — used by the picker page (Task 7) and `ScoreSummary` (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/quizLogic.test.ts
import { describe, it, expect } from 'vitest'
import { shuffle, scoreCommentary } from './quizLogic'

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4]
    const result = shuffle(input, () => 0.999)
    expect(result).not.toBe(input)
    expect([...result].sort()).toEqual([1, 2, 3, 4])
  })

  it('produces a deterministic order for a deterministic rng', () => {
    const result = shuffle([1, 2, 3, 4], () => 0)
    expect(result).toEqual([2, 3, 4, 1])
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    shuffle(input, () => 0)
    expect(input).toEqual([1, 2, 3])
  })
})

describe('scoreCommentary', () => {
  it('returns the top-tier message at 90% and above', () => {
    expect(scoreCommentary(90)).toMatch(/推進/)
    expect(scoreCommentary(100)).toMatch(/推進/)
  })

  it('returns the second-tier message between 70% and 89%', () => {
    expect(scoreCommentary(70)).toMatch(/解析/)
    expect(scoreCommentary(89)).toMatch(/解析/)
  })

  it('returns the third-tier message between 50% and 69%', () => {
    expect(scoreCommentary(50)).toMatch(/重讀/)
    expect(scoreCommentary(69)).toMatch(/重讀/)
  })

  it('returns the lowest-tier message below 50%', () => {
    expect(scoreCommentary(0)).toMatch(/答錯題目/)
    expect(scoreCommentary(49)).toMatch(/答錯題目/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/quizLogic.test.ts`
Expected: FAIL — cannot find module `./quizLogic`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/quizLogic.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/quizLogic.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quizLogic.ts src/lib/quizLogic.test.ts
git commit -m "feat: add shuffle and score-commentary pure logic"
```

---

