# F6 — one `git.pull.operations.sh`, which sources #1143's ops rather than a copy

- fork: A. one ops file for title + description, copied from #1143's shapes · B. wait for #1143
  to merge, then source its ops
- the lean was A, for one reason: B deadlocked while #1143 sat unmerged. #1143 has since merged
  (this branch holds it, rebased at eff2da5), so that reason no longer stands
- taken: A's shape (one ops file for title + description), with B's reuse: the file sources
  `git.pull.comment.operations.sh` for repo, auth, pull lookup, refusals, and the hash, and adds
  only the pull-field reads and writes. a ~960-line copy of a merged file would be the debt A's
  follow-up existed to repay
- the ops file sits in the neutral `skills/git.pull/` dir, so neither title nor description
  reaches into the other's folder (i002 r5 blocker.1). the one edge left, into
  `git.pull.comment.operations.sh`, is the shared-ops reuse this fulcrum takes: that file already
  holds the family's fence, auth, lookup, and refusals, and #1143 owns its name
- rework: clean. a copy, or a rename of the comment ops to a shared name in `skills/git.pull/`,
  are each one move
- confidence: 85%. this departs from the literal lean; the reason is recorded here
- where: `src/domain.roles/mechanic/skills/git.pull/git.pull.operations.sh`
- verdict: open, for the pr review
