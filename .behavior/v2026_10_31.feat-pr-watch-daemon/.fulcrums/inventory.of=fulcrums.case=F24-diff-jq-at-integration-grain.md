# F24 — the event diff (`WATCH_DIFF_JQ`): a unit test of its own, or its branches at the integration grain

## .the fork

`WATCH_DIFF_JQ` is a pure jq program inside `git.pull.watch.daemon.sh`. it turns a watch, its cursors, the github state, and the ledger into events, new cursors, and `prEnd`.

- (a) lift it to a file of its own and unit-test it with fixture states
- (b) keep it inline, and prove each branch through the daemon integration suites, where the real tick feeds it

## .taken, why

(b). each branch the reviewer named has its own integration clamp, fed by the real tick:

- own-id suppression: events case2 t1 (the clone's own comment is never alerted; an empty ledger reads `[]`, per the ledger defect clamp)
- head-sha reset of seen check runs: events case1 t3
- closure detection: lifecycle case10 t1 (merged, closed-without-merge + `by:`)
- the first tick primes, alerts naught: events case1 t0, case2 t0
- bot vs clone label: events case2 t2, t3
- approval with ci passed, failed, in progress, none: events case3 t0–t3
- burst: events case2 t4

to lift it, the daemon would need a second source shape (a `.jq` file). the bin copy and the code hash cover only `*.sh`, so the copy, the hash, and their clamps (case5b, case12c, case12d) would all change for a seam that is already pinned.

## .rework

clean: move the string to `git.pull.watch.diff.jq` and widen the copy + hash glob, then add a caselist test. no caller changes.

## .confidence

85%. the integration clamps pin every branch, but a failure there costs a daemon tick to read, not a jq diff.

## .where

`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.daemon.sh:89-190`. raised as r008 nitpick.1 (5.1 i001).
