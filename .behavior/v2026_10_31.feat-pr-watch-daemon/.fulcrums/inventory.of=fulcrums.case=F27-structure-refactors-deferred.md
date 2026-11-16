# F27 — structure refactors of the watch skill: now, or a followup

## .the fork

the l3 arch review (5.1 i004 r011) names four structure moves. none fixes a defect a test can show:

- split `git.pull.watch.operations.sh` (~950 lines, nine nouns) into one file per noun, with one `WATCH_DAEMON_FILES` manifest that drives the code hash, the bin copy, and the daemon's sources (nitpick.1)
- finish the layout accessors: `as_watch_daemon_file` for the `daemon.*` names, and one record reader that emits a row (nitpick.2)
- carry queued alerts inside the watch record, so one atomic write commits alert and cursors; the outbox dir, its stem parse, and the repeat window go (nitpick.3, design half)
- one tick epilogue in place of five `set_watch_outbox_drained; return 0`, and named return codes (nitpick.4)

- (a) do them in this route
- (b) defer each to a caught dream; ship the behavior with its clamps

## .taken, why

(b).

- each move rewires the files every suite reads; the review cost lands on a stone already at its third review level
- the defects these shapes invite were each fixed at their cause this round, with a clamp: deletes run under the lock with the judged life id; every rhachet call runs through `run_watch_rhachet`; the reap is serialized
- the record-held outbox changes the on-disk layout. no install holds it yet, so the rework stays clean until this ships; the dream says to decide it before the live-delivery tier

## .rework

clean: no caller outside the skill reads these internals, and no install holds the layout.

## .confidence

80%. the split would make the next change cheaper; whether that pays before ship is a judgment.

## .where

dreams: `dreams/v2026_11_01.refactor.pr-watch-operations-by-noun.md` · `dreams/v2026_11_01.refactor.pr-watch-alerts-inside-the-record.md`. raised as r011 nitpick.1–4 (5.1 i004).
