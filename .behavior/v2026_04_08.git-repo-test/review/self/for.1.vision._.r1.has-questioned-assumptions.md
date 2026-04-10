# review.self: has-questioned-assumptions

i surfaced hidden assumptions in the vision. for each, i asked:
- what do we assume here without evidence?
- what evidence supports this assumption?
- what if the opposite were true?
- did the wisher actually say this, or did we infer it?
- what exceptions or counterexamples exist?

---

## assumption 1: repos have `npm run test:unit`, `test:integration`, `test:acceptance`

**what we assume:** all ehmpathy repos use these exact npm command names.

**evidence:** common ehmpathy convention. i've seen it in multiple repos.

**what if opposite?** some repos might use:
- `npm test` (default)
- `npm run test-unit` (hyphen instead of colon)
- `npm run unit-test` (different order)
- no test command at all

**did wisher say this?** no. wisher said "auto run the npm run test:xyz correctly" which implies the convention exists, but doesn't specify the exact names.

**counterexamples:** legacy repos, third-party repos, repos with different conventions.

**verdict:** this assumption is REASONABLE but FRAGILE. the skill should:
1. check if the command exists in package.json before run
2. fail fast with helpful error if command is absent
3. document the expected convention in the brief

**change made:** none to vision (already has "fail fast with helpful error" in pit of success). but implementation must validate command existence.

---

## assumption 2: keyrack credentials under `ehmpath` owner

**what we assume:** all integration tests use `ehmpath` keyrack owner.

**evidence:** howto.keyrack brief says "always use `--owner ehmpath`".

**what if opposite?** some repos might:
- use different keyrack owners (personal, org-specific)
- not use keyrack at all (local-only tests)

**did wisher say this?** wisher said "auto unlock keyracks" but didn't specify owner. the `ehmpath` comes from the brief.

**counterexamples:** personal repos, non-ehmpathy repos.

**verdict:** this assumption is CORRECT for ehmpathy context. the skill is specifically for mechanic role in ehmpathy repos. `ehmpath` is the right owner.

**change made:** none. assumption holds for the target context.

---

## assumption 3: jest or vitest is the test runner

**what we assume:** all ehmpathy repos use jest or vitest.

**evidence:** most ehmpathy repos i've seen use jest.

**what if opposite?** some repos might use:
- mocha
- tap
- ava
- node's built-in test runner
- custom test harness

**did wisher say this?** no. wisher mentioned "the quirks of jest and vitest and npm" which implies these are the targets.

**counterexamples:** legacy repos, specialized test needs.

**verdict:** this assumption is REASONABLE. jest/vitest are the most common. the skill should:
1. start with jest support
2. add vitest support (already in questions)
3. fail gracefully if neither is detected

**change made:** none. already noted as open question. implementation priority: jest first, vitest second.

---

## assumption 4: `RESNAP=true` triggers snapshot update

**what we assume:** all ehmpathy repos use `RESNAP=true` to update snapshots.

**evidence:** seen in permission patterns like `RESNAP=true npm run test:unit`.

**what if opposite?** some repos might use:
- jest's native `-u` or `--updateSnapshot` flag
- vitest's equivalent
- custom env var

**did wisher say this?** wisher said "make it easy to --resnap snapshots" but didn't specify the mechanism.

**counterexamples:** repos that don't use the RESNAP convention.

**verdict:** this assumption is REASONABLE for ehmpathy context. `RESNAP=true` is the ehmpathy convention. the skill enforces the convention.

**change made:** none. assumption holds for ehmpathy repos.

---

## assumption 5: test output can be tee'd (HIDDEN)

**what we assume:** test runner output works well with `tee`.

**evidence:** standard unix pattern.

**what if opposite?** some scenarios where tee might fail:
- color codes get corrupted
- interactive prompts break
- watch mode doesn't work
- very large output causes issues

**did wisher say this?** no. wisher said "stream" which i interpreted as tee.

**counterexamples:**
- jest's `--colors` might need special handling
- watch mode (`--watch`) is inherently interactive

**verdict:** this assumption is FRAGILE. need to handle:
1. preserve color codes (use `unbuffer` or pty wrapper if tee strips them)
2. don't use tee for watch mode (if ever supported)
3. test the tee behavior in integration tests

**change made:** added note to vision about color handling (need to verify in implementation).

---

## assumption 6: unit tests don't need keyrack (HIDDEN)

**what we assume:** keyrack should be unlocked for all test types.

**evidence:** wish says "auto unlock keyracks" without distinction.

**what if opposite?** unit tests typically:
- don't hit external services
- don't need credentials
- should run without keyrack

**did wisher say this?** wisher said "auto unlock keyracks" generally, but context was about integration tests (which fail without it).

**counterexamples:** unit tests that call external services (bad practice but exists).

**verdict:** this assumption could be OVER-BROAD. should we skip keyrack for unit tests?

**resolution:** keep it simple for now - always unlock for integration/acceptance, skip for unit/lint. this is the most sensible default.

**change made:** update vision to clarify: keyrack unlock only for integration/acceptance, not unit/lint.

---

## assumption 7: keyrack unlock is idempotent (HIDDEN)

**what we assume:** calling `rhx keyrack unlock` multiple times is safe.

**evidence:** keyrack is designed for this (unlock if locked, no-op if already unlocked).

**what if opposite?** what if unlock fails?
- keyrack not installed
- no credentials configured
- network error

**did wisher say this?** no. assumed from keyrack design.

**counterexamples:** first-time setup, broken keyrack config.

**verdict:** this assumption is CORRECT but needs ERROR HANDLING. if keyrack unlock fails:
1. show helpful error
2. suggest setup steps
3. don't silently continue

**change made:** none to vision. implementation must handle keyrack errors gracefully.

---

## summary of hidden assumptions found

| assumption | status | action |
|------------|--------|--------|
| npm command names | reasonable but fragile | validate in implementation |
| ehmpath owner | correct for context | keep |
| jest/vitest runner | reasonable | jest first, vitest later |
| RESNAP=true | correct for ehmpathy | keep |
| tee works well | fragile | verify color handling |
| keyrack for all tests | over-broad | only for integration/acceptance |
| keyrack idempotent | correct | handle errors gracefully |

## changes to vision

1. **keyrack unlock scope**: clarified that keyrack should only unlock for integration/acceptance, not for unit/lint tests. this reduces unnecessary operations.

---

## lessons learned

1. **question implicit scope.** i assumed keyrack was needed for all tests, but unit tests don't need it.

2. **consider failure modes.** tee might strip colors, keyrack might fail. implementation must handle these.

3. **evidence vs inference.** many assumptions came from observation, not explicit wisher statements. that's okay if documented.
