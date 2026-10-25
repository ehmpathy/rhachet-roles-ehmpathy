# F9 — no `setsid`: launch without a new session

- **fork:** keep a fallback that launches npm plainly when `setsid` is absent · or require
  `setsid` and drop the fallback (mac apply runs then fail `command not found`)
- **taken:** keep the fallback. `setsid` is util-linux; stock macOS lacks it, and F4 already
  assumes mac hosts run this skill. a removal regresses a host that works today
- **cost of the take:** on such a host the child stays in the parent's process group. a terminal
  ctrl-c still reaches every jest worker via the tty; a SIGTERM or SIGHUP aimed at the parent pid
  reaches npm alone, and jest workers may run on until their suite ends. the grove itself is moot
  there (no `flock` either, per F4)
- **where:** `git.repo.test.sh` `run_single_test` (the `command -v setsid` branch) and
  `stop_test_child` (the `|| kill -TERM <pid>` fallback)
- **rework:** clean — delete one branch and one `||`; no caller or contract depends on it
- **confidence:** 80%. low part: no wisher word on mac support; inferred from F4's premise
- **found:** self review has-pruned-backcompat, 5.1.execution
- **verdict:** —
