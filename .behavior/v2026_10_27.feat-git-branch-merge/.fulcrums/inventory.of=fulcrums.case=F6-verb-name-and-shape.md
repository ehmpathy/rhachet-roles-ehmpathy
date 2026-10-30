# F6 — verb `git.branch.catchup` with rebase-twin subcommands

- **fork**: (a) `git.branch.merge` · (b) a name that carries the direction, `git.branch.inherit` · (c) `git.branch.catchup`, with the output that carries how and from what · (d) a `--via merge` flag on `git.branch.rebase` · (e) a single-shot verb, no subcommands
- **taken**: (c), `git.branch.catchup begin|take|lock|continue|abort`, by the director's call (seed S4). the subcommands mirror `git.branch.rebase`, so a clone that knows one knows both
- **why not `merge`**: in this toolset "merge" lands a pr into main — `gh pr merge` sits on the deny list (`init.claude.permissions.jsonc:177`), `git.release.sh:6` says "merge feature branch pr to main". `git.branch.merge` would point the opposite way
- **other names set aside**: `remain` (the eye sees the english "stay" before "re-main"), `repull` / `pullup` / `pullin` / `pullmain` (overlap with git's own `pull` and with `git.branch.rebase`, which runs `git pull origin main --rebase`), `upmain` (looks like "update main", the wrong target), `update` (on the ubiqlang overload list), `sync` / `level` (direction-neutral), `refresh` (vague; already a `lock` subcommand), `absorb` (clashes with the `git absorb` tool), `inherit` (direction-plain, but abstract)
- **the residual ambiguity, and its cure**: `catchup` alone does not say how (a rebase also catches up) or from what (main is implied). the output carries both: `--help` and every plan line say "catch up via merge (no rewrite) from origin/main"
- **rework**: clean now (pre-release); dirty after, since the name hardens in the permissions allowlist, briefs, and clone habits
- **risk**: low. no other verb in the toolset uses `catchup`, so it has no rival sense here. what is left: a clone that knows only the name could expect a rebase. the output names the merge before any mutation (plan is the default), so the clone sees it first
- **confidence**: 85%
- **evidence**: `.agent/repo=.this/role=any/briefs/domain.terms/git.branch.catchup.md`
- **where**: `1.vision.yield.md` Q6
- **verdict**: answered — `git.branch.catchup` (seed S4)
