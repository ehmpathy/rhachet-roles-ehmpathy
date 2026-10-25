# F2 — slot keyed to the skill pid

- **fork:** close the lock descriptor for children (slot frees when the skill dies) · let jest
  inherit it (slot frees only when every orphan worker dies too)
- **taken:** close for children, plus a trap on SIGINT / SIGTERM / SIGHUP that kills the skill's
  own process group. the wish says "a holder whose pid is gone is reaped"; a lock inherited by a
  stray daemon a test spawned would hold a slot forever, the leak the wish forbids
- **the residual:** on SIGKILL (oom, `kill -9`) no trap runs. the slot frees at once while the
  orphaned jest tree may finish its suite: one suite over the bound for that window. raised by
  the experience-coverage reviewer (i003, nitpick.3); named in `case=3` `.note` and the
  inventory's `sigkilled` cell
- **rework:** clean — drop `9>&-` at the call sites to flip to the inherit side
- **confidence:** 75%. the trade is window-of-overload (rare death) vs permanent-leak (rare
  daemon); the director may weigh it differently
- **where:** `case=3`; inventory stage 2; yield edgecases
- **verdict:** upheld — director, 15:01 CT: "F2's brief overrun beats a slot leak for a load bound"
