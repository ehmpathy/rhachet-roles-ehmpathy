# forks for the commander: 5.1.execution.from_vision, i011

the driver framed these, with a lean on each. it holds those three fixes until the commander rules.
the commander's answer: yes/no per lean, or the other option.

| fork | concern | (a) | (b) | driver lean | foreman note |
|---|---|---|---|---|---|
| F-A | r010 b1: an assume-unchanged / skip-worktree edit is erased under a ✓ | REFUSE at preflight (exit 2, before claim or spend): name each `h`/`S` path whose worktree differs from its index; fix = `git update-index --no-assume-unchanged <path>`, then rerun | PARK them too: clear the flag, park, restore the flag on the new branch | (a): the flag says "don't look"; (b) mutates index flags across a reset and adds a partial-failure state | agree |
| F-B | r011 #2: abort resets an edit no park holds | REFUSE: exit 2 when the worktree differs from what abort expects, and name the files | RESCUE REF: snapshot the live worktree into a commit under a per-worktree ref before the reset, name it and the restore command in the report, then proceed | (b): mid-halt the worktree differs by design (a half-settled conflict), so (a) strands every mid-settle abort, which is r011 #1's harm | agree. the ref should sit under `refs/worktree/cutover/`, like the park, and outlive abort's park cleanup |
| F-C | r011 #1: abort cannot rerun after an interrupted undo | IN-STONE: abort writes `.aborting = true` first; the position guard accepts HEAD on the source once an abort began; each step skips when done. clamp = kill after the switch-back, rerun, exit 0, state gone | (a), plus recast begin and continue into converge-by-step | (a) in-stone; (b) to the dream (items 7/11, fulcrum F17) | agree |

no-fork fixes in progress (driver): r010 b2 (unset `branch.<into>.remote/.merge` after the cut,
assert `<into>@{u}` absent); r011 #4 (drop the rebase-ops source, reuse the cutover's own lister).

the driver's message names no plan for r011 #3 (two rollback mechanisms in begin.sh). asked.
