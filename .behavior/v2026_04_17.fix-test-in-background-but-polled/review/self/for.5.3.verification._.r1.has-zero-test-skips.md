# self-review r1: has-zero-test-skips

## search executed

```bash
grep -r "\.(skip|only)\(" src/domain.roles/mechanic --include="*.test.ts"
```

## results

### new code (this PR)

| file | skip/only | status |
|------|-----------|--------|
| getMechanicRole.test.ts (lines 53-58) | none | clean |

### pre-extant (not in scope)

| file | pattern | reason not addressed |
|------|---------|---------------------|
| boot.yml.integration.test.ts:41 | describe.skip | pre-extant, unrelated to this PR |
| .scratch/**/*.test.ts | various .only() | development/experimental code, not prod |

## why it holds

1. **new test code has no skips.** the test at getMechanicRole.test.ts:53-58 is a standard `then()` block with no .skip() or .only().

2. **pre-extant skips are out of scope.** this PR adds a PreToolUse hook to forbid background test execution. the pre-extant skips in boot.yml and .scratch/ are unrelated to this change.

3. **no silent credential bypasses.** the hook does not require credentials - it reads JSON from stdin and checks patterns.

4. **no prior failures carried forward.** the getMechanicRole.test.ts suite passes with 13 tests, 0 failed.

## gaps found

none in scope of this PR.
