# F17 — the lease stays in the watch file, under its current names

## .the fork

peer i008 r011 item 2:

- extract `git.release._.hold_automerge_lease.sh` (hold, settle, disarm, check, verdict), so the
  two emitters no longer write to the pr; rename by effect (`disarm_automerge_lease` for the
  write, `settle_automerge_lease` for the local clear); pick one of "guard" and "gate"
- keep the lease beside the watch loop that polls it, under `hold` / `drop` / `_release`

## .taken

keep, this round. the order defect the same item names is repaired: the lease is settled only after
a verified disarm, or when naught is armed, so a failed disarm leaves the exit trap as the retry.
the move and the renames change no verdict and no output. they belong in one pass with the F12
recomposition (`arm_merge_of_reviewed_pr` / `arm_merge_of_release_pr`), which takes `@unpinned` and
return 4 out of the renderers too, rather than a second churn of the same functions.

## .rework

clean. a file move, a `source` line in `git.release.sh`, three renames by sedreplace.

## .confidence

80%. the reviewer's names read better; `drop` vs `release` is a real near-synonym pair.

## .where

`git.release._.emit_transport_watch.sh` (`hold_automerge_lease`, `drop_automerge_lease`,
`_release_automerge_lease`, `_check_automerge_lease`, `_check_automerge_lease_verdict`)

## .verdict

awaits the commander.
