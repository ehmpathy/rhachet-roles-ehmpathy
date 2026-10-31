# F43 — the mechanic boot is trimmed back under its cap after the #1180 rebase

## .the fork

after the rebase onto main `421f1f5` (#1180, the pr comment verbs), the mechanic src spec costs
30,657 tokens against its 30,000 cap (`boot.budget.integration.test.ts` [case3] red). each side fit
alone; together they do not. main added three `say` skills; this branch added test files that the
src view's `<also>` roster lists.

- **A (taken)** — demote three `say` skills to `ref` and cut repeated header lines. result: 29,837
- **B** — raise `budget.tokens`. boot.yml reserves that for "a deliberate, reviewed call"; not a
  driver's call
- **C** — condense brief `.min` twins to buy the room. larger diff, wider review, same outcome

## .taken, and why

A, one move per line:

| move | tokens | why it holds |
|---|---|---|
| `git.release.uses.sh` say → ref | ~380 | a human-run grant: every write needs a human at a tty. its twin `git.commit.uses.sh` already sits in `ref` under "human-run grants" |
| `get.package.docs.sh` say → ref | ~155 | the booted say brief `rule.require.read-package-docs-before-use` already names both of its commands |
| `git.pull.comment.del.sh` say → ref | ~185 | delete is the rare, destructive verb; `get` and `set` stay `say`; the ref'd dispatcher `git.pull.comment.sh` names `del` |
| `git.release.sh` header: 4 guarantee lines cut | ~55 | each restated a usage line above it (rule.forbid.rambles) |

## .rework

clean. each move is one line in `boot.yml`, or a header cut that names no behavior.

## .confidence, and why it is low

75%. the `del` demotion reverses one line of main's fresh #1180 choice; its author may prefer a
different trade (e.g. a `.min` brief condensed instead). and the src view grows with every new
test file, so the 163-token margin will not last; a cap that counts unshipped test paths may be
the real defect.

## .where

`src/domain.roles/mechanic/boot.yml`, `src/domain.roles/mechanic/skills/git.release/git.release.sh`

## .verdict

open.
