# self-review: has-behavior-declaration-adherance

review for blueprint adherance to vision and criteria.

---

## adherance check: vision vs blueprint

### vision.outcome: "one command. auto-permission. auto-keyrack."

**blueprint adherance**:

1. **one command**: `rhx git.repo.test --what unit` — single skill invocation
2. **auto-permission**: pre-approved in init.claude.permissions.jsonc (implied by extant skill)
3. **auto-keyrack**: codepath section "keyrack unlock (integration/acceptance only)"

**does blueprint match?**: yes. the skill is invoked once, permissions are pre-approved, keyrack unlocks automatically.

**why this adherance matters**:

a deviation would look like:
- separate commands for keyrack and test (`rhx keyrack unlock && rhx git.repo.test`)
- manual permission approval per invocation
- clone must remember to unlock before integration tests

the blueprint avoids all of these by encapsulating keyrack unlock within the skill codepath. the clone types one command, the skill handles complexity.

**no deviation found.**

---

### vision.outcome: "summary only — no live stream, no context waste"

**blueprint adherance**:

codepath shows:
- parse jest output for stats (suites, tests, time)
- output format shows summary structure (status, stats, log paths)
- no mention of "stream" or "live" output

**does blueprint match?**: yes. blueprint specifies stats extraction and summary output, not raw jest stream.

**why this adherance matters**:

a deviation would look like:
- raw jest output piped to terminal (500+ lines for large test suites)
- stats counted manually by clone from raw output
- context window filled with test names instead of summary

the blueprint specifies parsing jest output to extract counts (suites, tests passed/failed/skipped, time). this is the core insight of the vision: raw output wastes context tokens.

**no deviation found.**

---

### vision.output: "keyrack: unlocked ehmpath/test" line

**vision shows**:
```
🐚 git.repo.test --what integration
   ├─ keyrack: unlocked ehmpath/test
   ├─ status: passed
```

**blueprint shows**:
```
├─ [+] keyrack line (if integration/acceptance)
```

**does blueprint match?**: yes. blueprint adds keyrack line to output for integration/acceptance.

**no deviation found.**

---

### vision.output: stats section structure

**vision shows**:
```
   ├─ stats
   │  ├─ suites: 3 files
   │  ├─ tests: 12 passed, 0 failed, 2 skipped
   │  └─ time: 12.4s
```

**blueprint shows**:
```
├─ [+] stats section (unit/integration/acceptance only, if parse succeeded)
│  ├─ suites: N files
│  ├─ tests: X passed, Y failed, Z skipped
│  └─ time: X.Xs
```

**does blueprint match?**: yes. exact same structure with variable placeholders.

**no deviation found.**

---

### vision.output: log section structure

**vision shows**:
```
   └─ log
      ├─ stdout: .log/role=mechanic/skill=git.repo.test/2026-04-08T14-23-01Z.stdout.log
      └─ stderr: .log/role=mechanic/skill=git.repo.test/2026-04-08T14-23-01Z.stderr.log
```

**blueprint shows**:
```
├─ [○] log section
│  ├─ stdout path
│  └─ stderr path
```

**does blueprint match?**: yes. same structure. blueprint uses extant log path pattern.

**no deviation found.**

---

### vision.flags: --what, --scope, --resnap

**vision shows**:
```
--what      lint | unit | integration | acceptance    (required)
--scope     file path pattern (passed to jest --testPathPattern)  (optional)
--resnap    update snapshots (sets RESNAP=true)       (optional)
```

**blueprint shows**:
```
├─ [~] parse arguments
│  ├─ [○] --what (required)
│  ├─ [+] --scope <pattern> (optional)
│  ├─ [+] --resnap (optional, flag)
│  └─ [+] -- <passthrough> (optional, captured to REST_ARGS)
```

**does blueprint match?**: yes. all three flags present with correct semantics. blueprint adds `--` passthrough which vision mentions in notes.

**no deviation found.**

---

## adherance check: criteria vs blueprint

### criteria.usecase.1: --scope passes --testPathPattern

**criteria says**:
```
when(--what unit --scope pattern)
  then(passes --testPathPattern to jest)
```

**blueprint says**:
```
│  │  ├─ [+] add --testPathPattern if --scope
```

**does blueprint match?**: yes. exact translation specified.

**no deviation found.**

---

### criteria.usecase.1: --resnap sets RESNAP=true

**criteria says**:
```
when(--what unit --resnap)
  then(sets RESNAP=true env var)
```

**blueprint says**:
```
├─ [+] set RESNAP=true if --resnap
```

**does blueprint match?**: yes. env var set as specified.

**no deviation found.**

---

### criteria.usecase.2: keyrack unlocks first

**criteria says**:
```
when(--what integration)
  then(unlocks keyrack ehmpath/test first)
```

**blueprint says**:
```
├─ [+] keyrack unlock (integration/acceptance only)
│  ├─ skip for lint and unit
│  ├─ run: rhx keyrack unlock --owner ehmpath --env test
```

