# F23 — the park lay-back keeps its skip-branch in this stone

## the fork

i018 r011 nitpick.2 (item 3): `set_park_laid_back` asks `is_worktree_held_by_park` (three return
codes) before it lays the park back, to avoid a reset over a worktree that already holds the park.
since F19, `gen_rescue_ref` is findsert by tree, so the reset is safe to repeat. the reviewer
proposes one path:

| option | shape |
|---|---|
| (a) keep the branch | `is_worktree_held_by_park` → skip, or rescue + clear + `read-tree -m -u`, then the stage split |
| (b) collapse it | add `snapshot != park^{tree}` to `is_rescue_owed`; always rescue-if-owed → `reset --hard` → `read-tree -m -u HEAD park` → stage split. abort loses the rc-2 protocol and two of its three snapshots |

## taken, and why at the time

(a). `rule.require.fewer-paths-via-idempotency` favors (b), and (b) is the right end state. it is
not taken in this stone because:

- the abort ladder is the one surface every recent data-loss blocker landed on: i014, i016 n5,
  i017 b1 (a peer write mid back-out), and i018 b1 (an edit carried through a continue). each
  settled with a clamp — cases 28, 83, 87, 88, 98, 102
- (b) rewrites that ladder's middle rung the round after it settled. the clamps would gate it, yet
  a recast of the one path that erases edits, made to cut a branch rather than fix a defect, trades
  a nitpick for fresh blocker risk at the director's pass
- no defect lives in (a) today: every return code is clamped, and the skip is a no-op, never a loss

## rework

clean. the change is inside `set_park_laid_back` and `is_rescue_owed`; no caller contract moves,
no state field changes, and the six cases above gate it red or green. caught as dream item 25.

## confidence: 70%, and why it is low

the reviewer is right on the principle, and the rule grades a kept branch a blocker where the
operation could be made idempotent. my call rests on when (risk at the pass), not on soundness —
a wisher who weighs the rule over the moment would take (b) now.

## where

`git.branch.cutover.operations.sh`: `set_park_laid_back`, `is_rescue_owed`, `is_worktree_held_by_park`.

## verdict

open — for the council at the route's end.
