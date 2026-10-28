# F9 — no `setsid`: give the child its own group via job control

- **fork:** keep a fallback for hosts with no `setsid` · or require `setsid` and drop the
  fallback (mac apply runs then fail `command not found`)
- **taken:** keep the fallback, and make it whole. `setsid` is util-linux; stock macOS lacks it,
  and F4 already assumes mac hosts run this skill. the fallback launches under `set -m`, so the
  child leads its own process group; `stop_test_child` aims at that group, so a sigterm or sighup
  takes the whole tree down, grandchildren included
- **cost of the take:** none left on the stop path. the grove itself is moot on a host with no
  `flock` (F4), so a mac host is bound only when it has util-linux `flock`
- **evidence:** clamp `[case7] [t0]` in `git.repo.test.grove.integration.test.ts` runs the skill
  under a PATH with every tool but `setsid`; it asserts the fake suite's grandchild dies on
  sigterm. red with `set -m` removed (grandchild survives), green with it
- **where:** `git.repo.test.sh` `run_test_child` (the `set -m` branch) and `stop_test_child`
  (group-or-pid aim)
- **rework:** clean — one branch in one function
- **confidence:** 90%. low part: no wisher word on mac support; inferred from F4's premise
- **found:** self review has-pruned-backcompat, 5.1.execution; made whole after peer i001
  (arch-hazards-behavior blocker.1, behavior-intent-coverage blocker.3)
- **verdict:** —
