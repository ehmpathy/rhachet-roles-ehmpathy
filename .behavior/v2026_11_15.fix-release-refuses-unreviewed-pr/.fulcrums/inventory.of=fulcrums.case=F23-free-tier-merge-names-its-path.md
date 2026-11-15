# F23 — the free-tier direct merge names its path in the tree

## .the fork

- **A (taken)**: when the repo refuses automerge and the skill merges directly, the status tree reads
  `🌴 automerge unavailable on this repo; merged directly [direct]`. the locked p1 `[case2][t5]` line
  changes with it
- **B**: keep the old line, `🌴 automerge enabled [added]`, on the direct path too, so the p1 lock
  stands

## .taken, why

- the old line is false on that path. the repo refused automerge, so none was enabled, and the merge
  already happened
- two peer reviewers asked for the change (5.3 `enroll-verif-snapshot-coverage` and
  `enroll-verif-snapshot-blemishes`, each nitpick.4): the case11 `[t4]` snap could not show that the
  fallback ran
- the fallback now carries the head pin this pr adds (E31), so the path the tree names is the path
  under test
- p1 `[case2][t5]` keeps every assertion (`exit 0`, `cowabunga`, `all checks passed`); only its
  snapshot line moves

## .rework

clean: drop the `direct` branch in `_emit_automerge_line` and the `merged directly` line in
`emit_transport_status`, then resnap p1 and p9 case11 t4

## .confidence

85%: the new line is more accurate, but it changes a locked expectation on a path the wish did not
name, and `rule.require.review-test-changes` asks for a human's word on that

## .where

`git.release.operations.sh` (`ENABLE_AUTOMERGE_VIA`), `git.release._.emit_transport_status.sh`,
`output.sh` (`print_automerge_status direct`),
`__snapshots__/git.release.p1.integration.test.ts.snap` (`[case2][t5]`)

## .verdict

awaits the commander
