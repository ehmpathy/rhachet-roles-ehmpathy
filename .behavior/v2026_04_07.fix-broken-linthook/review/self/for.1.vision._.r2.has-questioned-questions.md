# self-review: has-questioned-questions

## triage of open questions

### questions for wisher

| # | question | triage | rationale |
|---|----------|--------|-----------|
| 1 | should `--when hook.onStop` affect behavior? | **[answered]** drop | no concrete behavior defined = yagni. simpler to drop and add later if needed. |
| 2 | support `--what all` for multiple checks? | **[wisher]** | scope decision — wisher should decide if v1 needs this |
| 3 | log retention configurable? | **[wisher]** | nice-to-have, wisher decides priority |
| 4 | log path: `.log/role=mechanic/skill=git.repo.test/` or `.log/git.repo.test/`? | **[answered]** use simpler | `.log/git.repo.test/` is cleaner, less verbose |
| 5 | name: `git.repo.test` or alternatives? | **[wisher]** | wisher used `git.repo.test` in wish, but it's unclear — wisher decides |
| 6 | inline threshold for small error counts? | **[wisher]** | UX decision — wisher should validate user need |

### assumptions triaged

| assumption | triage | rationale |
|------------|--------|-----------|
| `.log/` is gitignored | **[answered]** must ensure | will verify in .gitignore at implementation |
| `npm run test:lint` is canonical | **[answered]** yes | verified in package.json — this is the pattern |
| exit code 2 = constraint | **[answered]** yes | documented in rule.require.exit-code-semantics.md |
| isotime format with hyphens | **[answered]** yes | `2026-04-07T14-32-01Z` is filesystem-safe |

---

## answers applied

### Q1: drop `--when hook.onStop`

**decision**: drop the `--when` flag entirely for v1.

**why**:
- no concrete behavior is defined for it
- "context hint" is vague
- skill works the same with or without it
- can add later if a real usecase emerges

**action**: remove `--when` from vision contract.

### Q4: simplify log path

**decision**: use `.log/git.repo.test/` instead of `.log/role=mechanic/skill=git.repo.test/`.

**why**:
- shorter, cleaner
- role is implicit (mechanic skill)
- matches the pattern: skill name = log subdirectory

**action**: update vision contract with simplified path.

---

## questions that need wisher

questions for wisher (flagged with **[wisher]**):
- Q2: support `--what all`?
- Q3: log retention?
- Q5: name (`git.repo.test` vs alternatives)?
- Q6: inline threshold?

these are design decisions that shape UX and scope. wisher should decide before implementation.

---

## fixes to apply to vision

1. remove `--when hook.onStop` from contract
2. change log path to `.log/git.repo.test/`
3. mark questions clearly as `[wisher]` in vision
