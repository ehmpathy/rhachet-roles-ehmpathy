# F25 — the scope suite's exact exit asserts pin extant behavior, not a new requirement

- **raised by:** `mech-test-intent` blocker.1, nitpick.1, nitpick.2, 5.3 peer i001
- **fork:** revert to the permissive ranges · keep the exact codes the skill already returns
- **taken:** keep. the old asserts accepted any code (`[0, 1, 2]`, `[0, 2]`, `not 1`) because
  their notes assumed jest decides the exit. the skill decides it, and has since before this branch:
  - a name scope that matches no test: `git.repo.test.sh` "check for no tests matched" → `exit 2`
    (lines 1841-1847). `git diff origin/main` on the skill holds no line of that block, so exit 2
    is extant behavior, not a remap added here. the tightened asserts are what the snapshots
    already showed (`status: constraint`, `error: no tests matched scope`)
  - `not.toBe(1)` → `toBe(0)`: each of those cases is green at exit 0 on this tree (731 passed,
    0 failed). a weaker assert would let a constraint (2) pass as success
  - `sanitizeOutput(x)` → `sanitizeOutput({ output: x })`: the input-context shape
    (`rule.require.input-context-pattern`). its replacements are the old ones, minus a keyrack
    refusal collapse (no longer needed: the case states its own refusal), plus a lookahead that
    keeps `/tmp/rhachet/git.repo.test` visible. both changes make the snapshots stricter
- **rework:** clean
- **confidence:** 90%
- **verdict:** —
