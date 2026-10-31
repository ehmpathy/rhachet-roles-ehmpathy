# F13: peer skills share code by a source of each other's `*.operations.sh` / `output.sh`

- **the fork**: (a) lift the shared leaves (turtle output, meter gate, conflict-file read, commit
  level) into a new shared module outside any skill, and migrate every consumer onto it; (b) source
  the peer skill's operations file, the extant contract for shared bash in `skills/`
- **taken**: (b). in this repo a skill's `*.operations.sh` and `output.sh` are its published
  surface: `git.release`, `git.repo.get`, and `git.release/output.sh` already source
  `../git.commit/output.sh` and `../git.commit/keyrack.operations.sh`. the operations files are
  "pure at source time: constants + functions", so a source is an import, not a reach into state.
  (a) is a repo-wide move of `git.commit/output.sh` and its consumers, out of this wish's scope.
  one real leak was fixed instead: cutover read the commit domain's bind file by path; that read
  now lives in `git.commit.operations.sh` as `get_commit_level_bind`, beside `infer_level_from_branch`
- **rework**: clean — a later shared module swaps each `source` path; no function name changes
- **confidence**: 80% — the reviewer's rule reads a peer-path source as a reach-in regardless of
  intent; the repo's own precedent reads it as the import mechanism
- **where**: `git.branch.uses.operations.sh` (sources `git.commit`), `git.branch.cutover.operations.sh`
  (sources `git.branch.uses`, `git.branch.rebase`), `git.branch.cutover.sh` (sources `git.commit/output.sh`)
- **verdict**: —
