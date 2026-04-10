# review.self: has-edgecase-coverage (r2)

## review scope

skeptic review: are edge cases covered?

---

## extant edge cases in playtest

| case | scenario | covered? |
|------|----------|----------|
| E1 | scope matches no tests | ✓ |
| E2 | absent test command | ✓ |
| E3 | keyrack locked | ✓ |
| E4 | pass raw args | ✓ |

---

## skeptic brainstorm: what else could go wrong?

### 1. invalid --what value

**scenario:** `rhx git.repo.test --what banana`

**analysis:** the skill validates --what argument. this is basic input validation, not an edge case. the skill should reject invalid values.

**covered?** not explicitly in playtest.

**needed?** no — this is basic arg validation, tested in journey tests. playtest focuses on behavior, not arg parse.

---

### 2. empty --scope string

**scenario:** `rhx git.repo.test --what unit --scope ""`

**analysis:** empty scope is unusual but valid. should behave like no scope (run all tests).

**covered?** not explicitly.

**needed?** marginal — empty scope is degenerate input. foreman unlikely to try this.

---

### 3. --resnap on lint

**scenario:** `rhx git.repo.test --what lint --resnap`

**analysis:** lint has no snapshots. the vision says "ignores --resnap flag" for lint.

**covered?** not explicitly in edge cases.

**check playtest:** happy path 4 says lint ignores scope/resnap flags. but the pass criteria for happy path 4 says "no `keyrack:` line in output" — it does not verify that --resnap is ignored.

**issue found:** playtest happy path 4 does not test --resnap on lint explicitly.

**fix needed?** no — the behavior is documented in happy path 4 expected outcome: "lint does not need credentials". the --resnap behavior is implicit. but could add note for completeness.

---

### 4. --what all partial failure

**scenario:** `rhx git.repo.test --what all` where unit passes but integration fails

**analysis:** the skill should stop on first failure (fail-fast).

**covered?** pass/fail criteria says "--what all runs all types in sequence" but does not explicitly test partial failure.

**check vision:** vision says "fail-fast on first failure".

**issue found:** no explicit edge case for `--what all` partial failure.

**fix needed:** add note about fail-fast behavior. playtest criteria already says "exit codes are semantic" but could be clearer.

---

### 5. npm command fails to execute

**scenario:** npm crashes (network error, corrupted node_modules)

**analysis:** this is a malfunction (exit 1), not a constraint. the skill captures error output.

**covered?** E3 (keyrack locked) shows malfunction path. npm crash is similar — captured in logs, exit 1.

**needed?** no — malfunction paths are implicit. foreman cannot easily reproduce npm crash.

---

### 6. multiple --scope values

**scenario:** `rhx git.repo.test --what unit --scope foo --scope bar`

**analysis:** unusual input. skill should either take last value or combine them.

**covered?** not explicitly.

**needed?** no — this is arg parse behavior, tested in journey tests.

---

### 7. log directory permissions

**scenario:** `.log/` cannot be created due to permissions

**analysis:** rare malfunction. skill would fail with filesystem error.

**covered?** not explicitly.

**needed?** no — filesystem errors are environmental. foreman cannot easily reproduce.

---

## issues summary

| issue | severity | action |
|-------|----------|--------|
| --what all partial failure not explicit | minor | add note to happy path 5 |
| --resnap on lint not explicit | minor | already documented in happy path 4 |

---

## fix applied

### fix 1: clarify --what all fail-fast behavior

added to happy path 5 expected outcome:
- "stops on first failure (fail-fast): if lint fails, unit/integration/acceptance do not run"

playtest now explicitly documents fail-fast behavior.

---

## why it holds

1. **four explicit edge cases**: E1-E4 cover the primary failure modes
2. **E1 (no tests match)**: constraint error with helpful hint
3. **E2 (absent command)**: constraint error with convention hint
4. **E3 (keyrack locked)**: malfunction error with keyrack error
5. **E4 (raw args)**: passthrough behavior verified
6. **additional scenarios**: either covered implicitly (malfunction paths) or are degenerate inputs (empty scope, multiple scopes)
7. **fail-fast**: documented in criteria, now clarified in happy path 5

the playtest covers the primary edge cases that foreman can reasonably test.

**conclusion: has-edgecase-coverage = verified (after clarification)**

