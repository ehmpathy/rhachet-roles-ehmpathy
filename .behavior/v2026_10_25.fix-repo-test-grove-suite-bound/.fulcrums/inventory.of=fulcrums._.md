# inventory of fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | default bound = `max(1, cores ÷ 6)` | clean | ✅ settled — director, 14:05 CT (guess upheld) | — |
| F2 | slot keyed to the skill pid; trap kills the jest tree on INT/TERM/HUP; SIGKILL leaves a one-suite overload window | clean | ✅ settled — director, 15:01 CT (upheld: a brief overrun beats a slot leak) | — |
| F3 | every scoped run (any type) without `--thorough` bypasses | clean | best-guessed | 70% |
| F4 | no `flock` → run unbounded with a loud line | clean | best-guessed | 75% |
| F5 | override via env `GIT_REPO_TEST_SLOTS` only (no flag); branch `grove` | clean | best-guessed | 75% |
| F6 | stale-holder hint at 30m; the waiter never kills | clean | best-guessed | 80% |
| F7 | one pool per machine (`/run/lock/rhachet/git.repo.test/`) | clean | ✅ settled — director, 14:05 CT (guess overruled: was per user home) | — |
| F8 | dispute EC i004 blocker.1: reviewer read a conversation line as target content | clean | ✅ settled — director, 15:01 CT (upheld on the cited lines) | — |
