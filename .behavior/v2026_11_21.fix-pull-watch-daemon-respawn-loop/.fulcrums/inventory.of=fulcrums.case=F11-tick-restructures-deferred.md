# F11 — the daemon tick's restructures wait for their own change

## .the fork

a peer reviewer proposed four structural changes to the daemon:

1. extract the tick's per-pr read into `run_watch_pr_read`, which returns a verdict (`read-ok`, `gone`, `dark`, `held`, `backoff`), so the loop becomes a dispatch
2. write a watch's end and its note as one atomic record write (`.ended` plus `.endedNote`, the drain builds the entry), so a mark that misses its lock cannot re-queue a note the drain already sent
3. a box-level token recheck gate, so a box-wide token gap does not bump each pr's quiet count
4. remove the unprimed override, if the race it covers proves too narrow to matter

a second reviewer added two more of the same grain:

5. `get` names the token the daemon holds (`token: seaturtle | grove | none`) and since when
6. a fork-budget clamp on the steal and the SessionStart hook, so the births the wish counts are measured, not inferred
7. hold the root-key memo across ticks, and cut the forks of `as_watch_key_of_record`
8. let `del_watch_records_at_root` serve the steal's gone-root reap, so the two share one path
9. store the end reason once (`dark` as `.ended`), render it in one place, and pass the token label rather than its enum
10. let the SessionStart hook name an older-key record it cannot read
11. cut a fresh token read across N repo roots to one read per distinct keyrack
12. snap the production-scale texts and the lapse log lines; check live whether a renamed repo answers 404

## .taken, and why

defer all twelve, caught as one dream with their shapes. each rewrites a seam that every pull-watch suite leans on (the tick's rc ladder, the outbox contract, the cadence files, the prime path). none fixes a defect this wish names. the safe parts already landed here: the 404 branch holds its gap, the end note is deduped while held, and a token read fresh in a tick earns no second read.

## .rework

clean for this change: each restructure lands later behind the same suites.

## .confidence

85%. the residue: restructure 2 closes a duplicate-note window (mark misses its lock, the same tick's drain sends the note, the next tick queues it again). that window needs a lock timeout on one record, and the gap the 404 branch now holds spaces the retries out.

## .where

`git.pull.watch.daemon.sh` (`run_watch_tick`, `set_watch_records_of_pr_ended`), `git.pull.watch.operations.sh` (cadence)

## .verdict

open
