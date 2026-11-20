# fulcrum F5: the promise skips the visibility read

## .the fork
- (a) always read visibility, then decide
- (b) read visibility only when no promise is given; read it under the skill's own credential

## .taken
(b). with the promise, every visibility answer leads to the same act: write. so the read adds a call and a failure mode for no decision. this keeps git.commit.push's invariant: a keyrack outage never strands a commit, since the promised push makes no extra credential call before `git push`.

the read uses `gh api repos/<owner>/<name>` (`.visibility`: public | private | internal) under the credential the skill writes with. the issue names `gh repo view --json visibility`; both read one field, and `gh api` rides the family's extant communicator (`get_one_gh_resource`).

## .rework
clean: one communicator.

## .confidence
80%. a reviewer may want the read to run with the promise too, for a log line.

## .where
a shared communicator, `get_one_repo_visibility`.

## .verdict
open.
