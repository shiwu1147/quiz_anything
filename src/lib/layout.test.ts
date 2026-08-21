import { describe, it, expect } from 'vitest'
import { shelfDensity, tocColumns } from './layout'

describe('shelfDensity', () => {
  it('widens the spines for two subjects or fewer', () => {
    expect(shelfDensity(0)).toBe('wide')
    expect(shelfDensity(1)).toBe('wide')
    expect(shelfDensity(2)).toBe('wide')
  })

  it('keeps the normal spine width from three subjects up', () => {
    expect(shelfDensity(3)).toBe('normal')
    expect(shelfDensity(6)).toBe('normal')
    expect(shelfDensity(20)).toBe('normal')
  })
})

describe('tocColumns', () => {
  it('uses one column up to six chapters', () => {
    expect(tocColumns(0)).toBe(1)
    expect(tocColumns(1)).toBe(1)
    expect(tocColumns(6)).toBe(1)
  })

  it('uses two columns from seven to fourteen chapters', () => {
    expect(tocColumns(7)).toBe(2)
    expect(tocColumns(10)).toBe(2)
    expect(tocColumns(14)).toBe(2)
  })

  it('uses three columns from fifteen chapters up', () => {
    expect(tocColumns(15)).toBe(3)
    expect(tocColumns(40)).toBe(3)
  })
})
