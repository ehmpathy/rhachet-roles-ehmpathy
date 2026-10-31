# F37 — each result counts what its step knows; continue names left-out files before it commits

- **fork**: peer `enroll-verif-snapshot-blemishes` (5.3 i008) flags (1) begin's result shows `behind: N → 0` while continue's shows `files: N merged`, and the meter leaf `left: 3` carries no unit; (2) continue `[case47]` prints its left-out-files notice above the success result. (a) one count and a unit on each; the notice below the result; (b) keep both
- **taken**: (b).
  - (1) begin counts the commits it merged, read before the merge. continue runs after the conflict stop, where the human cares which files the commit carries, settled and clean alike. each count names its noun (`behind`, `files … merged`). the meter leaf sits under `meter`, the noun every `git.commit` render uses for commit uses (`left: 3`); a unit here alone would split it from `git.commit.set`
  - (2) the notice prints before the commit on purpose: a commit gate that refuses after the restage must not hide which files left the stage. its fix leaf is now paste-ready (`printf '<message>' | rhx git.commit.set -m @stdin`)
- **rework**: clean. a copy edit in `continue.sh` and `print_catchup_committed`, plus their snaps
- **risk**: low. both renders state true facts in the order a refusal can interrupt
- **confidence**: 80%
- **where**: `git.branch.catchup.continue.sh` (left-out-files notice, result), `git.branch.catchup.operations.sh` `print_catchup_committed`
- **verdict**: taken by the driver: copy, an execution fork (seed S7)
