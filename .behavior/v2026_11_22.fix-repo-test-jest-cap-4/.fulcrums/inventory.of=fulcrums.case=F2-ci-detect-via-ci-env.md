# F2: detect ci via the `CI` env var

## .the fork
- **a.** ci ⟺ `CI` set and not `false`
- **b.** also check provider vars (`GITHUB_ACTIONS`, `BUILD_ID`, `BUILDKITE`, …), as the `ci-info` package does
- **c.** a positive grove signal (hostname, a marker file) instead of a ci signal

## .taken
**a.** github actions sets `CI=true`, and this repo's ci runs on github actions (`.github/workflows/.test.yml`, `runs-on: ubuntu-24.04`). this grove has `CI` and `GITHUB_ACTIONS` both empty. `CI=false` counts as shared, which matches `ci-info` 4.3.1 (`index.js:38`: `env.CI !== 'false'`). the skill's own tests already read `process.env.CI` as the ci signal (`git.repo.test.play.integration.test.ts:2316`). a default of "shared" fails toward the cap: a box the check misses runs slower, never starves a neighbor.

## .rework
clean. one predicate.

## .confidence
90%. a ci provider that omits `CI` would get the cap; none is in use.

## .where
`git.repo.test.sh`, a new `is_ci_box` check.

## .verdict
awaits wisher review.
