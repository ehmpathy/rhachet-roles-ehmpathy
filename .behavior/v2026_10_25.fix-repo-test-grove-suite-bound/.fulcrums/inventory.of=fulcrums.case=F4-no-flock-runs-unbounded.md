# F4 — host without `flock`

- **fork:** run unbounded with a loud `grove: unbounded — flock absent` line · refuse with
  `ConstraintError` · a pure-bash `mkdir` lock fallback
- **taken:** unbounded + loud line. a grove is linux with util-linux; a mac laptop has no grove
  load to bound, and a refusal there blocks all tests for no harm averted. a `mkdir` fallback
  cannot free on SIGKILL, so it would reintroduce the leak
- **rework:** clean — one branch
- **confidence:** 75%
- **where:** inventory stage 4; yield `.the contract`
- **verdict:** awaited
