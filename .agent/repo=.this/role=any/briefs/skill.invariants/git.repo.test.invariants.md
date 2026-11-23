# git.repo.test invariants

## scope + zero tests = constraint error

any `--scope` pattern that matches zero tests is a domain invariant constraint error (exit 2).

### .why

- no one willingly goes through the effort to `--scope` target tests that don't exist
- zero tests matched indicates: typo in pattern, tests were deleted, or wrong file/name scope
- silent pass with zero tests creates false confidence

### .rule

| scenario | behavior |
|----------|----------|
| `--scope path://foo` matches 0 files | exit 2, constraint |
| `--scope name://bar` matches 0 tests | exit 2, constraint |
| no `--scope` + `--changedSince` finds 0 files | exit 0, success (normal) |
| `--scope` with a non-jest kind (`--what types`, `format`, `lint`) | the scope does not apply; the kind runs whole, the tree says `├─ scope: skipped; <type> runs whole (only unit, integration, acceptance take a scope)`, and no jest scope flag reaches tsc or biome. `--what all --scope X` scopes only its jest suites |

### .best practice: stack path + name for fastest feedback

1. start narrow: `--scope path://myfeature --scope name://case3`
2. widen path: `--scope path://myfeature` (all tests in file)
3. widen name: `--scope name://case3` (all files, one test)
4. full suite: (no `--scope`) only to verify no regressions

## jest workers: capped at 4 on a shared box

on any box without ci (a laptop or grove: `CI` unset or `false`), jest runs at most 4 workers. the skill lowers jest's own count to 4; it never raises it.

### .why

- many crews run suites on one box at once. an uncapped suite takes every core and starves its neighbors
- jest reads a cli `--maxWorkers` before the config, so a flat cap would raise a low config. some integration configs set `maxWorkers: 1` because their suites share a database; they must stay serial

### .rule

| scenario | jest receives from the skill |
|----------|------------------------------|
| shared box, jest's own count > 4 | `--maxWorkers=4` |
| shared box, jest's own count ≤ 4 | naught |
| shared box, count unknown (`--showConfig` fails) | naught |
| shared box, both `jest.<type>.config.js` and `.ts` present | naught, and no lookup: the run may use either config |
| shared box, `--showConfig` succeeds but yields no integer | naught, plus a `💥 MalfunctionError: worker cap skipped …` note on both streams (a `├─ workers:` branch on stdout, the line on stderr); the run continues |
| ci (`CI` set and not `false`) | naught, and no lookup |
| caller passed `--maxWorkers`, `-w`, `--runInBand`, or `-i` after `--` | naught; the caller's flag stands alone |
| the npm command's jest segment carries a worker flag (e.g. `test:acceptance` with `--runInBand`) | naught, and no lookup. flags of other tools chained in the command (`tsc -i && jest …`) do not count |
| a multi-mode run with a worker flag after `--` (`--what types,unit -- --maxWorkers=8`) | a non-jest child drops the jest worker flags; the jest child keeps them. a single `--what types -- …` passes through as is |
| the `--showConfig` lookup runs past its bound | naught, plus a `💥 MalfunctionError: worker cap skipped; … lookup timed out …` note on both streams |
| `--what types`, `format`, `lint` | naught |

"jest's own count" = `jest -c <config> --showConfig` → `globalConfig.maxWorkers`, where `<config>` is the one the npm command's jest segment names (`-c X` / `--config X`), else `jest.<type>.config.js`, else `.ts`. the lookup costs one config load (~1–2s on a `.ts` config). it runs before the timed run, bounded by the smaller of `--timeout` and 30s; a lookup that times out reads as unknown.

### .the residual guess

the skill reads the npm command's text, never runs it (it may run a build first, e.g. `test:acceptance:locally`). so one guess remains: an npm command that sets env which changes the config's count. if that env makes the config serial while the lookup (without that env) derives above 4, the cap could raise it. no ehmpathy repo does this today; pass `-- --maxWorkers=N` (or `--runInBand`) there to opt out.

### .override

pass a count through: `rhx git.repo.test --what unit --mode apply -- --maxWorkers=16`
