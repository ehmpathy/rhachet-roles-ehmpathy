# F5 — the override surface and its names

- **fork:** env var alone · `--slots` flag alone · both (flag beats env). names: env
  `GIT_REPO_TEST_SLOTS` / `RHX_TEST_SLOTS`; branch label `grove` / `slots` / `bound`
- **taken:** env var alone, `GIT_REPO_TEST_SLOTS`, branch `grove`. the wish asks "an env var or
  flag"; the env var reaches every shell and every `--what all` child with no passthrough code,
  so a flag adds a second path for the same act. discoverability holds via `--help` and the
  `bound` line, which names the var as its source. the var names the skill it governs; `grove`
  is the crew's word for the shared box
- **rework:** clean — a flag can be added later with no break
- **confidence:** 75%. a one-off flag is handier for a single run; `VAR=n rhx …` serves the same
- **where:** yield `.the contract`; case=5
- **verdict:** awaited
