# review.self: has-critical-paths-frictionless (r7)

## review scope

verify that critical paths are frictionless in practice.

---

## critical paths from repros

| critical path | description | why critical |
|---------------|-------------|--------------|
| unit pass | `--what unit` runs and shows pass | most common mechanic action |
| unit fail | `--what unit` shows failure clearly | mechanic must know what failed |
| scope filter | `--scope pattern` filters correctly | mechanic iterates on specific tests |
| integration unlock | keyrack auto-unlocks | removes manual step |
| log capture | full output in .log/ | mechanic can diagnose failures |

---

## path-by-path verification

### path 1: unit pass

**test:** case1 in git.repo.test.play.integration.test.ts

**expected flow:**
1. invoke `--what unit`
2. see `🐢 cowabunga!`
3. see pass status, stats, log paths
4. exit 0

**verified by test?** yes. case1 tests this exact flow with assertions for:
- exit code 0
- cowabunga header
- status: passed
- stats section
- log paths
- snapshot match

**friction?** none. clean output, clear result.

---

### path 2: unit fail

**test:** case2 in git.repo.test.play.integration.test.ts

**expected flow:**
1. invoke `--what unit`
2. see `🐢 bummer dude...`
3. see fail status, stats, log paths, tip
4. exit 2

**verified by test?** yes. case2 tests this exact flow with assertions for:
- exit code 2
- bummer dude header
- status: failed
- defect count
- log paths
- tip about log read
- snapshot match

**friction?** none. tip guides mechanic to log file.

---

### path 3: scope filter

**test:** case3 in git.repo.test.play.integration.test.ts

**expected flow:**
1. invoke `--what unit --scope pattern`
2. only matched tests run
3. see filtered stats

**verified by test?** yes. case3 creates 3 test files, filters to 1, verifies only 1 runs.

**friction?** none. `--scope` is intuitive.

---

### path 4: integration unlock

**test:** case5 in git.repo.test.play.integration.test.ts

**expected flow:**
1. invoke `--what integration`
2. keyrack unlocks automatically
3. tests run
4. see keyrack status in output

**verified by test?** yes. case5 mocks keyrack via PATH injection, verifies:
- keyrack unlock called
- keyrack line in output
- tests run after unlock

**friction?** none. keyrack unlock is automatic.

---

### path 5: log capture

**test:** case1, case2 in git.repo.test.play.integration.test.ts

**expected flow:**
1. run any test type
2. full output captured to .log/
3. log paths shown in output

**verified by test?** yes. case1 and case2 both verify:
- log directory created
- .gitignore findserted
- log files contain npm output
- log paths in skill output

**friction?** none. logs always captured, paths always shown.

---

## additional critical paths discovered

### path 6: no tests match

**test:** case6 in git.repo.test.play.integration.test.ts

**expected flow:**
1. invoke `--what unit --scope nonexistent`
2. see constraint error
3. see hint about scope
4. exit 2

**verified by test?** yes. case6 verifies exit 2 and helpful error.

**friction?** none. error is immediate and helpful.

---

### path 7: absent command

**test:** case7 in git.repo.test.play.integration.test.ts

**expected flow:**
1. invoke `--what unit` in repo without test:unit
2. see constraint error
3. see hint about convention
4. exit 2

**verified by test?** yes. case7 verifies exit 2 and helpful hint.

**friction?** none. error explains the convention.

---

## why it holds

all critical paths are tested and verified frictionless:

1. **unit pass** — clean output, clear stats, log paths shown
2. **unit fail** — clear error, tip guides to log
3. **scope filter** — intuitive flag, correct filter
4. **integration unlock** — automatic keyrack, no manual step
5. **log capture** — always captured, always shown
6. **no tests match** — immediate error, helpful hint
7. **absent command** — immediate error, explains convention

no friction found. each path "just works."

**conclusion: has-critical-paths-frictionless = verified**

