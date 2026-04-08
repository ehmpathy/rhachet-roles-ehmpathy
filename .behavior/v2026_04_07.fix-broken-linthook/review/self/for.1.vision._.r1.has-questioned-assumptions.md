# self-review: has-questioned-assumptions

## hidden assumptions surfaced

### 1. `.log/` is gitignored

| question | answer |
|----------|--------|
| evidence? | none — i assumed this without verification |
| opposite true? | if not gitignored, logs would pollute git history |
| wisher said? | no — i inferred from common practice |
| exceptions? | some repos might want logs committed for audit |

**issue found**: must verify `.log/` is in `.gitignore`, or add it.

**action**: add to implementation checklist — ensure `.log/` is gitignored.

---

### 2. `npm run test:lint` is the canonical lint command

| question | answer |
|----------|--------|
| evidence? | most ehmpathy repos use this pattern |
| opposite true? | some repos might use `pnpm`, `yarn`, or custom scripts |
| wisher said? | no — i inferred from convention |
| exceptions? | monorepos, workspaces, non-standard configs |

**issue found**: skill should detect package manager or accept override.

**action**: skill should try `npm run test:lint` by default, but check for pnpm/yarn lockfiles. or accept `--cmd` override.

---

### 3. exit code 2 = constraint error, brain must address

| question | answer |
|----------|--------|
| evidence? | documented in `rule.require.exit-code-semantics.md` |
| opposite true? | if brain ignores exit 2, enforcement fails |
| wisher said? | yes — explicitly requested exit code 2 |
| exceptions? | none — this is the documented semantic |

**verdict**: holds. exit code 2 is correct per our briefs.

---

### 4. isotime format with colons replaced for filesystem

| question | answer |
|----------|--------|
| evidence? | colons are invalid in windows paths, some unix systems |
| opposite true? | could use different separator |
| wisher said? | no — i chose this format |
| exceptions? | none — `2026-04-07T14-32-01Z` is safe everywhere |

**verdict**: holds. filesystem-safe isotime is reasonable.

---

### 5. brain understands exit code 2 from onStop hook

| question | answer |
|----------|--------|
| evidence? | **verified** — this conversation started with stop hook feedback that displayed "blocked by constraints" from `route.drive --mode hook`. brain (me) received the feedback and was forced to address it. |
| opposite true? | if hook exit codes were ignored, i wouldn't have received that feedback |
| wisher said? | yes — this is the core problem ("doesn't emit exitCode=2") |
| exceptions? | none found — exit code 2 from onStop hooks does work |

**verdict**: holds. **verified empirically** — the route.drive onStop hook in this session proves exit code 2 forces brain to address.

---

### 6. summary output is sufficient for mechanic to act

| question | answer |
|----------|--------|
| evidence? | summary shows defect count + log path + hint |
| opposite true? | mechanic might need details inline to decide what to do |
| wisher said? | yes — explicitly wanted summary only to save tokens |
| exceptions? | complex lint errors might require context |

**verdict**: holds. mechanic can open log if details needed. summary + hint is enough for common case.

---

### 7. defect count can be parsed from lint output

| question | answer |
|----------|--------|
| evidence? | eslint outputs "X problems" in summary line |
| opposite true? | different linters have different output formats |
| wisher said? | no — i assumed we can extract this |
| exceptions? | custom linters, non-standard output |

**issue found**: defect count extraction depends on linter output format.

**action**: skill should try to parse defect count, but gracefully show "failed" if unparseable. don't fail the skill if count can't be extracted.

---

### 8. log files don't need automatic cleanup

| question | answer |
|----------|--------|
| evidence? | none — i assumed accumulation is ok |
| opposite true? | logs could grow unbounded |
| wisher said? | no — i flagged this as open question |
| exceptions? | long-lived repos would accumulate many logs |

**verdict**: flagged as open question. not critical for v1 — gitignore prevents git pollution. wisher can decide on retention policy later.

---

## summary

| assumption | verdict |
|------------|---------|
| `.log/` is gitignored | ⚠️ must verify/add |
| `npm run test:lint` is canonical | ⚠️ should detect package manager |
| exit code 2 semantics | ✓ holds (documented) |
| isotime format | ✓ holds |
| brain respects hook exit codes | ✓ **verified empirically** |
| summary is sufficient | ✓ holds |
| defect count parseable | ⚠️ graceful fallback needed |
| log cleanup not needed | ✓ flagged as open question |

## critical action items

1. **ensure `.log/` is gitignored** — implementation detail
2. **detect package manager** — or accept `--cmd` override
3. **graceful defect count fallback** — don't fail if unparseable
