# self-review r4: has-preserved-test-intentions (deeper)

## re-read the git diff for test file

checked the actual diff of git.repo.test.play.integration.test.ts:

```diff
+  // ######################################################################
+  // journey 14: no tests found without scope (changedSince)
+  // ######################################################################
+  given('[case14] repo with no changed test files', () => {
+    when('[t0] --what unit with no tests found (no scope)', () => {
+      ...
```

the diff shows ONLY addition of case14. no modifications to extant tests.

## what the extant tests verify

### case6: no match with scope
**before:** when `--scope nonexistent` matches 0 files, exit 2 (constraint)
**after:** same behavior, unchanged

this is the key distinction. case6 tests:
- scope IS specified
- scope matches zero files
- result: constraint error

### case14: no tests without scope (NEW)
**tests:** when no scope specified and changedSince finds 0 files, exit 0 (success)

these are different scenarios:
- case6: user asked for specific scope, got zero matches = error
- case14: user asked for no scope, changedSince found zero changes = success

## why this is not a weakened assertion

the old behavior was: all "no tests found" = exit 2

the new behavior distinguishes:
- scope specified + no match = exit 2 (constraint, user error)
- no scope + no changes = exit 0 (success, correct)

this is NOT a weakened assertion. it is a refined assertion. the distinction is meaningful:
- exit 2 when user made an error (bad scope)
- exit 0 when system worked correctly (no changes = no tests)

## forbidden actions check

| action | evidence |
|--------|----------|
| weaken assertions | no - distinction is meaningful, not weaker |
| remove test cases | no - all 13 journeys remain |
| change expected values | no - only new snapshot added |
| delete tests that fail | no - no deletions |

## summary

test intentions preserved. the new case14 does not change extant tests - it adds a new scenario with correct, refined behavior.
