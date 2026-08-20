## Task 2: Data Model & Schema Validation

**Files:**
- Create: `src/lib/schema.ts`
- Test: `src/lib/schema.test.ts`

**Interfaces:**
- Produces: `subjectSchema`, `chapterSchema`, `questionSchema`, `indexDataSchema`, `questionArraySchema` (Zod schemas), and types `Subject`, `Chapter`, `Question`, `IndexData` — used by every later task that touches question-bank data.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/schema.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL — cannot find module `./schema`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/schema.ts
import { z } from 'zod'

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
})

export const chapterSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  tag: z.string().optional(),
  stem: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
})

export const indexDataSchema = z.object({
  subjects: z.array(subjectSchema),
  chapters: z.array(chapterSchema),
})

export const questionArraySchema = z.array(questionSchema)

export type Subject = z.infer<typeof subjectSchema>
export type Chapter = z.infer<typeof chapterSchema>
export type Question = z.infer<typeof questionSchema>
export type IndexData = z.infer<typeof indexDataSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat: add Zod schemas for subjects, chapters and questions"
```

---

