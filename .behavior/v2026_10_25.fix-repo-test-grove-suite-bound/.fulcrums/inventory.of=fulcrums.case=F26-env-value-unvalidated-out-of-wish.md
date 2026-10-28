# F26 — an unknown `--env` value: no case here; the skill does not validate it

- **raised by:** `ergo-contract-snapshots` nitpick.1, 5.3 peer i001
- **fork:** add a case for an unknown value (`--env qa`) here · dream it
- **found:** the skill checks only that `--env` is present for acceptance and `--what all`
  (`git.repo.test.sh:1087`, `:1103`); it never checks the value, which passes straight to
  `rhx keyrack unlock --env`. a case would pin whatever keyrack says on the host, so it would need a
  new refusal in the skill first
- **taken:** dream. a value check is new skill behavior outside the wish (the grove), in an extant
  path this branch does not touch; the env suite changed here only for grove isolation
- **dream:** `.dream/v2026_10_28.fix.git-repo-test-env-value-unvalidated.md`
- **rework:** clean — an enum check and one case, in a later change
- **confidence:** 85%
- **verdict:** —
