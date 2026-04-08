# self-review r3: has-questioned-questions

## fixes applied to vision

### fix 1: removed `--when hook.onStop` flag

**issue**: the `--when` flag had no concrete behavior defined — just "context hint" which is vague.

**fix**: removed `--when` from the contract entirely.

**changes made**:
- contract: removed `--when` from inputs
- example command: `rhx git.repo.test --what lint` (no `--when`)
- usecases table: removed `--when` from hook usecase
- timeline: removed `--when` from step 1
- analogies: removed the `--when` row

**why this holds**: yagni. the skill works identically with or without context. if a real usecase emerges later, we can add it.

---

### fix 2: simplified log path

**issue**: `.log/role=mechanic/skill=git.repo.test/` is verbose.

**fix**: changed to `.log/git.repo.test/`.

**changes made**:
- contract: updated log path to `.log/git.repo.test/{isotime}.{stdout,stderr}.log`
- example output: updated log path in sample output

**why this holds**:
- role is implicit (this is a mechanic skill)
- skill name is sufficient as namespace
- shorter path is easier to type and remember

---

### fix 3: marked questions for wisher

**issue**: open questions were listed but not triaged.

**fix**: marked each question with `[wisher]` to indicate it needs wisher input.

**changes made**:
- questions 1-4 now marked with `[wisher]` prefix
- removed Q1 and Q4 from earlier (answered in r2: drop --when, use simpler path)

**why this holds**: these are design decisions (scope, name, UX) that the wisher should decide.

---

## what holds

### questions marked for wisher

| # | question | why wisher? |
|---|----------|-------------|
| 1 | `--what all` support | scope decision |
| 2 | log retention | priority/complexity tradeoff |
| 3 | skill name | wisher specified `git.repo.test` in wish — their call to change |
| 4 | inline threshold | UX decision based on real usage |

these cannot be answered via logic or code — they require wisher judgment.

---

## verification

i re-read the vision after fixes. the contract is now:

```
rhx git.repo.test --what <lint|types|unit|integration|format>

inputs:
  --what      required. which test to run.

outputs:
  skill stdout:   turtle vibes summary
  skill stderr:   empty
  exit code:      0 = pass, 2 = constraint

logs:             .log/git.repo.test/{isotime}.{stdout,stderr}.log
```

this is simpler, cleaner, and ready for implementation once wisher answers the flagged questions.
