# review.self: has-pruned-yagni

## review scope

reviewed git.repo.test.sh line by line against vision/criteria. checked each component for YAGNI.

## method

1. read full git.repo.test.sh (668 lines)
2. cross-referenced each section against vision and criteria
3. checked git diff to distinguish new code from extant behavior

## findings

### component audit

| lines | component | prescribed? | evidence |
|-------|-----------|-------------|----------|
| 1-26 | header and usage docs | yes | standard skill documentation |
| 37-39 | LOG_BASE constant | yes | criteria.blackbox usecase.14 |
| 44-49 | argument variables | yes | vision contract |
| 51-102 | argument parse loop | yes | vision, criteria |
| 61-64 | `--when` flag | extant | was in original code, preserved |
| 65-68 | `--scope` flag | yes | vision, criteria |
| 69-72 | `--resnap` flag | yes | vision, criteria |
| 73-76 | `--thorough` flag | yes | vision, criteria |
| 77-81 | `--` passthrough | yes | vision, criteria |
| 104-132 | argument validation | yes | fail-fast pattern |
| 134-135 | LOG_DIR computed | yes | criteria.blackbox usecase.14 |
| 140-163 | git/package.json validation | yes | fail-fast pattern |
| 168-186 | validate_npm_command | yes | criteria.blackbox usecase.7 |
| 191-220 | keyrack unlock | yes | vision, criteria.blackbox usecase.10 |
| 225-232 | findsert log dir | yes | criteria.blackbox usecase.9 |
| 237-244 | isotime + temp files | yes | criteria.blackbox usecase.9 |
| 260-275 | parse_lint_output | extant | was in original code |
| 280-325 | parse_jest_output | yes | criteria.blackbox usecase.8 |
| 330-370 | run_single_test | yes | criteria.blackbox usecase.1-5 |
| 375-406 | output_success | yes | criteria.blackbox usecase.8 |
| 411-459 | output_failure | yes | criteria.blackbox usecase.8 |
| 464-471 | output_no_tests | yes | criteria.blackbox usecase.6 |
| 476-588 | --what all handler | yes | criteria.blackbox usecase.12 |
| 593-667 | single test run + output | yes | criteria.blackbox usecase.1-5 |

### potential YAGNI: `--when` flag

**initial concern**: line 92 says "context hint (optional, for future use)"

**analysis**: checked git diff - `--when` was in the extant code before my changes:
```diff
-#   git.repo.test.sh --what lint --when hook.onStop # context hint (for future use)
```

**verdict**: not YAGNI. this is extant behavior that was preserved. to remove it would break backward compatibility with hook invocations that pass `--when`.

### what was NOT added

confirmed these were NOT added (per vision deferred items):
- vitest support
- `--env` flag for keyrack
- progress indicator beyond timer
- parallel execution for `--what all`
- custom log path flag

## conclusion

no YAGNI detected. every component is either:
1. prescribed in vision/criteria, or
2. extant behavior that was preserved

the `--when` flag was initially flagged but confirmed as extant code, not new addition.
