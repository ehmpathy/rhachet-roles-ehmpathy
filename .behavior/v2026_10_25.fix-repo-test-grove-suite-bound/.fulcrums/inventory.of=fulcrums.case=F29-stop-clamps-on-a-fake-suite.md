# F29 — the stop clamps run a fake suite with a real grandchild, not real jest

- **raised by:** `enroll-verif-snapshot-coverage` nitpick.1, 5.3 peer i004
- **fork:** add a stop test that runs real jest workers under `npm run` · keep the fake suite, whose
  work runs in a real grandchild process
- **taken:** keep. a group stop cares about one shape: a child that forks work the stop must reach.
  the fake `npm` forks a real `sleep` grandchild, and each stop clamp asserts that grandchild is
  gone. real jest adds worker count and start delays, which make a test slow and flaky and prove no
  more about the group signal. the real-jest stop is exercised by hand on each ctrl-c of a dogfood
  run
- **rework:** clean — one added case, if wanted
- **confidence:** 85%
- **verdict:** —
