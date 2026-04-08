# self-review r2: has-questioned-assumptions (deeper)

## fresh eyes: assumptions i took for granted

### 1. skill approach is the right solution

| question | fresh look |
|----------|------------|
| did wisher say "create a skill"? | yes — "create a new skill that's run" |
| what if we could fix the extant hook? | the extant hook is `pnpm run --if-present fix` — that's **fix**, not **lint** |
| is the problem that the hook runs fix instead of lint? | **partially** — fix runs, but lint *check* doesn't |

**investigation complete**: i checked `.claude/settings.json` and `package.json`. here's what i found:

**current onStop hooks**:
1. `rhx route.drive --mode hook` (bhrain driver)
2. `pnpm run --if-present fix` (ehmpathy mechanic) ← this is the "lint hook"
3. `rhx route.drive --mode hook` (bhrain driver)

**what `fix` does**:
- `fix` → `fix:format && fix:lint`
- `fix:lint` → `biome check --write` (auto-fix lint issues)

**what `test:lint` does**:
- `test:lint` → `biome check --diagnostic-level=error` + depcheck (verify lint passes)

**the gap**: the extant hook runs `fix` (auto-fix), but doesn't run `test:lint` (verify) afterward. so:
- lint issues get auto-fixed (if possible)
- but non-auto-fixable issues are not detected
- and no exit code 2 is emitted even if lint still fails

**wisher's intent (now clear)**:
1. after `fix` runs, run `test:lint` to verify
2. if `test:lint` fails, emit exit code 2
3. brain must address before session stops

**verdict**: skill approach is correct. we need a skill that:
- runs `test:lint` (or detects the right command)
- emits exit code 2 on failure
- outputs summary with log path

the extant `fix` hook can stay — it auto-fixes. the new skill verifies and blocks.

---

### 2. lint output is always too verbose

| question | fresh look |
|----------|------------|
| is 500 lines realistic? | depends on codebase state — could be 5 lines or 500 |
| what if only 1 error? | summary "1 defect" is helpful, but hiding the error adds friction |
| should we show inline output for small counts? | maybe: if defects < 5, show inline; else log |

**issue found**: vision assumes all lint output is too verbose. but small error counts (1-5) might benefit from inline display.

**alternative**: show first N errors inline (e.g., first 3), log the rest. best of both worlds.

**verdict**: flag for wisher — inline vs log threshold.

---

### 3. log files are needed

| question | fresh look |
|----------|------------|
| why not show output directly? | token cost |
| but if brain must fix lint, it needs to see errors eventually | yes — we're deferring, not avoiding |
| are we just delaying the token cost? | partially — human might fix before brain sees details |

**insight**: logs aren't primarily for token savings. they're for **human review** — human can open log, see what's wrong, decide if mechanic should fix or if human will fix manually.

**verdict**: holds — but clarify purpose: logs are for human review, not just token deferral.

---

### 4. `git.repo.test` is a good name

| question | fresh look |
|----------|------------|
| is this a git operation? | no — it tests the repo, not git |
| `git.` prefix implies what? | git operations (git.commit.set, git.release, git.repo.get) |
| `git.repo.get` is a read operation on git repos | yes — it reads other repos via git |
| `git.repo.test` tests the repo | but doesn't use git at all — uses npm |

**issue found**: `git.repo.test` is misleading. this skill runs `npm run test:lint`, which is unrelated to git.

**alternatives**:
- `repo.test` — tests the repo (no git prefix)
- `test.lint` — tests lint specifically
- `lint.check` — checks lint

**counter**: wish explicitly says `rhx git.repo.test --what lint`. wisher chose this name.

**verdict**: flag for wisher — is `git.repo.test` the right name, or should it be `repo.test` / `test.lint`?

---

### 5. stdout/stderr semantics are clear

| question | fresh look |
|----------|------------|
| vision says "stderr: empty (raw output goes to log file)" | correct |
| skill stdout = summary | correct |
| where does raw npm output go? | captured to log file |

