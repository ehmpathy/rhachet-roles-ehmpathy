# fulcrums: git.branch.cutover

| case | title | rework | status | confidence |
|------|-------|--------|--------|------------|
| [F1](./inventory.of=fulcrums.case=F1-settle-verbs-as-flags.md) | settle via `continue` / `abort` subcommands | clean | overruled — wisher | 100% |
| [F2](./inventory.of=fulcrums.case=F2-abort-undoes-whole-cutover.md) | abort undoes the whole cutover, removes the new branch | clean | approved — wisher | 100% |
| [F3](./inventory.of=fulcrums.case=F3-tree-carry-via-private-ref.md) | tracked edits parked via a private ref, not the stash stack; untracked never touched | clean | narrowed — wisher | 90% |
| [F4](./inventory.of=fulcrums.case=F4-quota-gate.md) | apply requires a new `git.branch.uses` meter (built here); one unit per apply cut | clean | approved — wisher | 100% |
| [F5](./inventory.of=fulcrums.case=F5-close-504.md) | close #504 in favor of #528 | clean | approved — wisher | 100% |
| [F6](./inventory.of=fulcrums.case=F6-drop-empty-picks.md) | drop an empty pick and report it; branch quota alone gates | clean | approved — wisher | 100% |
| [F7](./inventory.of=fulcrums.case=F7-report-not-carry-branch-state.md) | ignore the route bind; report only the commit level | clean | overruled — wisher | 100% |
| [F8](./inventory.of=fulcrums.case=F8-subtree-compose-deferred.md) | cutover stays within the current worktree; no subtree placement | clean | settled — wisher | 100% |
| [F9](./inventory.of=fulcrums.case=F9-begin-subcommand.md) | the start form is `begin`, to match rebase | clean | best-guessed | 80% |
| [F10](./inventory.of=fulcrums.case=F10-from-into-flags.md) | `--into <branch>` + `--from <base>` (default main); no `--to` | clean | `--into` settled — wisher; `--from` = base best-guessed | 75% |
