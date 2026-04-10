# review.self: behavior-declaration-adherance (r5)

## review scope

checked implementation against vision, criteria.blackbox, and blueprint. verified line by line that the implementation matches the declared behavior.

---

## vision adherance

### contract verification

**vision declares:**
```
rhx git.repo.test --what <type> [--scope <pattern>] [--resnap] [--thorough]

--what      lint | unit | integration | acceptance | all    (required)
--scope     file path pattern (passed to jest --testPathPattern)  (optional)
--resnap    update snapshots (sets RESNAP=true)       (optional)
--thorough  run full suite (sets THOROUGH=true)       (optional)
```

**implementation (lines 44-101):**
- `--what` parsed at line 57-59: `WHAT="$2"` ✓
- `--scope` parsed at lines 65-67: `SCOPE="$2"` ✓
- `--resnap` parsed at lines 69-71: `RESNAP=true` ✓
- `--thorough` parsed at lines 73-75: `THOROUGH=true` ✓
- validation at lines 118-132: accepts lint, unit, integration, acceptance, all ✓
- passthrough args via `--` at lines 77-80: `REST_ARGS=("$@")` ✓

**status**: matches vision contract

### output format verification

**vision declares turtle vibes with:**
- turtle header (cowabunga!/bummer dude...)
- shell line with skill and args
- status: passed | failed
- stats nested (suites, tests, time)
- log nested (stdout, stderr paths)
- tip on failure

**implementation:**
- `output_success` (lines 375-406): header + shell + keyrack + status + stats + log ✓
- `output_failure` (lines 411-459): header + shell + keyrack + status + stats + log + tip ✓
- stats section (lines 392-396): suites files, tests passed/failed/skipped, time ✓
- tip line (lines 453-457): "Read the log for full test output" ✓

**status**: matches vision output format

### keyrack auto-unlock verification

**vision declares:**
- integration/acceptance auto-unlock keyrack ehmpath/test
- keyrack line shown in output

**implementation:**
- `unlock_keyrack` function (lines 193-216): calls `rhx keyrack unlock --owner ehmpath --env test` ✓
- skip for lint/unit (lines 196-198): `if [[ "$test_type" == "lint" ]] || [[ "$test_type" == "unit" ]]` ✓
- keyrack status shown (lines 384-386, 421-423): `print_tree_branch "keyrack" "$KEYRACK_STATUS"` ✓

**status**: matches vision keyrack behavior

### context efficiency verification

**vision declares:**
- summary only to terminal
- no raw jest output in terminal
- full output only in log files

**implementation:**
- output captured to temp files (lines 242-244): `TEMP_STDOUT`, `TEMP_STDERR` ✓
- jest runs with redirection (line 367): `> "$temp_stdout" 2> "$temp_stderr"` ✓
- logs persisted (lines 650-653, 657-659): `cp "$TEMP_STDOUT" "$STDOUT_LOG"` ✓
- only summary emitted to stderr ✓

**status**: matches vision context efficiency

---

## criteria.blackbox adherance

### usecase.1: run unit tests

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| runs npm run test:unit | `npm_cmd="npm run test:${test_type}"` | 336 | ✓ |
| captures stdout to log | `cp "$TEMP_STDOUT" "$STDOUT_LOG"` | 651 | ✓ |
| captures stderr to log | `cp "$TEMP_STDERR" "$STDERR_LOG"` | 652 | ✓ |
| shows summary with stats | `output_success` with stats section | 392-396 | ✓ |
| exit 0 on pass | `exit 0` after output_success | 655 | ✓ |
| exit 2 on fail | `exit 2` after output_failure | 667 | ✓ |

### usecase.2: run integration tests

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| unlocks keyrack first | `unlock_keyrack "$WHAT"` | 219 | ✓ |
| runs npm run test:integration | `npm_cmd="npm run test:${test_type}"` | 336 | ✓ |
| shows keyrack in output | `print_tree_branch "keyrack" "$KEYRACK_STATUS"` | 385 | ✓ |

### usecase.3: run acceptance tests

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| unlocks keyrack first | same as integration, test_type="acceptance" | 219 | ✓ |
| runs npm run test:acceptance | `npm_cmd="npm run test:${test_type}"` | 336 | ✓ |

### usecase.4: run lint

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| runs npm run test:lint | `npm_cmd="npm run test:${test_type}"` | 336 | ✓ |
| does NOT unlock keyrack | skip in unlock_keyrack for lint | 196-198 | ✓ |
| ignores --resnap | `if [[ "$test_type" != "lint" ]]` before RESNAP | 358 | ✓ |
| ignores --scope | `if [[ "$test_type" != "lint" ]]` before scope | 342 | ✓ |

### usecase.5: pass raw args to jest

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| passes args after -- to npm | `jest_args+=("${REST_ARGS[@]}")` | 349 | ✓ |
| full command built with args | `$npm_cmd -- ${jest_args[*]}` | 353 | ✓ |

### usecase.6: fail fast on no tests matched

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| detects no tests match | `JEST_NO_TESTS=true` when "No tests found" | 296-298 | ✓ |
| exit 2 with constraint | `exit 2` after output_no_tests | 620 | ✓ |
| shows scope hint | "check the scope pattern" in output_no_tests | 470 | ✓ |

### usecase.7: fail fast on absent command

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| exit 2 with constraint | `exit 2` in validate_npm_command | 180 | ✓ |
| shows helpful hint | "ehmpathy convention uses test:lint..." | 178 | ✓ |

