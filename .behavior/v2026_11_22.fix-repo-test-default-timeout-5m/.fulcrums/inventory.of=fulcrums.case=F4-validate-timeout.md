# F4: `--timeout` must be a positive integer, checked at parse

- fork: pass the raw value to `timeout` (extant), or validate first
- taken: validate. a bad value today reaches `timeout`, exits 125, and reads as a test failure. a units suffix (`5m`) is refused too: one shape, seconds, matches the help text
- rework: clean. one guard block
- confidence: 92%
- where: `git.repo.test.sh:620-623`
- verdict: open
