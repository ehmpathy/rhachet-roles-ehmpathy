# self-review r7: has-critical-paths-frictionless

## critical path for this feature

the feature is a PreToolUse hook. the critical path is:

1. clone invokes `Bash(command: 'rhx git.repo.test ...', run_in_background: true)`
2. hook fires, checks conditions
3. hook blocks with clear message
4. clone sees guidance and runs foreground instead

## friction analysis

### step 1: clone invokes background test

**no friction.** the clone's invocation is not changed - the hook intercepts it.

### step 2: hook checks conditions

**no friction.** the hook checks are fast:
- tool_name == "Bash"? immediate exit 0 if not
- run_in_background == true? immediate exit 0 if not
- command matches git.repo.test? immediate exit 0 if not

all checks are O(1) string comparisons.

### step 3: hook blocks

**no friction.** exit 2 is immediate. message is pre-formatted.

### step 4: clone sees guidance

**critical moment.** this is where friction would matter most.

the message is:
```
🛑 BLOCKED: git.repo.test must run in foreground

fix: remove run_in_background from your Bash tool call

instead of:
  Bash(command: 'rhx git.repo.test ...', run_in_background: true)

use:
  Bash(command: 'rhx git.repo.test ...')
```

**friction check:**
- is the error clear? yes - "must run in foreground"
- is the fix obvious? yes - "remove run_in_background"
- is the example concrete? yes - before/after with exact syntax

## manual test

ran through the path via integration test:

```typescript
const result = runHook({
  tool_name: 'Bash',
  tool_input: {
    command: 'rhx git.repo.test --what unit',
    run_in_background: true,
  },
});
expect(result.exitCode).toBe(2);
expect(result.stderr).toContain('foreground');
```

test passes. path is frictionless.

## why it holds

1. **hook is fast.** no delays, no network, no file i/o.
2. **message is actionable.** clone knows exactly what to do.
3. **recovery is immediate.** just re-run without run_in_background.

## gaps found

none.
