# F14 — the gate's output stays minimal: no ci line, no pass line, no second header

## .the fork

peer i006 r010 items 4, 5, 7 ask the gate to say more:

- a refusal adds a check-state line (a red pr should not reach a reviewer first)
- the moved-head refusal renders through the full refusal tree, with its own header and url
- an approved apply prints `approved by @x at <sha7>`

or the gate says only what it decided: refused (with `why:`), malfunction, or naught on a pass.

## .taken

minimal. the wish asks the refusal to name the pr and say a human approval is owed; the `why:`
line already names what is owed. ci state lives on the pr the url links. the moved-head refusal
lands at the merge call, after the `cowabunga` header and status lines, so a second header would
break the tree. a pass leaves the extant apply tree untouched, and github's timeline records the
approver and the merged sha.

## .rework

clean. each is one added output line plus a snapshot.

## .confidence

80%. each line has real value for a reader; none changes what merges.

## .where

`git.release._.guard_pr_has_human_approval.sh` (refusal tree, silent pass);
`git.release.operations.sh` (`_emit_head_moved_refusal`)

## .verdict

awaits the commander.
