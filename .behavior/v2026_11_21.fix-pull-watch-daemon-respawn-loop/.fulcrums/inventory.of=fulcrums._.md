# inventory.of=fulcrums — fix-pull-watch-daemon-respawn-loop

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | a held token outlives keyrack's unlock | clean | ruled (S1): hold until github refuses it | — |
| F2 | a 404 ends the watch at its first read | clean | best-guessed: first read | 85% |
| F3 | a watch with no good read starts its idle clock at setAt | clean | best-guessed: setAt, same 1w ttl | 80% |
| F4 | a paused daemon re-reads keyrack on the extant poll gap | clean | best-guessed: reuse the cadence, cap 30 min | 75% |
| F5 | the steal takes an ended older-key record with its end mark, rather than delete it | clean | best-guessed: take it, so its held note still goes | 85% |
| F6 | the per-tick clone list read stays out of scope | clean | best-guessed: out; caught as a dream | 80% |
| F7 | files this work did not author, left in the worktree, are out of this change | clean | best-guessed: leave them, stage only this route's files | 90% |
| F8 | the pr-watch skill's extant bash conventions stand in this change | clean | best-guessed: keep positional args, `sets:` globals, the extant test-utils import | 85% |
| F9 | the idle-restart clamp keeps its fixed waits | clean | best-guessed: keep them; the race can only widen the margin | 92% |
| F10 | a 404 to the grove token ends the watch, after one fresh token read | clean | best-guessed: end, as the wish reads; the fresh read makes the rewatch cure work | 80% |
| F11 | the daemon tick's restructures wait for their own change | clean | best-guessed: defer, caught as a dream | 85% |
| F12 | the pr opens at the route's end, not at the execution stone | clean | best-guessed: at the end, per the commit rule | 95% |
| F13 | the case=8 journey test lands at 5.3 verification | clean | best-guessed: at 5.3, the stage that owes each critipath its test | 90% |
| F14 | the idle note for a fault that began after the last change waits for its own change | clean | best-guessed: defer, caught as a dream | 85% |
