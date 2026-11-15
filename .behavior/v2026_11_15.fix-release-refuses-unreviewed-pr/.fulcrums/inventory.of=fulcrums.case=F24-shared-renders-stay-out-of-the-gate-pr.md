# F24 — two shared renders stay out of this pr: the timeout order, and an approval line on a green apply

## .the fork

- **A (taken)**: leave two shared renders as they are; the second is caught as a dream
  - the timeout tree keeps `└─ ⏰ timeout after Xs` as its last branch, so the lease's disable line
    sits above it (case12 t4)
  - a successful `--apply` prints no line that the gate passed, nor on whose approval (`.dream/v2026_11_15.followup.git-release-apply-names-the-approval.md`)
- **B**: in this pr, move the timeout above the disable line with a new final branch, and add an
  `👌 approved by @<login> on <sha>` line to every green apply tree

## .taken, why

- each change touches a render shared beyond the gate. the timeout render is in every p5 and p6
  timeout snap. the approval line lands on every approved merge in p1, p2, p3 and p9
- the wish is the refusal; neither change bears on whether an unreviewed pr can merge
- both reviewers graded them `[nitpick][better]` with no harm named
- in case12 t4 both lines already name their cause, so the reader meets the reason in the same tree

## .rework

dirty: each change resnaps suites the gate does not own, and the approval line needs the verdict's
login and sha threaded from the gate to the status render

## .confidence

80%: the approval line has real audit value after an incident like sdk-aws-lambda#79; the commander
may want it in this pr

## .where

`output.sh` (`print_watch_result timeout`), `git.release._.emit_transport_watch.sh` (timeout branch),
`git.release._.guard_pr_has_human_approval.sh` → `git.release._.emit_transport_status.sh` (approval line)

## .verdict

awaits the commander
