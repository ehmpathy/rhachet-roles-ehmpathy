# self-review round 10: has-play-test-convention (question the classification)

## objective

question deeper: is my test a journey test in disguise?

## what is a journey test?

a journey test exercises an end-to-end user flow:
1. user performs action
2. system processes action
3. user observes result

journey tests validate the **user experience**, not just the **mechanism**.

## what does my test actually do?

```typescript
// 1. simulate Claude Code's input (the "user" is Claude Code)
const stdinJson = buildStdinJson({ command: "rhx sedreplace --old '{ x }' ..." });

// 2. run the hook (the "system" is the hook)
const result = spawnSync('bash', [scriptPath], { input: stdinJson });

// 3. verify the output (the "result" is what Claude Code receives)
expect(result.stdout).toContain('"permissionDecision": "allow"');
```

this IS a journey test — from Claude Code's perspective:
- **actor**: Claude Code
- **action**: invoke hook with Bash command
- **result**: receive allow decision

## why it's not labeled `.play.`

the test is labeled `.integration.test.ts` because:
1. this repo doesn't use `.play.` convention (no extant examples)
2. the test crosses a process boundary (Claude Code → hook)
3. the repo treats "calls external process" as integration tests

## should it be a play test?

**argument for**: it exercises a user journey (Claude Code's journey through the hook)

**argument against**:
- the TRUE user is the human, not Claude Code
- the human's journey includes sedreplace output, which we can't test
- a `.play.` label would be aspirational, not accurate

## what would a true play test look like?

a true play test for this behavior would:
1. human runs `rhx sedreplace --old '{ x }' ...` via Claude Code
2. observe no permission prompt
3. observe sedreplace output

this requires:
- Claude Code as a testable component
- human observation (not automatable)
- runtime hooks registered in settings.json

**this is not possible in automated tests.**

## why the fallback is correct

the `.integration.test.ts` label is correct because:
1. it's the closest approximation to a journey test we can automate
2. it matches the repo's extant convention
3. a `.play.` label would misrepresent what the test actually verifies

## why this holds

1. the test IS a journey test from Claude Code's perspective
2. but it's NOT a human journey test (not automatable)
3. the `.integration.test.ts` label is accurate and consistent
4. this repo doesn't use `.play.` convention anyway

no convention violation. correct classification for what's testable.
