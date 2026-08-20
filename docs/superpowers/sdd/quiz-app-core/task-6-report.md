# Task 6: QuizEngine Orchestrator — Report

## What was implemented

Created `src/components/quiz/QuizEngine.tsx`, the stateful orchestrator that owns all quiz
state (`answers: Array<number | null>`, `currentIndex`, `finished`) and composes the Task-5
presentational components (`ProgressRail`, `QuestionCard`, `ScoreSummary`). Implements:

- Click-to-answer via `QuestionCard`'s `onAnswer` prop.
- Keyboard answering: digits `1`-`4` and letters `a`-`d` (case-insensitive) map to option
  indices 0-3 via `KEY_MAP`, handled in a `window` `keydown` listener registered in a
  dependency-less `useEffect` (re-registers every render so the closure always sees fresh
  `locked`/`finished`/`currentIndex`/`answers` state — no stale-closure bug).
- Advance-to-next via the `QuestionCard`'s next/finish button or `Enter`/`ArrowRight` keys,
  guarded by `locked` (must have answered) and `finished`.
- On advancing past the last question, flips to `finished` and renders `ScoreSummary` with
  computed `hits`, `total`, and `wrongEntries` (questions answered incorrectly, in order).
- `handleRestart` resets `answers`/`currentIndex`/`finished` to start state.

Code matches the task brief verbatim (Step 3), as instructed.

Files created:
- `src/components/quiz/QuizEngine.tsx`
- `src/components/quiz/QuizEngine.test.tsx` (verbatim from brief Step 1)

No other files were modified — `ProgressRail.tsx`, `QuestionCard.tsx`, `ScoreSummary.tsx`,
and `src/lib/schema.ts` were read-only references to confirm interface compatibility.

## TDD evidence

### RED

Command: `npx vitest run src/components/quiz/QuizEngine.test.tsx` (run before creating
`QuizEngine.tsx`)

```
 RUN  v2.1.9 E:/project/github/quiz_anything/.claude/worktrees/quiz-app-core

 ❯ src/components/quiz/QuizEngine.test.tsx (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/components/quiz/QuizEngine.test.tsx [ src/components/quiz/QuizEngine.test.tsx ]
Error: Failed to resolve import "./QuizEngine" from "src/components/quiz/QuizEngine.test.tsx". Does the file exist?
...
 Test Files  1 failed (1)
      Tests  no tests
```

Confirmed failure was the expected "cannot find module `./QuizEngine`" per the brief.

### GREEN

Command: `npx vitest run src/components/quiz/QuizEngine.test.tsx` (after implementing
`QuizEngine.tsx`)

```
 RUN  v2.1.9 E:/project/github/quiz_anything/.claude/worktrees/quiz-app-core

 ✓ src/components/quiz/QuizEngine.test.tsx (4 tests) 678ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

Full suite re-run for regression check: `npx vitest run`

```
 ✓ src/lib/quizLogic.test.ts (7 tests) 7ms
 ✓ src/lib/schema.test.ts (9 tests) 8ms
 ✓ src/lib/dataLoader.test.ts (6 tests) 10ms
 ✓ src/App.test.tsx (1 test) 31ms
 ✓ src/components/quiz/ProgressRail.test.tsx (3 tests) 45ms
 ✓ src/components/quiz/ScoreSummary.test.tsx (3 tests) 134ms
 ✓ src/components/quiz/QuestionCard.test.tsx (4 tests) 186ms
 ✓ src/components/quiz/QuizEngine.test.tsx (4 tests) 792ms

 Test Files  8 passed (8)
      Tests  37 passed (37)
```

Also ran `npx tsc -b --noEmit` — no type errors.

## Files changed

- `src/components/quiz/QuizEngine.tsx` (new)
- `src/components/quiz/QuizEngine.test.tsx` (new)

## Self-review findings

- **Completeness:** click answering, keyboard answering (digit), advance via button, advance
  via Enter, finish + score summary with correct hit count, and restart are all covered by
  the 4 tests, all passing. ArrowRight advance is implemented per the brief's code but not
  separately exercised by a test (matches brief exactly, which only requires the 4 given
  tests).
- **Quality:** The `useEffect` registering the `keydown` listener has no dependency array, so
  it re-runs (unregister + re-register) after every render. This means the `onKeyDown`
  closure always captures the current render's `locked`/`finished`/`currentIndex`/`answers`
  values — no stale-closure bug, confirmed by the keyboard-driven test passing (answer via
  `1`, then advance via `Enter`, landing on the correct next question).
- **Discipline:** No Task-5 component files were modified. Verified via `git status` — only
  the two new QuizEngine files were staged/committed.
- **Testing:** All 4 new tests pass; full suite is 37/37 green with no regressions; no
  `act()` warnings or other console noise in the output; `tsc -b --noEmit` clean. A stray
  `tsconfig.tsbuildinfo` produced by the typecheck run was deleted before finishing so the
  worktree stayed clean (not part of `.gitignore`, not committed).

## Issues or concerns

None. Implementation is verbatim per the brief, tests pass cleanly, no scope creep.
