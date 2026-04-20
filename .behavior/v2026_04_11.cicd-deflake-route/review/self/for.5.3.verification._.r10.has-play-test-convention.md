# self-review: has-play-test-convention (round 10)

## the question

are journey test files named correctly?

## full survey of test files

### all test files in mechanic skills

```
glob src/domain.roles/mechanic/skills/**/*.test.ts

total: 46 test files
- *.integration.test.ts: 44 files
- *.play.integration.test.ts: 1 file
- *.journey.integration.test.ts: 1 file
```

### the two journey-style tests

| file | convention | purpose |
|------|------------|---------|
| `git.repo.test.play.integration.test.ts` | `.play.` | "journey tests for git.repo.test skill" |
| `git.branch.rebase.journey.integration.test.ts` | `.journey.` | "acceptance test for the full git.branch.rebase journey" |

both test multi-step workflows where each step depends on the previous.

## what makes a journey test

from the `.play.` file header:
```ts
/**
 * .what = journey tests for git.repo.test skill
 * .why  = verifies all test types, flags, and edge cases work correctly
 */
```

from the `.journey.` file header:
```ts
/**
 * .what = acceptance test for the full git.branch.rebase journey
 * .why = demonstrates what a real caller sees at each step of a rebase workflow
 *
 * .note = stress tests with multi-commit rebases, multiple conflicts, and real git operations
 */
```

common traits:
- multi-step workflow
- each step depends on previous state
- tests the full user experience end-to-end
- demonstrates what a real caller sees

## cicd.deflake test analysis

### what the test file contains

```ts
describe('cicd.deflake', () => {
  given('[case1] init: creates route and binds', () => { ... });
  given('[case2] init: output matches snapshot', () => { ... });
  given('[case3] init: findsert semantics', () => { ... });
  given('[case4] detect: requires --into', () => { ... });
  given('[case5] help: shows usage', () => { ... });
  given('[case6] unknown subcommand', () => { ... });
  given('[case7] no subcommand', () => { ... });
  given('[case8] not in git repo', () => { ... });
});
```

### classification per case

| case | what it tests | multi-step? | journey? |
|------|---------------|-------------|----------|
| case1 | init creates route | no, single command | no |
| case2 | init output format | no, snapshot | no |
| case3 | init is idempotent | no, rerun same command | no |
| case4 | detect error path | no, single command | no |
| case5 | help output | no, single command | no |
| case6 | error: unknown | no, single command | no |
| case7 | error: no args | no, single command | no |
| case8 | error: no git | no, single command | no |

none of these test a multi-step workflow. each case tests one command in isolation.

## why cicd.deflake has no journey tests

the cicd.deflake workflow is:

```
init → detect → [human fills stones] → verify → reflect
```

this workflow:
1. spans multiple sessions (not one test run)
2. requires human research and judgment
3. is driven by the route system, not CLI commands
4. the skill just provides init and detect

a journey test for cicd.deflake would need to:
- init a route
- detect flaky tests (needs CI history)
- fill diagnosis stones (human work)
- fill plan stones (human work)
- execute repairs (human work)
- verify zero flakes (needs CI)
- reflect (human work)

this is not automatable. the skill provides the scaffold; the route drives the workflow.

## what would warrant a `.play.` test

if cicd.deflake had a multi-step CLI workflow like:

```bash
# step 1: init
rhx cicd.deflake init

# step 2: auto-detect (no human needed)
rhx cicd.deflake detect --auto

# step 3: auto-fix (no human needed)
rhx cicd.deflake fix --auto

# step 4: verify
rhx cicd.deflake verify
```

then a `.play.` test would make sense. but cicd.deflake does not have this. steps 2-7 of the wish require human research.

## convention check

| convention | when to use | cicd.deflake |
|------------|-------------|--------------|
| `.integration.test.ts` | single commands, contract tests | yes, correct |
| `.play.integration.test.ts` | multi-step automatable journeys | not applicable |
| `.journey.integration.test.ts` | same as `.play.` (alternate) | not applicable |

## what i learned

### the distinction matters

`.play.` vs `.integration.` is not arbitrary. it signals the test's purpose:

| suffix | signals | reader expectation |
|--------|---------|-------------------|
| `.integration.` | "this tests a contract" | single-command behavior |
| `.play.` | "this traces a journey" | multi-step workflow |

if cicd.deflake tests were named `.play.integration.test.ts`, readers would expect multi-step scenarios. they would be confused to find 8 isolated command tests.

### skill tests vs workflow tests

cicd.deflake has two levels of test:

1. **skill tests** (cicd.deflake.integration.test.ts) — test the CLI commands work
2. **workflow tests** (not needed) — would test init → detect → diagnose → ... → reflect

the skill tests exist. the workflow tests don't exist because:
- the workflow spans multiple sessions
- requires human judgment at each stone
- is driven by the route system, not the skill

### 11 test cases, still not a journey

the test file has 11 cases now (case1-11). but more cases doesn't make it a journey. a journey is about **sequential dependency**, not **quantity**.

case11 (real GitHub API) could be called a mini-journey:
1. setup temp dir
2. init git repo
3. call detect
4. verify response shape

but this is still **one command** under test. the setup is scaffold, not a journey step that produces state for the next test.

## verdict

holds. no `.play.` tests are needed for cicd.deflake because:

1. **all 11 test cases are single-command contract tests** — no multi-step workflows
2. **the cicd.deflake workflow requires human judgment** — not automatable end-to-end
3. **the route system drives the workflow** — stones and guards, not CLI commands
4. **`.integration.test.ts` is the correct suffix** — matches other shell contract tests in the repo
5. **no repros were defined** — no specific user journeys to trace

the convention is followed: `.play.` is for automatable journeys, `.integration.` is for interfaces.
