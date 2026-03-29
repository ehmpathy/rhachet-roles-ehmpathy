# self-review round 2: has-clear-instructions (question deeper)

## objective

question: what could confuse a foreman with no context?

## potential confusion points

### issue 1: "with the mechanic role active"

**the problem**: how does a foreman know if the mechanic role is active?

**fix needed**: add a verification step.

**fixed in playtest**: added prerequisite step to verify role is active:
```
3. verify mechanic role is active: the session should show "SessionStart:compact hook success" with mechanic briefs
```

### issue 2: what does "runs WITHOUT a permission prompt" look like?

**the problem**: a foreman who has never seen a permission prompt won't know what to look for.

**fix needed**: describe what a permission prompt looks like.

**fixed in playtest**: added note:
```
**what a permission prompt looks like:** a gray box appears with "This command requires approval" and Allow/Deny buttons
```

### issue 3: "no matches expected, which is fine"

**the problem**: if there are no matches, how does the foreman know the hook worked vs the command failed?

**fix needed**: clarify what "success" looks like even with no matches.

**fixed in playtest**: changed expected outcome to:
```
- sedreplace shows its turtle vibes output (🐢 header, plan summary)
- even if "0 matches found", the command ran successfully
```

### issue 4: edge path 1 is ambiguous

**the problem**: "may or may not prompt" is not a clear expected outcome.

**fix needed**: make this a positive test instead of ambiguous.

**fixed in playtest**: removed edge path 1 (not useful for verification). the happy paths already prove the hook works for rhx commands.

## updated instructions

after fixes, the playtest now:
1. has verification for prerequisite (role active)
2. describes what a permission prompt looks like
3. clarifies success even when no matches found
4. removes ambiguous edge case

## why this holds

1. I identified 4 potential confusion points
2. I proposed fixes for each
3. I updated the playtest to incorporate fixes
4. instructions are now clearer for a foreman with no context
