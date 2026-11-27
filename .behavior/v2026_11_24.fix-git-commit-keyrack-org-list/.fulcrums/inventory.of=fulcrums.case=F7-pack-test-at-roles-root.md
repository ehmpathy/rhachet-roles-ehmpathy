# F7 — where the pack-modes clamp lives

## .fork
`package.modes.integration.test.ts` grades the published tarball, a whole-package concern, not one role's spec.
- (a) `src/domain.roles/` root, beside `boot.budget.integration.test.ts`, the extant whole-roles-package test
- (b) a new repo-level test home outside `src/domain.roles/`

## .taken
(a). the pack ships `dist/domain.roles/**`, so the roles tree is what the clamp grades, and the repo already keeps its cross-role package test (`boot.budget`) at that root. (b) invents a test home no other test uses.

## .prerequisites
the clamp needs a built `dist/`. CI's test job runs `npm run build` (`.github/workflows/.test.yml`, step `build`) before `prepare:rhachet` and the integration shards. in this repo `prepare:rhachet` links `.agent/repo=ehmpathy/**` as symlinks into `dist/`, and `dist/` files keep 0775 after the link, so the clamp grades the built modes. absent `dist/` → the test throws a `ConstraintError` with a `npm run build` hint, never a silent pass.

## .rework
clean. one file move, no import change.

## .confidence 80%
`rule.forbid.logic-in-role-dirs` reserves role dirs for role specs. the roles ROOT is not a role dir, and holds one such test already, but a reader may draw the line there too.

## .verdict
best-guessed