**does blueprint match?**: yes. unlock happens before test command, exact command specified.

**no deviation found.**

---

### criteria.usecase.4: lint ignores --scope and --resnap

**criteria says**:
```
when(--what lint --resnap)
  then(ignores --resnap flag)

when(--what lint --scope pattern)
  then(ignores --scope flag)
```

**blueprint says**:

codepath tree shows lint path uses extant behavior with `[○]` markers. the scope and resnap flags are only added for unit/integration/acceptance.

**does blueprint match?**: implicitly yes. the lint codepath is unchanged (`[○]` = retain), so new flags don't affect it.

**potential gap**: blueprint doesn't explicitly state "lint ignores --scope and --resnap". however, the codepath structure shows scope/resnap logic only applies to jest runs (unit/integration/acceptance), not lint.

**verdict**: acceptable. the structure implies the behavior, but could be more explicit.

---

### criteria.usecase.6: no tests matched exits with hint

**criteria says**:
```
when(--what unit --scope nonExistentPattern)
  then(detects no tests match)
  then(exit 2 with constraint error)
  then(shows helpful hint about scope pattern)
```

**blueprint says**:
```
├─ [+] detect no-tests-matched
│  ├─ check for "No tests found" or zero suites
│  └─ exit 2 with scope hint
```

**does blueprint match?**: yes. detection, exit code, and hint all specified.

**no deviation found.**

---

### criteria.usecase.7: absent command exits with hint

**criteria says**:
```
given(repo without test:unit command)
  when(--what unit)
    then(exit 2 with constraint error)
    then(shows error: no test:unit command)
    then(shows hint about ehmpathy convention)
```

**blueprint says**:
```
├─ [+] validate npm command exists
│  ├─ check package.json for test:${WHAT} command
│  └─ exit 2 if absent with helpful hint
```

**does blueprint match?**: yes. validation, exit code, and hint all specified.

**no deviation found.**

---

### criteria.usecase.10: keyrack failure exits 1

**criteria says**:
```
given(keyrack unlock fails)
  when(--what integration)
    then(exit 1 with malfunction error)
```

**blueprint says**:
```
│  └─ exit 1 on failure with hint
```

**does blueprint match?**: yes. exit 1 for keyrack failure (malfunction, not constraint).

**why this adherance matters**:

a deviation would look like:
- exit 2 for keyrack failure (wrong: constraint means user must fix; keyrack failure is infrastructure)
- exit 0 with warning (wrong: hides failure, tests don't run)
- no exit code distinction (wrong: caller can't distinguish "tests failed" from "keyrack broke")

the blueprint correctly uses exit 1 (malfunction) because keyrack failure is infrastructure, not user error. exit 2 is reserved for "tests failed" or "no tests matched" where the clone must fix code.

**no deviation found.**

---

## adherance issues found

| item | severity | status |
|------|----------|--------|
| lint ignores flags not explicit | low | acceptable (structure implies behavior) |

---

## conclusion

**blueprint adheres to vision and criteria.**

### why adherance holds for each item

| vision/criteria item | adherance | why it matters |
|---------------------|-----------|----------------|
| one command | single skill invocation | clone doesn't fumble with multiple commands |
| auto-keyrack | unlock before integration/acceptance | clone doesn't forget credentials |
| summary only | stats extraction, no raw stream | context tokens preserved |
| stats structure | exact match to vision | clone can parse output programmatically |
| log structure | exact match to vision | clone knows where to find details |
| flags semantics | all three flags with correct behavior | clone uses domain terms, not jest terms |
| scope translation | --scope to --testPathPattern | abstraction hides jest quirk |
| resnap env var | RESNAP=true set | abstraction hides ehmpathy convention |
| no tests matched | exit 2 with hint | fail-fast prevents wasted debug time |
| absent command | exit 2 with hint | fail-fast guides convention adoption |
| keyrack failure | exit 1 (malfunction) | distinguishes infrastructure from user error |

### what a junior might have done wrong

| potential deviation | impact | blueprint avoids it |
|--------------------|--------|---------------------|
| separate keyrack command | clone forgets to unlock | skill encapsulates unlock |
| raw jest output | context waste | stats extraction |
| exit 0 on keyrack failure | silent failure | exit 1 with hint |
| exit 1 on test failure | wrong semantics | exit 2 (constraint) |
| no scope translation | clone must know jest flags | --scope abstracts |
| no resnap translation | clone must know RESNAP | --resnap abstracts |

### the one implicit item

lint ignores --scope and --resnap is not explicitly stated in blueprint, but the codepath structure shows these flags only apply to unit/integration/acceptance paths. this is acceptable because:
1. lint path is marked `[○]` (retain extant behavior)
2. scope/resnap logic is in the jest-specific codepath
3. journey test 9 verifies lint ignores flags

the blueprint implicitly satisfies this criteria by not changing the lint path. a deviation would have required adding scope/resnap handling to the lint codepath, which is absent.

**no deviations found.**

