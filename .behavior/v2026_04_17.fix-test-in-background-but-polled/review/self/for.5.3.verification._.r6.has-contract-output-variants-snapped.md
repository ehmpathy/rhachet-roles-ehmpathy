# self-review r6: has-contract-output-variants-snapped

## contract identified

the hook has one user-visible output: the **block message** sent to stderr when it blocks background test execution.

## snapshot coverage

| contract | variants | snap file | status |
|----------|----------|-----------|--------|
| block message | background blocked | pretooluse.forbid-test-background.integration.test.ts.snap | done |

## snapshot content

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

## checklist

- [x] positive path (allow) - verified via exit code 0, empty output (no snap needed)
- [x] negative path (block) - snapped with clear message
- [x] edge cases - 17 integration tests cover all paths
- [x] snapshot shows actual output, not placeholder

## why it holds

1. **block message is snapped.** the integration test captures the exact output the clone sees.
2. **allow path has empty output.** exit 0 with empty stdout/stderr - no content to snap.
3. **edge cases are tested.** empty input, non-Bash, non-background, non-test all covered.

## gaps found

none. snapshot coverage is exhaustive for this contract.
