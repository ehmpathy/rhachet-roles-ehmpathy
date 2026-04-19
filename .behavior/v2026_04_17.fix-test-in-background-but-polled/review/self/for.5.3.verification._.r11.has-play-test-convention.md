# self-review r11: has-play-test-convention (thorough investigation)

## what is .play.test.ts?

the `.play.test.ts` suffix is a convention for **journey tests** - tests that simulate a user's full journey through a feature from start to finish.

examples of journey tests:
- "user signs up, verifies email, logs in, completes profile"
- "clone runs command, sees output, makes decision, takes action"

## is this PR's test a journey test?

the test i added (`pretooluse.forbid-test-background.integration.test.ts`) is NOT a journey test. it's a **component integration test**:

- sends mock JSON to the hook
- verifies exit code and stderr
- checks individual behaviors in isolation

this is unit-level behavior verification, not journey simulation.

## repo convention investigation

### searched for .play. pattern

```
grep: \.play\.
glob: *.ts
result: no files found
```

### extant test suffixes in this directory

```
pretooluse.check-permissions.integration.test.ts
pretooluse.forbid-sedreplace-special-chars.integration.test.ts
pretooluse.forbid-suspicious-shell-syntax.integration.test.ts
pretooluse.forbid-tmp-writes.integration.test.ts
postcompact.trust-but-verify.integration.test.ts
```

all use `.integration.test.ts` suffix.

## decision: follow extant convention

| option | rationale |
|--------|-----------|
| use .play.test.ts | not used in this repo, semantic mismatch |
| use .integration.test.ts | extant convention, semantic match |

chosen: `.integration.test.ts`

## why it holds

1. **repo has no .play.test.ts files.** the convention is not established here.
2. **test is not a journey.** it's component integration.
3. **extant pattern is consistent.** all hook tests use `.integration.test.ts`.
4. **semantic accuracy.** "integration" describes what this test does.

## gaps found

none. the test follows the established convention for this repo.
