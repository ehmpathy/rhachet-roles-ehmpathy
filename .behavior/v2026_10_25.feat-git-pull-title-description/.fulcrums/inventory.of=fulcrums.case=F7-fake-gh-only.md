# F7 — fake gh only; no real-api test

- fork: A. a real-api case against github · B. fake gh only in this pull
- taken: B. #1143's real-api case runs by hand and ci excludes it (no write scope in a test job);
  a pull-body write on a live pull per run would also notify its watchers
- rework: clean. a hand-run real case beside #1143's is one new test file
- confidence: 80%. the stub's PATCH shape is asserted, but not proven against github here
- where: `git.pull.title/`, `git.pull.description/` integration tests
- verdict: open, for the pr review
