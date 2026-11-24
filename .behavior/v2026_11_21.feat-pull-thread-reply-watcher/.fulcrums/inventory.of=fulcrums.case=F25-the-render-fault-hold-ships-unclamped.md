# F25 · the hold on an alert render fault ships unclamped, with its clamp caught as a dream

## .the fork
- (a) ship the two-line guard (a render that faults holds the cursors, so the next tick tries again) now; clamp it later via a jq fault seam
- (b) build the fault seam in this pr and clamp the guard before it ships

## .taken
(a). every fault path in the renderer is jq over data the daemon built itself, so no realistic input trips it; a clamp needs a jq shim on the scene's PATH, which every suite shares. that ripples past this diff. the guard reads plainly, and its failure mode without it (a task dropped for good) is the one it names.

## .the counter-argument, stated fairly
an unclamped guard is a guard anyone can delete with every suite green. the snapshot-coverage lane names exactly that.

## .where
- `git.pull.watch.daemon.sh`, the tick's alert step: `text="$(as_watch_alert_text …)" || { log_watch "alert render failed …"; return 0; }`
- dream: `.dream/v2026_11_22.test.clamp-the-alert-render-fault-hold.md`

## .rework
clean. the seam and the case are additive.

## .confidence
80%. the guard is small and plain; the clamp's cost sits in shared test infra.

## .verdict
open — for the council.
