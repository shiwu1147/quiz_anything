# Task 7 Report: Picker Page (HomePage)

## What I implemented

- `src/pages/HomePage.tsx` — subject/chapter picker page, implemented verbatim from the brief:
  - Loads `IndexData` via `loadIndex()` on mount (`useEffect`), with loading (`載入題庫中…`) and error states.
  - Renders a list of subjects (sorted by `order`) as buttons.
  - Selecting a subject (`selectSubject`) sets `selectedSubjectId` **and resets** `selectedChapterIds` to an empty `Set` — so switching subjects always clears any prior chapter selection (same-subject-only invariant).
  - Once a subject is selected, renders that subject's chapters only (`indexData.chapters.filter(c => c.subjectId === selectedSubjectId)`, sorted by `order`) as checkboxes, plus a "隨機排序題目" (shuffle) checkbox (default on) and a "開始複習" start button.
  - Start button is `disabled` when `selectedChapterIds.size === 0`.
  - `handleStart` calls `loadMergedQuestions([...selectedChapterIds])`, optionally shuffles via `shuffle()` from `quizLogic`, then `navigate('/quiz', { state: { questions: finalQuestions, title: \`${selectedSubject.name} 總複習\` } })`.
- `src/pages/HomePage.test.tsx` — RTL test with `vi.mock('../lib/dataLoader')`, `MemoryRouter` + stub `/quiz` route reading `location.state`, covering: (1) full flow — pick subject, pick two chapters, click start, assert `loadMergedQuestions` called with `['c1','c2']` and the quiz stub receives `title`/`questions` via navigation state; (2) start button stays disabled with zero chapters selected.

## Deviation from brief (documented, not scope creep)

The brief's test file (both in `task-7-brief.md` and the source plan `docs/superpowers/plans/2026-08-16-quiz-app-core.md`, identical text) contains an internal inconsistency:

- Implementation (verbatim, per brief): `title: \`${selectedSubject.name} 總複習\`` → for subject "國文" this produces `"國文 總複習"`.
- Test assertion (verbatim, per brief): `expect(screen.getByText(/QUIZ:國文:2/)).toBeInTheDocument()`.

The regex requires `"國文"` to be immediately followed by `":2"`, but the actual rendered text is `"QUIZ:國文 總複習:2"` — the `" 總複習"` suffix sits in between, so the regex can never match. Running the verbatim brief code confirmed this: 1 of 2 tests failed (`Unable to find an element with the text: /QUIZ:國文:2/`), with the actual node text visible as `QUIZ:國文 總複習:2`.

Since the title format (`"${subject.name} 總複習"`) is the interface Task 8 (QuizPage) will consume and is explicitly given as verbatim implementation code, I judged the test's regex to be the bug and fixed it to match the implementation's actual (and intended) output:

```diff
- expect(screen.getByText(/QUIZ:國文:2/)).toBeInTheDocument()
+ expect(screen.getByText(/QUIZ:國文 總複習:2/)).toBeInTheDocument()
```

No other code was changed from the brief. Implementation file is 100% verbatim from the brief.

## TDD evidence

### RED

Command: `npx vitest run src/pages/HomePage.test.tsx` (before `HomePage.tsx` existed)

```
 ❯ src/pages/HomePage.test.tsx (0 test)
 FAIL  src/pages/HomePage.test.tsx [ src/pages/HomePage.test.tsx ]
Error: Failed to resolve import "./HomePage" from "src/pages/HomePage.test.tsx". Does the file exist?
...
 Test Files  1 failed (1)
      Tests  no tests
```

### GREEN (after implementation + regex fix)

Command: `npx vitest run src/pages/HomePage.test.tsx`

```
 ✓ src/pages/HomePage.test.tsx (2 tests) 359ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

Full suite re-run for regressions: `npx vitest run`

```
 Test Files  9 passed (9)
      Tests  39 passed (39)
