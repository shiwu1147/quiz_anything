# Task 9 Report: Routing, App Shell & Seed Data

## What Was Implemented

### 1. Routing Shell (src/App.tsx)
- Replaced placeholder `App.tsx` with complete routing using React Router
- Configured `BrowserRouter` with two routes:
  - `/` → `HomePage` component
  - `/quiz` → `QuizPage` component
- Imports HomePage and QuizPage from their respective page modules

### 2. Deleted Smoke Test
- Removed `src/App.test.tsx` using `git rm`
- This test was for the old placeholder App and is now superseded by HomePage.test.tsx and QuizPage.test.tsx

### 3. Seed Data: Index (public/data/index.json)
- Created with exact structure from brief:
  - One subject: "國文" (s-guowen)
  - One chapter: "ㄅ音錯別字" (c-buyin)
  - Proper id, name, order, and subjectId references

### 4. Seed Data: Questions (public/data/questions/c-buyin.json)
- Created with all 25 questions exactly as specified in brief
- Each question properly formatted with:
  - id: q01 through q25
  - chapterId: "c-buyin"
  - tag: category description
  - stem: question text (in Chinese)
  - options: 4 multiple choice options (in Chinese)
  - answerIndex: 0-3 pointing to correct option
  - explanation: detailed answer explanation with HTML formatting

## Test Results

### npm test (Full Test Suite)
```
✓ 9 test files passed
✓ 41 total tests passed
✓ No failures
✓ Duration: 2.64 seconds
```

Test files that passed:
- src/lib/quizLogic.test.ts (7 tests)
- src/lib/schema.test.ts (9 tests)
- src/lib/dataLoader.test.ts (6 tests)
- src/components/quiz/ProgressRail.test.tsx (3 tests)
- src/components/quiz/QuestionCard.test.tsx (4 tests)
- src/components/quiz/QuizEngine.test.tsx (4 tests)
- src/components/quiz/ScoreSummary.test.tsx (3 tests)
- src/pages/HomePage.test.tsx (3 tests)
- src/pages/QuizPage.test.tsx (2 tests)

Note: App.test.tsx no longer exists (correctly deleted)

### npm run build (Build Verification)
```
✓ TypeScript compilation successful
✓ Vite bundle successful
✓ Output: 3 files
  - dist/index.html (0.39 kB)
  - dist/assets/index-CZVoWk0T.css (4.80 kB)
  - dist/assets/index-C4Q8v8IK.js (221.63 kB)
✓ Build completed in 943ms
```

### Seed Data Distribution
Verified that public/data files are correctly copied to dist/:
- ✓ dist/data/index.json exists (188 bytes)
- ✓ dist/data/questions/c-buyin.json exists (12 KB, 25 questions)

Files will be servable from production at:
- `/data/index.json` (loaded by dataLoader in browser)
- `/data/questions/c-buyin.json` (loaded by dataLoader in browser)

## Files Changed

### Modified
- `src/App.tsx` - Replaced placeholder with complete routing shell

### Deleted
- `src/App.test.tsx` - Smoke test for old placeholder (superseded)

### Created
- `public/data/index.json` - Subject/chapter metadata index
- `public/data/questions/c-buyin.json` - 25-question bank for ㄅ音 chapter

## Commit Information

```
Commit: 0eed3e4
Message: feat: wire up routing and seed the ㄅ音 question bank
Files changed: 4
  - Created: public/data/index.json
  - Created: public/data/questions/c-buyin.json
  - Deleted: src/App.test.tsx
  - Modified: src/App.tsx
```

## Self-Review Findings

### Spec Coverage ✓
- Routing correctly connects HomePage (Task 7) and QuizPage (Task 8)
- Seed data index.json matches Subject/Chapter schema (Task 2)
- 25 questions in c-buyin.json are all properly formatted with all required fields
- No scope creep: exactly one subject, one chapter, 25 questions as specified

### Completeness ✓
- App.tsx: both routes defined, correct imports
- Deleted file: App.test.tsx successfully removed via git
- Data files: All 25 questions present with correct IDs (q01-q25)
- Build artifacts: Both public/data files correctly copied to dist/

### Quality ✓
- No TODOs or FIXMEs in code
- Chinese text in seed data copied exactly as specified (no modifications or reformatting)
- Question explanations with HTML formatting intact (no escaping issues)
- All prior task tests still pass (no regressions)

### Discipline ✓
- No unintended file creation
- No modifications to test files beyond necessary deletion
- tsconfig.tsbuildinfo correctly ignored (generated file)
- Commit message follows project convention

## No Issues or Concerns

All requirements met. The app is now fully routed and seeded with working quiz data that will be served statically from the public/data directory during both development and production.
