# F23 — the prior boot.yml `describe.skip` is fixed in this route

- **fork**: (a) unskip the boot.yml CLI block here, with a self-contained `.agent` fixture · (b)
  defer it to a dream
- **taken**: (a). stone 5.3 demands prior skips be fixed. the fix proved small and safe: one test
  file. each case boots from a temp dir whose `.agent` tree links to `src/domain.roles/mechanic`,
  so no repo-level `.agent` link (absent in CI) is needed. rhachet's boot stats format still
  matches `parseStats`. the extra lines in a #895 diff are the cost
- **proof**: `rhx git.repo.test --what integration --mode apply --scope 'path://src/domain.roles/mechanic/boot.yml'`
  → 15 passed, 0 skipped. the token-compare case asserts `ref = 0` for the dir with no boot.yml,
  so boot reads the temp tree, not the repo's own `.agent`
- **rework**: clean — to split it into its own pr moves one test file
- **confidence**: 85%
- **where**: 5.3 zero-skip scan, `boot.yml.integration.test.ts:48` (skip from `424afa7`, #279)
- **verdict**: —
