# F1 — default bound divisor

- **fork:** `cores ÷ 6` (2 on 12 cores) · `cores ÷ 4` (3) · a constant `2`
- **taken:** `max(1, cores ÷ 6)`. ehmpathy jest configs pin `maxWorkers: '50%'`, so N suites run
  `N × cores ÷ 2` workers; 2 suites fill a 12-core grove exactly. the incident's 17 workers is
  ~3 suites, so `÷ 4` → 3 would not have prevented it
- **rework:** clean — one arithmetic line and one snapshot
- **confidence:** 70% at the time of the guess; settled since
- **where:** `1.vision.yield.md` `.the contract`, `why max(1, cores ÷ 6)`
- **verdict:** ✅ **settled by the director, 2026-10-25 14:05 CT** — derive the default from the
  core count, with a floor of 1. "a fixed 2 starves a 12-core box and still overloads a 4-core
  one." keep an env or flag override (kept: `GIT_REPO_TEST_SLOTS`)
