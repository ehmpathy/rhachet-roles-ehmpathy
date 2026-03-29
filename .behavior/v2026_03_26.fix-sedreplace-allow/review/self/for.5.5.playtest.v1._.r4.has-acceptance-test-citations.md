# self-review round 4: has-acceptance-test-citations (question deeper)

## objective

question: is an integration test sufficient, or do we need actual acceptance tests?

## what the guide asks

> cite the acceptance test for each playtest step

## what i have

**integration tests** that verify:
- hook receives stdin JSON
- hook outputs correct JSON response
- hook rejects dangerous commands

**no acceptance tests** that verify:
- Claude Code receives the allow decision
- Claude Code skips the permission prompt
- the user experiences "no prompt"

## why acceptance tests are impossible

a true acceptance test would need to:
1. start a Claude Code session programmatically
2. inject a command
3. observe whether a permission prompt appeared
4. verify the command ran

**but Claude Code is the runtime, not a testable dependency:**
- we can't spawn Claude Code from a test
- we can't observe "no prompt" (absence is not observable)
- we can't inject commands into a live session

## the playtest IS the acceptance test

the playtest document describes:
1. start Claude Code with mechanic role
2. run the commands
3. observe no prompt
4. verify turtle vibes output

this IS the acceptance test — it's just manual, not automated.

## what the integration test proves

the integration test proves:
- the hook returns `permissionDecision: allow` for safe rhx commands
- the hook returns empty output for dangerous commands
- the JSON structure is correct

**if Claude Code honors this output**, the user sees no prompt.

## the gap: Claude Code behavior

the integration test does not verify that Claude Code honors `permissionDecision: allow`. this was validated manually in 2026-03-27 (see vision).

there is NO automated way to verify this. it's a dependency on Claude Code's internal behavior.

## citations updated

| playtest step | automated test | manual verification |
|---------------|----------------|---------------------|
| path 1 | case1 (integration) | playtest path 1 |
| path 2 | case2 (integration) | playtest path 2 |
| path 3 | case4 (integration) | playtest path 3 |
| edge 1 | case6 (integration) | playtest edge 1 |

every step has:
- automated integration test (proves hook behavior)
- manual playtest step (proves end-to-end experience)

## why this holds

1. acceptance tests are impossible to automate for this feature
2. integration tests verify the hook's contract
3. the playtest IS the manual acceptance test
4. both automated and manual verification exist

the test coverage is complete given the constraints.
