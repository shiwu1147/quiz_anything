# Task 3: Data Loader - Completion Report

## What Was Implemented

Created `src/lib/dataLoader.ts` with three exported async functions:
- **`loadIndex()`** - Fetches and validates `/data/index.json` against `indexDataSchema`
- **`loadChapterQuestions(chapterId: string)`** - Fetches and validates chapter questions from `/data/questions/<chapterId>.json` against `questionArraySchema`
- **`loadMergedQuestions(chapterIds: string[])`** - Combines questions from multiple chapters in order using `Promise.all()` and `Array.flat()`

Implementation includes:
- Private helper `fetchJson()` that handles HTTP errors with descriptive messages
- Schema validation using Zod's `safeParse()` with Chinese error messages
- Proper error handling: HTTP errors reference the URL and status, validation errors name the resource (e.g., chapter ID)

Also created comprehensive test suite in `src/lib/dataLoader.test.ts` with 6 tests covering all three functions and error cases.

## TDD Evidence

### RED (Failing Test)
```bash
Command: npx vitest run src/lib/dataLoader.test.ts
Output: FAIL - Error: Failed to resolve import "./dataLoader" from "src/lib/dataLoader.test.ts"
```
Test file existed but implementation didn't, causing import resolution failure.

### GREEN (Passing Tests)
```bash
Command: npx vitest run src/lib/dataLoader.test.ts
Output:
✓ src/lib/dataLoader.test.ts (6 tests)
  Test Files: 1 passed (1)
  Tests: 6 passed (6)
```
All tests pass after implementation:
1. loadIndex fetches and parses /data/index.json
2. loadIndex throws on HTTP error
3. loadIndex throws on invalid schema
4. loadChapterQuestions fetches and parses chapter JSON
5. loadChapterQuestions throws with chapter ID in error message
6. loadMergedQuestions concatenates questions from multiple chapters

## Files Changed

- **Created:** `src/lib/dataLoader.ts` (32 lines)
  - `fetchJson()` private helper
  - `loadIndex()` public export
  - `loadChapterQuestions()` public export
  - `loadMergedQuestions()` public export

- **Created:** `src/lib/dataLoader.test.ts` (75 lines)
  - Test helper `mockFetchOnce()`
  - 3 test suites, 6 tests total
  - Tests cover success paths and error conditions

## Self-Review Findings

✓ **Completeness:** All three functions implemented exactly as specified in brief
✓ **Code quality:** Clean, readable, follows TypeScript best practices
✓ **Error messages:** Chinese error messages match expectations (題庫索引格式錯誤, 章節 X 的題目格式錯誤)
✓ **Testing:** Tests use Vitest mocking correctly, all pass
✓ **Schema integration:** Properly imports and uses `indexDataSchema`, `questionArraySchema` from Task 2
✓ **Type safety:** Full TypeScript types with IndexData and Question imports from schema
✓ **No scope creep:** Implementation matches brief exactly, no additional features

## Issues or Concerns

None. Implementation is complete, all tests pass, code is clean.

## Commit

```
f2e012e feat: add data loader that fetches and validates question-bank JSON
```
