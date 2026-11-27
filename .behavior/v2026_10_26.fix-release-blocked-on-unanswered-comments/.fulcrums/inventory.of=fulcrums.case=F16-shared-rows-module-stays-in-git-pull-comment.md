# F16 — the shared rows module stays in `git.pull.comment/`, sourced by git.release

## the fork
- **a.** keep `git.pull.comment/git.pull.comment.rows.sh`; git.release sources it by a peer-skill path (`git.release.operations.sh:17`)
- **b.** move it to a new neutral home (a `shared/` dir under skills) that both skills source

## taken: a, and why at the time
the repo already shares between skills by peer-skill source, with no neutral dir: git.release sources `../git.commit/keyrack.operations.sh` (`git.release.operations.sh:625`) and `../git.commit/output.sh` (`output.sh:21`); git.pull.comment sources `../git.commit/git.commit.operations.sh` (`git.pull.comment.operations.sh:27`); git.repo.get sources `../git.commit/output.sh`. the rows module is the rule of the `git.pull.comment` domain — what waits on an answer — and git.release consumes it, one way. a new `shared/` dir under `skills/` would be a layout no other skill uses, and the build links each dir under `skills/` as a skill namespace.

## rework: clean
one `git mv`, two source lines, one `setupTestEnv` list entry.

## confidence: 75%, and why it is low
a reviewer graded it a blocker under `rule.forbid.scope-leaks`. whether a peer-skill source counts as a reach-in, when the repo's own convention is peer-skill sources, is a call for the council.

## where
`git.release.operations.sh:17`; `git.pull.comment/git.pull.comment.rows.sh`

## verdict
open
