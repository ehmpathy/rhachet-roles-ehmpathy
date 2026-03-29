# self-review round 9: has-play-test-convention

## objective

verify journey test files use correct convention.

## repo convention check

searched for `.play.*.ts` files in `src/`:

**result: no files found**

this repo does not use the `.play.` test convention.

## what convention does this repo use?

this repo uses:
- `.test.ts` — unit tests
- `.integration.test.ts` — integration tests
- `.acceptance.test.ts` — acceptance tests

no `.play.` suffix is used in this repo.

## my test file

the new test file:
`src/domain.roles/mechanic/inits/claude.hooks/pretooluse.allow-rhx-skills.integration.test.ts`

this follows the repo's extant convention for integration tests.

## why no play test?

the guide mentions play tests are for "journey tests" — tests that exercise end-to-end user flows.

this behavior's test file:
- tests the hook directly (unit-level)
- simulates Claude Code's input (integration-level)
- does not exercise the full journey (Claude Code → hook → sedreplace → output)

the full journey cannot be tested in code because:
1. Claude Code is the runtime, not a testable dependency
2. the hook runs INSIDE Claude Code's process
3. we can only simulate Claude Code's hook invocation

## fallback convention used

the test file uses `.integration.test.ts`:
- matches repo convention
- correctly categorizes the test (simulates external input)
- runs with the integration test suite

## why this holds

1. repo does not use `.play.` convention (verified)
2. test file uses `.integration.test.ts` (matches extant convention)
3. full journey test not possible (Claude Code not testable as dependency)
4. fallback convention is appropriate

no convention violation. repo convention followed.
