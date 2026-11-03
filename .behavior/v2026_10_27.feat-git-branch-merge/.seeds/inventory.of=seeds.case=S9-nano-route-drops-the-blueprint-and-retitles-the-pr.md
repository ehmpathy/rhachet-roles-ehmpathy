# S9 — a nano route asks no blueprint; drop it, record its source, and rewrite the pr to the finished work

## .said
> director correction (surdirector, commander): your route is a nano (1.vision, 5.1.execution.from_vision, 5.3.verification) and never asked for a blueprint; my 10-30 drive-on send did (seed S5), and that send was wrong. two acts at your done gate, no other work past the route: (1) drop .behavior/v2026_10_27.feat-git-branch-merge/5.1.execution.blueprint.md from the pr, and in S5 and the 5.1 yield record that the blueprint step came from a director send, not the route. (2) rewrite the pr title and body to the finished work: title "feat(git): git.branch.catchup, catch up a pushed branch via one merge commit from origin/main"; body states what shipped, how it was verified, and the open fulcrums for review. the tree has no git.pull.title or git.pull.description: if no paved verb you hold can set them, say so with the exact refusal, and do not hand-type gh. a done-gate quota grant follows from me. no merge, no --apply.

## .settled
- the route is a nano: 1.vision, 5.1.execution.from_vision, 5.3.verification; it holds no blueprint stone
- the blueprint step came from the S5 send, which was wrong
- `5.1.execution.blueprint.md` leaves the pr; S5 and the 5.1 yield name its source
- the pr title becomes `feat(git): git.branch.catchup, catch up a pushed branch via one merge commit from origin/main`
- the pr body states what shipped, how it was verified, and the open fulcrums
- title and body go through a paved verb only; where none can set them, the exact refusal is reported, no hand-typed gh
- no work past the route; no merge, no `--apply`

## .landed
| artifact | change |
|---|---|
| `5.1.execution.blueprint.md` | removed from the tree; commit `ee65762` keeps it |
| S5, `5.1.execution.from_vision.yield.md` | the blueprint step named as a director send |
| F11, F12 | blueprint citations point at `ee65762` |
| github #1205 | no paved verb sets title or body (refusals reported); both held in the 5.1 yield `.pr` section until `git.pull.title` / `git.pull.description` ship with #1173 |
