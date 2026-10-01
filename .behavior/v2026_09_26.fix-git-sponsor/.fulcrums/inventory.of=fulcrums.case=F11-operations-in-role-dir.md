# F11 — the git identity reader lands in `git.commit.operations.sh`, under the role dir

- fork: extend the extant operations file · move the git.commit operations out of the role dir first
- raised by: peer `repo-rules` round 2, blocker.1 (`rule.forbid.logic-in-role-dirs`)
- taken: extend the extant file. `git.commit.operations.sh` and `keyrack.operations.sh` already
  lived at `src/domain.roles/mechanic/skills/git.commit/` before this change, and every skill in the
  family sources them by `$SCRIPT_DIR` — a path the built role dir ships to consumers. the new
  reader belongs beside `read_sponsor_state`, its twin; a new home for one function would split one
  vocabulary across two dirs.
- why not move now: the move relocates both files, rewires every `source` line in seven skills, and
  must keep them reachable from the built `dist/domain.roles/…/skills/` tree the role links at
  runtime. that is a repo-structure change the wish did not ask for, and it ripples.
- the defect is real and recorded: `.dream/v2026_09_27.fix.git-commit-operations-out-of-role-dir.md`
- rework: dirty (seven skills, the dist layout, and the `$SCRIPT_DIR` source contract)
- confidence: 80%
- where: `git.commit.operations.sh`
- verdict: ruled by wisher, 2026-09-27 — A: "leave as is for now". the move rides its own change,
  per the dream.
