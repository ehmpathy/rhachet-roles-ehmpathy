# F9 — the idle-restart clamp keeps its fixed waits

## .the fork

`health [case3c]` proves that a second `set` restarts a dark watch's idle clock. it sets the watch, waits 6s, sets again, waits 7s, and asserts the watch still stands (ttl 10s). two reviewers asked to replace the fixed waits with a poll on observable state, or a stubbed clock, for fear of a flake under load.

## .taken, and why

keep the fixed waits. the race can only widen the margin, never close it:

- `set` clears the idle clock before it returns (`git.pull.watch.set.sh:184`, `del_watch_pr_cadence`)
- the daemon stamps a fresh `poll.changed` only if absent, at its next faulted read (`set_watch_pr_cadence_faulted`)
- a slow tick stamps it later, so the deadline moves later. it sits at no earlier than second set + 10s; the assertion reads at second set + 7s

a poll on `poll.changed` would assert an internal file rather than the contract (the watch stands), and a stubbed clock would need a clock seam the daemon does not have. the test states the reason at the wait.

## .rework

clean: one test case, no caller and no contract.

## .confidence

92%. the one residue: a box so stalled that the jest wait itself overshoots by 3s+ past the second deadline would still pass [t0] (it reads early) but could shift [t1]'s timeout, which has 60s of slack.

## .where

`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.health.integration.test.ts`, `[case3c]`

## .verdict

open
