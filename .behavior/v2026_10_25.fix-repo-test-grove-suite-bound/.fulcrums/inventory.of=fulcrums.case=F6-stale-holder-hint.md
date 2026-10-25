# F6 — the stale-holder hint

- **fork:** no hint (wait forever, silent on cause) · hint past a threshold, print `kill <pid>` ·
  auto-kill a holder past a threshold · let the waiter give up past a threshold
- **taken:** hint at 30m with `kill <pid>`; never kill, never give up. the wish forbids a fail
  for the wait. an auto-kill could destroy a slow but sound suite in another tree — a destructive
  act no caller asked for (`rule.require.safe-by-default`)
- **rework:** clean — one threshold, one heartbeat line
- **confidence:** 80%. ci run 40122579335 (green): integration shards 47–143s (~12.6 job-min in
  sum), longest acceptance shard ~5m. 30m ≈ 2.4× the longest sound suite. a false alarm costs
  one line, since the hint never acts. other repos' suites may run longer; unmeasured
- **where:** `case=2` `[t3]`; yield `.the contract`
- **verdict:** awaited
