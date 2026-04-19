# self-review r2: has-pruned-backcompat

re-examined with fresh perspective.

## re-review: multiple command patterns

**the issue:** hook blocks 3 invocation forms, but wish only mentioned `rhx git.repo.test`.

**deeper analysis:**

the wish says: "is there a way to block a bot from run tests in background?"

this implies block ALL ways to run the test skill in background, not just one specific command form.

**why all patterns hold:**

1. `rhx git.repo.test` - the common shorthand
2. `npx rhachet run --skill git.repo.test` - the full form
3. `./node_modules/.bin/rhx git.repo.test` - the direct binary path

if we only blocked #1, a clone could trivially bypass via #2 or #3. this defeats the purpose entirely.

**verdict:** not backcompat, it's completeness. all patterns required.

---

## re-review: empty input

**the issue:** hook exits 0 on empty input instead of error.

**why it holds:**

- hooks receive stdin from Claude Code
- empty stdin is possible edge case (malformed call, timeout, etc)
- exit 0 = allow = safe default for edge cases
- exit 2 on empty would block legitimate commands

**verdict:** standard pattern, not backcompat.

---

## re-review: hook position

**the issue:** hook is first in onTool array.

**why it holds:**

- first hook runs first
- block early = fewer wasted cycles
- no dependency on other hooks
- other hooks (like check-permissions) would run after, waste work

**verdict:** optimal position, not backcompat.

---

## summary

| concern | r1 verdict | r2 verdict | reason |
|---------|------------|------------|--------|
| multiple patterns | open question | hold | completeness, not compat |
| empty input | hold | hold | standard edge case handle |
| hook position | hold | hold | optimal, not compat |

no backcompat violations found. all concerns are either completeness or standard patterns.
