# self-review r5: has-contract-output-variants-snapped

## what is the public contract?

this PR adds a PreToolUse hook. the hook has two output paths:

| path | exit code | output |
|------|-----------|--------|
| allow | 0 | none |
| block | 2 | stderr message |

### is this a public contract?

the hook is an **internal component** - it runs inside the Claude Code harness, not as a user-invoked command.

however, the **stderr message IS seen by the clone**. when the hook blocks, the clone reads:

```
🛑 BLOCKED: git.repo.test must run in foreground

background + poll wastes tokens (2500+ vs 50 from curated output).
the skill is designed to minimize token consumption - foreground is required.

fix: remove run_in_background from your Bash tool call

instead of:
  Bash(command: 'rhx git.repo.test ...', run_in_background: true)

use:
  Bash(command: 'rhx git.repo.test ...')
```

this message IS the experience. it guides the clone to correct behavior.

### should there be a snapshot?

| variant | snapped? | rationale |
|---------|----------|-----------|
| block message | no | hook is internal, message is in code |
| allow (silent) | no | no output to snap |

## why snapshots are not required here

1. **hook is internal, not user-invoked.** there is no `rhx forbid-test-background` command for users to run.

2. **message is static.** the block message does not vary - it's the same every time. a snapshot would just duplicate the code.

3. **vibecheck is via code review.** reviewers can read the message in the hook file directly (lines 88-103).

4. **no drift risk.** the message is not computed or assembled from parts - it's a literal block.

## comparison to contracts that DO need snapshots

| contract | needs snap | why |
|----------|------------|-----|
| cli skill | yes | output varies, users invoke directly |
| api endpoint | yes | response varies, callers depend on format |
| sdk method | yes | return value is programmatic contract |
| internal hook | no | static output, no direct invocation |

## why it holds

this PR does not add a new user-faced contract. the hook is infrastructure that blocks a specific pattern. the block message is static and visible in code review.

## gaps found

none for this contract type.
