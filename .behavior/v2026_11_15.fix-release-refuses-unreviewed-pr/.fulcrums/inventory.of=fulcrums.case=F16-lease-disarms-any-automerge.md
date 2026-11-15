# F16 — the gate and the lease disarm any automerge on the pr, not only the clone's

## .the fork

peer i007 r011 item 4: a human who arms automerge in the ui before their own review loses it when
a clone's apply is refused or exits red.

- disarm only an automerge the clone armed (`autoMergeRequest.enabledBy.login` equals the clone's
  identity); treat a foreign armer as a refusal reason
- disarm any automerge armed on the pr

## .taken

any. an armed automerge on a pr with no human approval merges on green with no review: that is
the hole the wish closes, whoever armed it. the armer's login does not mark a clone either: under
`--auth as-human` the clone acts through the human's own gh login, so `enabledBy` names the human.
the refusal says it disarmed, and a human re-arms with one click.

## .rework

clean. read `enabledBy`, skip the disarm on a foreign armer, add a refusal cause and a case.

## .confidence

85%. `enabledBy` is unverified against the live api (F13 asks for a live run).

## .where

`git.release._.guard_pr_has_human_approval.sh` (disable on refusal, F5);
`git.release._.emit_transport_watch.sh` (`_release_automerge_lease`, the exit trap)

## .verdict

awaits the commander.
