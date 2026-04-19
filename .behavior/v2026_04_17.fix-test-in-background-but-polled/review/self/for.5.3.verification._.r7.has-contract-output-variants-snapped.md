# self-review r7: has-contract-output-variants-snapped (deeper reflection)

## what changed between r5 and r6

in r5, i identified a gap: the hook behavior was not tested, only registration. the user asked "why dont you have an integration test for the hook via typescript?"

**action taken:** i added pretooluse.forbid-test-background.integration.test.ts with:
- 17 tests across 6 given/when/then cases
- snapshot for the block message
- coverage of all code paths

## the contract: hook block message

when the hook blocks, the clone sees this message:

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

this message IS the caller experience. it's what guides the clone to correct behavior.

## snapshot analysis

| element | covered | evidence |
|---------|---------|----------|
| block message content | yes | snapshot captures exact text |
| emoji marker | yes | `🛑 BLOCKED:` in snapshot |
| problem explanation | yes | "wastes tokens" in snapshot |
| fix guidance | yes | "fix: remove run_in_background" in snapshot |
| before/after example | yes | `Bash(command:...` in snapshot |

## why exhaustive for this contract

1. **one output variant.** the hook has exactly one non-empty output: the block message. it's snapped.

2. **allow path is silent.** exit 0 with empty output. no content to snap.

3. **all code paths tested.** 17 tests verify:
   - foreground allowed (case1: 3 tests)
   - background blocked (case2: 4 tests)
   - non-test allowed (case3: 3 tests)
   - non-Bash allowed (case4: 2 tests)
   - edge cases (case5: 3 tests)
   - block message content (case6: 2 tests)

## gaps found

none. the contract has one output variant. it's snapped.
