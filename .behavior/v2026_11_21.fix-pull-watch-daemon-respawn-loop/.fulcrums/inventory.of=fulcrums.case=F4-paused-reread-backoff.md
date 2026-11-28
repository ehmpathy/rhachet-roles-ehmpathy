# F4 · a paused daemon re-reads keyrack on the extant poll gap

- fork: (a) re-read each tick while paused, as today · (b) a new backoff with its own mark file, snapped back by a mark that `set` drops · (c) re-read only on a due tick, and count a paused tick as a quiet read of each due pr, so the extant gap doubles and the extant cadence reset in `set` snaps it back
- taken: (c). it reaches the cost goal of (b) with no new state and no new tie between `set` and the daemon. the cap is the extant `WATCH_POLL_MAX_SECONDS` (30 min)
- rework: clean
- confidence: 75%. why low: a human who unlocks keyrack with no push waits up to 30 min for the resume. a push, which is the common next move, resumes at the next tick
- where: the pause branches of `run_watch_tick`; `set_watch_pr_cadence` (a paused tick advances `poll.quiet` and `poll.next` but not `poll.changed`)
- verdict: open. the self review on has-questioned-requirements moved this from (b) to (c)
