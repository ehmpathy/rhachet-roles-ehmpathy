# self-review: has-questioned-requirements

## requirements questioned

### 1. new skill `git.repo.test` (from wish)

| question | answer |
|----------|--------|
| who said this? | wisher, in `0.wish.md` |
| evidence? | current hook outputs too much, doesn't enforce via exit code |
| what if we didn't? | status quo — lint is informational only, brain ignores failures |
| scope? | right-sized — single skill with clear purpose |
| simpler way? | could patch extant hook, but skill is reusable and testable |

**verdict**: holds. core requirement, well-justified.

---

### 2. log to `.log/role=mechanic/skill=git.repo.test/` (from wish)

| question | answer |
|----------|--------|
| who said this? | wisher specified path pattern |
| evidence? | keeps output accessible without a terminal flood |
| what if we didn't? | could discard output, but debug becomes hard |
| scope? | reasonable — logs are useful for diagnosis |
| simpler way? | `/tmp/` is ephemeral, `.log/` persists across sessions |

**issue found**: path is verbose. could be `.log/git.repo.test/` instead of `.log/role=mechanic/skill=git.repo.test/`.

**verdict**: holds, but path is an open question already flagged for wisher.

---

### 3. turtle vibes summary (from wish)

| question | answer |
|----------|--------|
| who said this? | wisher |
| evidence? | "stdout the same vibes as the other mechanic skills" |
| what if we didn't? | inconsistent UX with other skills |
| scope? | right-sized |
| simpler way? | no — vibes are the way 🐢 |

**verdict**: holds. consistency matters.

---

### 4. exit code 2 on failure (from wish)

| question | answer |
|----------|--------|
| who said this? | wisher, explicitly |
| evidence? | "emit an exitCode=2 that forces the brain to address" |
| what if we didn't? | current behavior — lint fails silently |
| scope? | right-sized — this is the core problem solved |
| simpler way? | no — exit code semantics are the enforcement mechanism |

**verdict**: holds. this is the primary value proposition.

---

### 5. `--what` flag for extensibility (my addition)

| question | answer |
|----------|--------|
| who said this? | i inferred from wish example `--what lint` |
| evidence? | wish shows "e.g." which suggests pattern, not one-off |
| what if we didn't? | could make `git.repo.lint` as separate skill |
| scope? | possibly over-engineered for v1 |
| simpler way? | yes — `git.repo.lint` is simpler, rename later if needed |

**issue found**: i expanded scope beyond what was asked. the wish only needs lint enforcement now.

**counter**: `--what` costs almost zero and avoids future rename from `git.repo.lint` → `git.repo.test --what lint`. pattern is forward-compatible.

**verdict**: keep `--what` but acknowledge it's anticipatory. flag for wisher to confirm.

---

### 6. `--when hook.onStop` flag (from wish, optional)

| question | answer |
|----------|--------|
| who said this? | wish includes `[--when hook.onStop]` in brackets |
| evidence? | brackets suggest optional |
| what if we didn't? | skill works the same either way |
| scope? | unclear purpose — what does `--when` actually change? |
| simpler way? | detect hook context from environment variables |

**issue found**: `--when` has no defined behavior beyond "context hint". this is vague.

**options**:
1. drop `--when` entirely — yagni
2. define concrete behavior (e.g., different log path, different output verbosity)
3. keep as context annotation for future use

**verdict**: flag for wisher. likely yagni — drop until concrete usecase emerges.

---

## summary

| requirement | verdict |
|-------------|---------|
| new skill `git.repo.test` | ✓ holds |
| log to `.log/` directory | ✓ holds (path is open question) |
| turtle vibes summary | ✓ holds |
| exit code 2 on failure | ✓ holds |
| `--what` flag | ⚠️ anticipatory, confirm with wisher |
| `--when` flag | ⚠️ vague, likely drop |

## action

vision is sound. two flags (`--what`, `--when`) need wisher confirmation:
1. is `--what` extensibility wanted, or just `git.repo.lint`?
2. is `--when` needed, or yagni?
