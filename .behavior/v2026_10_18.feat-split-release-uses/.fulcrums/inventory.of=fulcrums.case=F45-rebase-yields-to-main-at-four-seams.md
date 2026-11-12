# F45 — the rebase onto `e93603e8` yields to main at four seams

## .the fork

main's own tests pin four behaviors that this branch's tip had changed or never knew. each could
keep the tip's shape, or take main's.

| seam | the tip held | main holds |
|---|---|---|
| `git.branch.rebase continue`, git refuses with no conflict and no unstaged path | a `status: halted` MalfunctionError, exit 1 | `status: in progress`, the held paths named, exit 0 — its test notes the status line is reserved for its own fulcrum (F11, main's route) |
| `git.branch.uses` refusals | — (new on main) | `print_instruction`, a helper this branch renamed to `print_coconut_hint`, so every repair hint failed with "command not found" |
| `git.branch.cutover` halt, stage section | — (new on main) | reads the retired `.stage` meter bit and prints `--push allow\|block --stage allow` |
| `set.package` security-block snapshot | `asStableAuditOutput` masks the live advisory feed | a fixture of pinned advisories; no live feed reached |

## .taken, and why

main, at every seam.

- the failed-continue status line is a question main reserved for its own fulcrum; to answer it here
  settles it by side effect and breaks main's case12
- the branch meter now calls `print_coconut_hint`, the shape every other meter renders; the repair
  hints return, and the case5 assertion (`rhx git.branch.uses del`) clamps it
- the cutover stage check reads `get_one_commit_local_grant`, the one reader `git.stage.add` gates
  on, so the halt's preview can never disagree with the stage it predicts; its hint names
  `git.commit.uses set --quant N`
- main's fixture makes the audit hermetic, so the mask is redundant (F44's order)

## .rework

clean. each seam is one hunk in one file plus its snapshot.

## .confidence — 85%

the halted guard is the soft spot: a real failed continue with no conflict (a rejected hook, an
empty commit) renders as progress again, the defect the tip's guard closed. main owns that call.

## .where

- `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.continue.sh`
- `src/domain.roles/mechanic/skills/git.branch.uses/git.branch.uses.operations.sh`, `.local.sh`
- `src/domain.roles/mechanic/skills/git.branch.cutover/git.branch.cutover.output.sh`, `.continue.sh`
- `src/domain.roles/mechanic/skills/set.package/set.package.{install,upgrade}.integration.test.ts`

## .verdict

open.
