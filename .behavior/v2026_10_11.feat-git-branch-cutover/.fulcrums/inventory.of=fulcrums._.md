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
| [F9](./inventory.of=fulcrums.case=F9-begin-subcommand.md) | the start form is `begin`, to match rebase | clean | approved — wisher | 100% |
| [F10](./inventory.of=fulcrums.case=F10-from-into-flags.md) | `--from @main\|@tree\|<branch>` (required) + `--into <branch>` + `--pick`; no `--to`, no `--prune` | clean | settled — wisher | 100% |
| [F11](./inventory.of=fulcrums.case=F11-meter-reuses-commit-handlers.md) | `git.branch.uses` reuses the commit meter's global/org handlers, parameterized | clean | best-guessed | 75% |
| [F12](./inventory.of=fulcrums.case=F12-bash-orchestrators-call-git-inline.md) | git i/o sits in named communicators; the orchestrators compose them | clean | conceded — reviewer | 90% |
| [F13](./inventory.of=fulcrums.case=F13-peer-skills-share-via-operations-files.md) | peer skills share code via a source of each other's operations files | clean | best-guessed | 80% |
| [F14](./inventory.of=fulcrums.case=F14-vision-demos-carry-no-sothat.md) | the approved vision demos stay as written, no `sothat` added at execution | clean | best-guessed | 85% |
| [F15](./inventory.of=fulcrums.case=F15-test-fixtures-keep-positional-args.md) | the new suites' local test fixtures keep two positional args; the sweep is a dream | clean | best-guessed | 70% |
| [F16](./inventory.of=fulcrums.case=F16-zero-byte-commit-gate-fix-rides-the-cutover.md) | the commit gate's 0-byte meter repair rides the cutover's one commit; its own commit is a dream | clean | best-guessed | 80% |
| [F17](./inventory.of=fulcrums.case=F17-i008-recompositions-deferred.md) | the i008 recompositions (op-in-flight leaf, errexit lint, file split, push probe) defer to the dream | dirty | best-guessed | 85% |
| [F18](./inventory.of=fulcrums.case=F18-assume-unchanged-edits-refuse-or-park.md) | an edit under assume-unchanged / skip-worktree: refuse at preflight (lean) or park it | clean | open — awaits commander | 70% |
| [F19](./inventory.of=fulcrums.case=F19-abort-over-unparked-edits-refuse-or-rescue.md) | abort over an edit no park holds: rescue ref (lean) or refuse | clean | open — awaits commander | 70% |
| [F20](./inventory.of=fulcrums.case=F20-abort-converges-on-rerun.md) | abort converges on a rerun: minimal in this stone (lean), the full recast a dream | clean (a) / dirty (b) | ruled (a) — director | 85% |
| [F21](./inventory.of=fulcrums.case=F21-mechanic-boot-over-its-cap-after-rebase.md) | the mechanic boot over its 30,000 cap after the rebase: cutover to ref (ruled c); still 91 over from the boot lister's auto-listed sub-skills | clean | ruled (c), then commit at 91 over — director; cure upstream | 60% |
