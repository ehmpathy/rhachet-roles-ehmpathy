# F8 — where the quota meter's shared fix contract lives

## .the fork
`git.commit.director.sh` is sourced by git.commit.set, git.commit.push, git.branch.rebase begin,
and git.release. two lanes call the rebase and release imports a cross-skill reach-in.

- (A) keep it in `skills/git.commit/`, declared as the published contract of the git.commit.uses
  meter, which git.commit owns
- (B) move it to a shared home every consumer reaches without a path into a peer skill's dir

## .taken, why
A, with the declaration now in the file header. the quota is git.commit's own meter:
`.meter/git.commit.uses.jsonc`, written by `git.commit.uses`. rebase and release already read that
meter file and already source `git.commit/output.sh` (rebase `:27`) to render its refusals. the fix
for the meter's refusal belongs to the meter's owner; a consumer that sources it consumes the
owner's contract, not an internal. there is no non-skill home for shared bash in this repo: any
file under `skills/` is listed as a skill, and a role dir holds no `domain.operations` for bash.

## .rework
clean: a file move plus four `source` lines and one test path. no behavior change.

## .risk
low: the dependency exists on main (meter file, output.sh); this pr adds one more file on the same
edge.

## .confidence
70%: the reviewers' rule, read literally, forbids any path into a peer skill's dir; the
owner-contract view is a judgment.

## .verdict
open — for the council.