### usecase.8: output format

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| shows turtle header | `print_turtle_header` | 380, 417 | ✓ |
| shows skill name and args | `print_tree_start "git.repo.test $DISPLAY_ARGS"` | 381, 418 | ✓ |
| shows status passed/failed | `print_tree_branch "status" "passed/failed"` | 388, 426, 431 | ✓ |
| shows stats nested | echo "suites:", "tests:", "time:" | 392-395 | ✓ |
| shows log nested | echo "stdout:", "stderr:" | 400-402 | ✓ |
| shows tip on failure | echo "tip: Read the log..." | 454, 456 | ✓ |

### usecase.9: log capture

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| stdout captured | `cp "$TEMP_STDOUT" "$STDOUT_LOG"` | 651, 658 | ✓ |
| stderr captured | `cp "$TEMP_STDERR" "$STDERR_LOG"` | 652, 659 | ✓ |
| log paths shown on success | `echo "stdout: $rel_stdout"` | 401-402 | ✓ |
| log paths shown on fail | `echo "stdout: $rel_stdout"` | 449-450 | ✓ |

### usecase.10: keyrack unlock behavior

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| unlocks ehmpath/test | `rhx keyrack unlock --owner ehmpath --env test` | 202 | ✓ |
| idempotent (no error if unlocked) | keyrack command is idempotent | 202 | ✓ |
| exit 1 on failure | `exit 1` in unlock_keyrack | 214 | ✓ |

### usecase.11: context efficiency

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| output is summary only | emits structured output, not raw jest | 375-459 | ✓ |
| no raw jest in terminal | captured via redirection, not echoed | 367 | ✓ |
| full output in log files | `cp "$TEMP_STDOUT" "$STDOUT_LOG"` | 651 | ✓ |

### usecase.12: run all tests

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| runs lint first | `ALL_TYPES=("lint" "unit" "integration" "acceptance")` | 477 | ✓ |
| runs unit second | loop order: lint → unit → integration → acceptance | 488 | ✓ |
| runs integration third | loop order preserved | 488 | ✓ |
| runs acceptance fourth | loop order preserved | 488 | ✓ |
| emits status as each completes | `echo "├─ ${test_type}: passed"` | 531 | ✓ |
| shows total duration | `echo "├─ total: ${all_duration}s"` | 563, 576 | ✓ |
| exit 2 on first failure | `break` after ALL_FAILED=true is set | 538, 543 | ✓ |

### usecase.13: thorough mode

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| sets THOROUGH=true | `env_prefix="${env_prefix}THOROUGH=true "` | 362 | ✓ |

### usecase.14: namespaced log paths

| criterion | implementation | line | status |
|-----------|---------------|------|--------|
| lint logs to what=lint | `LOG_DIR="${LOG_BASE}/what=${WHAT}"` | 135 | ✓ |
| unit logs to what=unit | same pattern | 135 | ✓ |
| integration logs to what=integration | same pattern | 135 | ✓ |
| acceptance logs to what=acceptance | same pattern | 135 | ✓ |
| all mode uses per-type paths | `type_log_dir="${LOG_BASE}/what=${test_type}"` | 501 | ✓ |

---

## blueprint adherance

### filediff tree verification

**blueprint declares:**
```
src/domain.roles/mechanic/
├─ [~] skills/git.repo.test/git.repo.test.sh           # extend
├─ [+] skills/git.repo.test/git.repo.test.play.integration.test.ts
└─ [+] briefs/practices/code.test/lessons.howto/howto.run-tests.[lesson].md
```

**actual files:**
- git.repo.test.sh: extended with unit/integration/acceptance/all ✓
- git.repo.test.play.integration.test.ts: created with 13 journeys ✓
- howto.run-tests.[lesson].md: created with commands and flags ✓

**status**: matches blueprint file tree

### codepath tree verification

blueprint specifies codepath structure. verified against implementation:

| blueprint element | implementation | status |
|-------------------|----------------|--------|
| constants LOG_BASE | line 38 | ✓ |
| compute LOG_DIR | line 135 | ✓ |
| parse --what | lines 57-59 | ✓ |
| parse --scope | lines 65-67 | ✓ |
| parse --resnap | lines 69-71 | ✓ |
| parse --thorough | lines 73-75 | ✓ |
| parse -- passthrough | lines 77-80 | ✓ |
| validate --what | lines 118-132 | ✓ |
| validate npm command | lines 168-186 | ✓ |
| keyrack unlock | lines 193-220 | ✓ |
| findsert log dir | lines 225-232 | ✓ |
| isotime filename | lines 237-239 | ✓ |
| --what all loop | lines 476-590 | ✓ |
| run_single_test | lines 330-370 | ✓ |
| parse_jest_output | lines 280-325 | ✓ |
| detect no-tests-matched | lines 618-621 | ✓ |
| output_success | lines 375-406 | ✓ |
| output_failure | lines 411-459 | ✓ |
| output_no_tests | lines 464-471 | ✓ |

**status**: matches blueprint codepath tree

---

## deviations found

### deviation 1: none

no deviations from the behavior declaration were found. implementation matches vision, satisfies all criteria, and follows blueprint accurately.

---

## conclusion

implementation adheres to behavior declaration:

| document | adherance |
|----------|-----------|
| vision | full match |
| criteria.blackbox | all 14 usecases satisfied |
| blueprint | file tree and codepath tree match |

no junior drift detected. implementation is correct.
