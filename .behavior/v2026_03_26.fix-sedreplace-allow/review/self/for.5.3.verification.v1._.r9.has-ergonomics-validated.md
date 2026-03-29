# self-review round 9: has-ergonomics-validated (question the experience)

## objective

question deeper: does the user experience match the vision?

## what the vision promised

from vision.md lines 5-13:

> mechanic needs to rename a variable across the codebase:
> ```sh
> npx rhachet run --skill sedreplace --old '{ identity: keyPair.identity }' --new 'createTestContext(keyPair.identity)' --glob 'src/**/*.ts' --mode apply
> ```
> the command runs immediately without any permission prompt. the mechanic sees the turtle vibes output and moves on.

key ergonomic promises:
1. command runs immediately (no wait for prompt)
2. no permission prompt appears
3. mechanic sees the same turtle vibes output

## verification of each promise

### promise 1: command runs immediately

**verified via tests**: P1-P5 cases verify the hook returns `allow` for safe commands. Claude Code processes the allow decision and runs the command without delay.

### promise 2: no permission prompt appears

**verified via hook output**: the JSON structure with `permissionDecision: allow` tells Claude Code to skip its safety heuristics. this is the documented behavior per Claude Code hooks reference.

### promise 3: same turtle vibes output

**verified by design**: the hook does NOT modify the sedreplace output. the hook:
1. receives stdin from Claude Code
2. returns JSON to Claude Code
3. exits

the actual sedreplace command runs AFTER the hook returns. the hook has no access to sedreplace's stdout/stderr. therefore the output is unchanged.

## what could have drifted?

| aspect | could it drift? | status |
|--------|-----------------|--------|
| command syntax | no — unchanged | verified |
| permission prompt | yes — hook could fail | tested (fail-safe) |
| sedreplace output | no — hook can't modify | by design |
| error messages | no — hook can't modify | by design |

## the aha moment test

from vision.md line 26:

> "wait, it just ran? no popup to approve?"

this aha moment happens when:
1. user runs a command that USED to prompt
2. command runs WITHOUT prompt
3. user notices the absence

the hook enables this aha moment by returns `allow` for commands that would otherwise trigger the prompt.

## why this holds

1. the hook cannot modify sedreplace output (runs before sedreplace)
2. the hook returns `allow` for safe commands (tested)
3. Claude Code skips prompts on `allow` (documented behavior)
4. user experience: same output, no interruption

ergonomics match the vision. the change is subtractive (removes prompt), not additive (no new UI).
