# self-review round 3: has-consistent-mechanisms

## objective

deeper review for new mechanisms that duplicate extant functionality.

## fresh eyes review

### test file patterns

let me check if the test file duplicates patterns from extant tests.

**extant test: pretooluse.forbid-suspicious-shell-syntax.integration.test.ts**
- uses `spawnSync` to run hook
- uses `build_stdin_json()` utility
- uses `given/when/then` from test-fns

**new test: pretooluse.allow-rhx-skills.integration.test.ts**
- uses `spawnSync` to run hook
- uses `buildStdinJson()` utility (camelCase version)
- uses `given/when/then` from test-fns

**analysis**: the patterns match. the names differ slightly (`build_stdin_json` vs `buildStdinJson`) but both follow the same structure. this is correct — both tests need the same test harness pattern.

### stdin JSON structure

both hooks expect the same JSON structure from Claude Code:
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "..." }
}
```

this is not duplication — it's the shared input contract defined by Claude Code.

### output format

**forbid-***: outputs block message to stderr, exits 2
**allow-***: outputs JSON to stdout with `hookSpecificOutput` wrapper, exits 0

**analysis**: different output formats for different purposes. not duplication.

## conclusion

the mechanisms are consistent with extant patterns:
1. test structure matches extant integration test patterns
2. stdin parse matches the Claude Code input contract
3. output formats differ as required by hook semantics (allow vs forbid)

no problematic duplication found.

## why this holds

the shared patterns (stdin JSON parse, test-fns structure) are intentional consistency, not duplication. each hook has a clear purpose and does not implement functionality that should be extracted to a shared location.
