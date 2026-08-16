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
