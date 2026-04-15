# self-review: has-zero-test-skips (round 2)

## the question

did i verify zero skips — and REMOVE any found?

## the work

walked the test file line by line:

**cicd.deflake.integration.test.ts** (460 lines)

scanned for skip patterns:
- `.skip(` — not found
- `.only(` — not found
- `it.skip` — not found
- `describe.skip` — not found
- `given.skip` — not found
- `when.skip` — not found
- `then.skip` — not found

scanned for silent credential bypasses:
- no `if (!apiKey) return` patterns
- no `process.env.X || 'default'` fallbacks that hide absent credentials
- case11 requires gh cli auth but uses failfast pattern (throws ConstraintError)

scanned for conditional test execution:
- no `runIf` conditionals
- no `skipIf` conditionals
- no environment-based test skips

## why it holds

the test file has 11 cases, all unconditional:

1. `[case1] init: creates route` — runs always
2. `[case2] init: output format` — runs always
3. `[case3] init: already bound` — runs always
4. `[case4] detect: requires --into` — runs always
5. `[case5] help: shows usage` — runs always
6. `[case6] unknown subcommand` — runs always
7. `[case7] no subcommand provided` — runs always
8. `[case8] not in git repo` — runs always
9. `[case9] detect: positive path with --into` — runs always (mocked gh cli)
10. `[case10] detect: gh auth failure` — runs always (mocked gh cli)
11. `[case11] detect: real GitHub API integration` — runs always (real gh cli)

each test:
- creates a temp git repo via `createTempRepo`
- runs the skill directly via `spawnSync`
- asserts on exit codes and stdout/stderr
- case11 requires gh cli auth but throws ConstraintError if absent (failfast, not skip)

## note on case11

case11 does check `gh auth status` at runtime, but:
- if not authenticated, it throws `Error('ConstraintError: gh cli not authenticated')`
- it does NOT silently skip or return early
- this is failfast, not failhide

## verdict

holds. zero skips. all 11 tests execute unconditionally. no silent bypasses.