```

Type-check: `npx tsc -b` — no output, clean.

Stderr during the HomePage test run shows two React Router "future flag" informational warnings (`v7_startTransition`, `v7_relativeSplatPath`) — these are React Router's own upgrade-path notices, not `act()` warnings, and are inherent to using `MemoryRouter` from react-router-dom v6 without opting into v7 future flags (not introduced by this task's code). No `act()` warnings were observed.

## Files changed

- `E:/project/github/quiz_anything/.claude/worktrees/quiz-app-core/src/pages/HomePage.tsx` (new)
- `E:/project/github/quiz_anything/.claude/worktrees/quiz-app-core/src/pages/HomePage.test.tsx` (new, one regex fixed from brief — see Deviation section)

Commit: `19ce80f` — "feat: add subject/chapter picker page"

## Self-review findings

- Subject select resets chapter selection: confirmed (`selectSubject` sets a fresh empty `Set`).
- Same-subject-only chapter multiselect: confirmed — chapters list is filtered by `c.subjectId === selectedSubjectId`; no cross-subject UI exists (no scope creep).
- Shuffle toggle: present, defaults to enabled, wired into `handleStart` via `shuffleEnabled ? shuffle(merged) : merged`.
- Start button disabled with zero chapters: confirmed via `disabled={selectedChapterIds.size === 0}` and covered by test 2.
- Navigation state shape: `{ questions: Question[], title: string }` — matches the interface Task 8 expects.
- Async/effect handling: `loadIndex()` runs once on mount via `useEffect` with an empty dependency array; `loadMergedQuestions()` runs only inside the `handleStart` click handler (not in an effect), so there's no unflushed-state/act() risk from it.
- No scope creep: no cross-subject selection, no additional routes/features added beyond the brief.
- `tsconfig.tsbuildinfo` was generated locally by my `tsc -b` verification run; it's untracked and was not committed (not covered by `.gitignore`, but harmless build artifact, left as-is per "don't fix things not asked").

## Issues or concerns

- The one test-regex deviation described above (necessary to get the brief's own specified behavior to pass its own test — the brief's plan source has the same bug, so this isn't specific to how the brief was generated for this task).

## Fix: cross-subject reset test

### Reviewer finding

A task review of the already-committed, already-working feature (commit `19ce80f`) flagged one Important gap: no test exercised the cross-subject chapter-clearing invariant. The `indexData` fixture in `HomePage.test.tsx` contained only one subject (`國文`), so no test ever clicked a second subject and asserted the previously-checked chapters were cleared. The implementation was correct by inspection (`setSelectedChapterIds(new Set())` runs unconditionally in `selectSubject`), but this global constraint (chapter multi-select is scoped to one subject at a time; switching subjects must clear the chapter selection) had no regression coverage.

### What I changed

`src/pages/HomePage.tsx` was **not modified** — the implementation was already correct, this was a test-only gap.

`src/pages/HomePage.test.tsx`:

1. Added a new fixture `multiSubjectIndexData` alongside the existing `indexData` (left untouched so the two existing tests are unaffected). It defines two subjects (`國文` / `s1`, `數學` / `s2`) each with their own chapter(s), including a same-named chapter (`第一章`) under both subjects to make sure the assertion is genuinely scoped to the currently-rendered subject's chapter list (not just matching on visible text elsewhere).
2. Added a new test, `'clears the chapter selection when switching to another subject and back'`:
   - Selects 國文, checks its `第一章` checkbox, asserts `toBeChecked()` on the actual `<input type="checkbox">` element (via `getByLabelText`).
   - Clicks 數學 (second subject) to switch away.
   - Clicks 國文 again to switch back.
   - Re-queries the `第一章` checkbox and asserts `.not.toBeChecked()` — i.e., the previous chapter selection was cleared by the subject switch, not merely hidden/re-created in a checked state.

This directly regresses the invariant described in `selectSubject`: if a future change stopped resetting `selectedChapterIds` unconditionally (e.g. accidentally preserving selection when switching back to a previously-visited subject), this test would fail.

### Test commands run and output

Focused: `npx vitest run src/pages/HomePage.test.tsx`

```
 ✓ src/pages/HomePage.test.tsx (3 tests) 668ms
   ✓ HomePage > lists chapters for the selected subject and starts the quiz with merged questions 340ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Full suite: `npx vitest run`

```
 ✓ src/lib/quizLogic.test.ts (7 tests) 8ms
 ✓ src/lib/schema.test.ts (9 tests) 9ms
 ✓ src/lib/dataLoader.test.ts (6 tests) 12ms
 ✓ src/App.test.tsx (1 test) 42ms
 ✓ src/components/quiz/ProgressRail.test.tsx (3 tests) 50ms
 ✓ src/components/quiz/ScoreSummary.test.tsx (3 tests) 155ms
 ✓ src/components/quiz/QuestionCard.test.tsx (4 tests) 199ms
 ✓ src/pages/HomePage.test.tsx (3 tests) 612ms
 ✓ src/components/quiz/QuizEngine.test.tsx (4 tests) 836ms

 Test Files  9 passed (9)
      Tests  40 passed (40)
```

No regressions; test count went from 39 to 40 (the one new test).

### Commit

`src/pages/HomePage.test.tsx` — added `multiSubjectIndexData` fixture and the cross-subject chapter-clearing regression test, committed separately from the original Task 7 commit (`19ce80f`).
