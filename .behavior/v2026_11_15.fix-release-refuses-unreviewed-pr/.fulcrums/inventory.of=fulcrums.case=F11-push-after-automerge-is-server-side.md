# F11 — the apply watch holds an automerge lease; what outlives the watch is closed server-side

## .the fork

peer i005 r010 item 1, i006 r011 item 1: github keeps automerge armed across a write-access push,
so an approval of head A can still let an unreviewed head B merge. the merge pin
(`--match-head-commit`) covers only the moment automerge is armed.

- a lease in the skill: arm only while the apply watch holds the pr; compare the head each poll;
  disarm on drift and on every exit short of a merge
- the server alone: the org ruleset with "require approval" and "dismiss stale approvals"
  (dream `v2026_11_15.reseed.org-ruleset-requires-human-approval.md`)

## .taken

both. the lease ships: `_check_automerge_lease` compares the head each poll and refuses on drift;
`_release_automerge_lease` disarms on checks red, rebase needed, and timeout. watch-only and plan
stay read-free (F10): the lease runs only for the feature pr in apply mode. clamp p9 case12, red
with the lease removed in dist.

the lease is bound to the process, not to a list of exits (i007 r011 item 1): once the gate
approves, an EXIT/INT/TERM/HUP trap disarms any automerge still armed on the unmerged pr. a gh
error, a ctrl-c, a SIGTERM, and an exit before the watch all disarm. clamp p9 case13.

the lease holds the verdict, not only the head (i008 r011 item 1): each poll re-runs the gate's
judge on fresh reviews, so a CHANGES_REQUESTED or a dismissed approval posted mid-watch on the same
head disarms and refuses. clamp p9 case14.

the bound is one poll interval (5–15s). what that window and the process cannot cover stays with
the server: a repo with no required checks can merge a push inside the window, SIGKILL cannot be
trapped, and a push from a terminal that never runs git.release is out of the skill's reach. the
ruleset closes all three.

## .rework

clean. drop the lease and its case12, or extend it to the release pr.

## .cost

a reviewed pr whose ci runs past the 15-minute watch now ends disarmed; a re-run of `--apply`
re-gates the head and re-arms. before, it merged on its own once green.

## .confidence

80%. the cost above is the commander's call.

## .where

`git.release._.emit_transport_watch.sh` (`hold_automerge_lease`, `_on_exit_release_automerge_lease`,
`_check_automerge_lease`, `_release_automerge_lease`);
`git.release.sh` passes the gated head to the feature watch; `1.vision.experience.case=_.md` E23

## .verdict

awaits the commander.
