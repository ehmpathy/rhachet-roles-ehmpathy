# F1: cap as an upper bound

## .the fork
- **a.** pass a flat `--maxWorkers=4` on every shared-box jest run (the literal read of the wish)
- **b.** ask jest what count it would use (`jest -c <config> --showConfig` → `globalConfig.maxWorkers`); pass `--maxWorkers=4` only when that count is above 4

## .taken
**b.** jest reads a cli `--maxWorkers` before the config (`jest-config` 30.2.0, `getMaxWorkers`, line 789). a flat flag therefore raises any config below 4. the ehmpathy survey (66 repos, 198 jest configs) finds two `maxWorkers: 1` integration configs (`declastruct-squarespace`, `sql-schema-control`); a flat 4 would run their serial suites 4-wide. small boxes regress too: 4 cores at `'50%'` = 2 workers today, 4 under a flat cap.

a failed lookup → add naught. the lookup can fail while the run still works (no `node_modules/.bin/jest`, but the npm command finds jest elsewhere); then the count is unknown and could be 1. a lost cap costs a neighbor some cpu; a raised serial config costs flaky failures.

## .rework
clean. one branch in one function; the tests flip one expectation per case.

## .confidence
85% on the shape; 70% that the lookup should stay uncached.

measured in execution (this repo, `.ts` config, one-file unit scope via `rhx git.repo.test`, whole-second clock): lookup skipped (`-- --maxWorkers=18`) → 1s, 0s; lookup on → 2s, 2s. so the lookup costs ~1–2s per shared-box jest run. that crosses the ~1s bar the vision set for a revisit. re-weighed: 1–2s per run vs a raised serial config (flaky db suites). kept the exact lookup; a cache keyed on config content + core count is caught as a followup (`dreams/v2026_11_22.followup.cache-jest-worker-lookup.md`), since env-driven configs (`rhachet-roles-bhrain`: `ACCEPTANCE_WORKERS`) make the cache key subtle.

## .where
`git.repo.test.sh` → `run_single_test`, where `jest_args` is built.

## .verdict
awaits wisher review.