**insight**: the vision is correct but could be clearer. "raw output" is ambiguous — clarify that it's npm's stdout+stderr.

**action**: clarify in vision that:
- skill stdout = turtle vibes summary
- skill stderr = empty (errors go to log)
- npm stdout + npm stderr = captured to `.log/`

**verdict**: holds — but clarify wording.

---

### 6. mechanic will know how to fix lint issues

| question | fresh look |
|----------|------------|
| summary says "7 defects" but not what they are | correct — mechanic must open log |
| this adds friction | yes — 2 steps instead of 1 |
| is it worth the token savings? | depends on typical error count |

**insight**: for small error counts, the friction outweighs the savings. for large error counts, log is essential.

**alternative considered**: show first N errors inline, rest in log. rejected for v1 — adds complexity. can iterate later.

**verdict**: holds for v1 — simple summary with log path. iterate if friction is high.

---

### 7. hint `run npm run fix:lint` is helpful

| question | fresh look |
|----------|------------|
| extant hook already runs `pnpm run --if-present fix` | yes — fix runs automatically |
| if fix ran and lint still fails, why suggest fix again? | **this is wrong** |

**issue found**: the hint assumes `npm run fix:lint` exists and will help. but:
1. not all lint errors are auto-fixable
2. if fix already ran in onStop hook, suggesting it again is useless
3. the hint should be context-aware

**fix**: remove the hint about fix, or make it smarter:
- if errors are auto-fixable: "run `npm run fix:lint` to auto-fix"
- if errors require manual fix: "review log for details"

**verdict**: fix the hint — it's misleading in current form.

---

## summary of r2 findings

| assumption | verdict | action |
|------------|---------|--------|
| skill approach is right | ✓ **verified** | extant hook runs fix, new skill runs verify |
| lint output always verbose | ⚠️ partially | consider inline for small counts |
| log files needed | ✓ holds | clarify purpose: human review |
| `git.repo.test` name | ⚠️ misleading | flag for wisher |
| stdout/stderr semantics | ✓ holds | clarified in vision |
| mechanic knows how to fix | ✓ holds for v1 | iterate later |
| hint about fix | ✓ **fixed** | changed to "review log for defect details" |

## updates to vision needed

1. **clarify stdout/stderr flow** — npm output vs skill output
2. **fix the hint** — don't suggest fix if it won't help
3. **flag name question** — is `git.repo.test` the right name?
4. **consider inline threshold** — show first N errors inline?

---

## fixes applied to vision

### fix 1: hint was misleading

**before**: `hint: run 'npm run fix:lint' or review log for details`

**after**: `hint: review log for defect details`

**why**: the hint suggested auto-fix, but:
- not all lint errors are auto-fixable
- if fix already ran in onStop hook, suggesting it again is useless
- simpler hint is more honest

### fix 2: stdout/stderr semantics clarified

**before**: `stdout: turtle vibes summary`, `stderr: empty (raw output goes to log file)`

**after**: `skill stdout: turtle vibes summary`, `skill stderr: empty`, `logs: ... (captures npm stdout + npm stderr — the raw lint output)`

**why**: "raw output" was ambiguous. clarified that:
- skill stdout = summary
- npm stdout + npm stderr = captured to log

### fix 3: added open questions for wisher

added to "questions for wisher":
- name question: is `git.repo.test` the right name?
- inline threshold: should small error counts show inline?

**why**: these are design decisions that should be wisher's call, not mine.

---

## what holds and why

### skill approach holds

even though i questioned whether the extant hook is the problem, the wisher explicitly said "create a new skill". the skill approach enables:
- reusability (manual runs, not just hooks)
- testability (can write integration tests)
- vibes consistency (matches other skills)

### log files hold

logs serve **human review**, not just token deferral. human can:
- open log to see full context
- decide if mechanic should fix or human will fix manually
- review errors across multiple runs

### summary-only stdout holds for v1

even though small error counts might benefit from inline display, starting simple is the right call. iterate later if friction is high.
