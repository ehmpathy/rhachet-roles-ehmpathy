# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| [F1](./inventory.of=fulcrums.case=F1-cap-as-upper-bound.md) | cap = min(4, jest's own count), not a flat `--maxWorkers=4` | clean | open — best-guessed | 85% |
| [F2](./inventory.of=fulcrums.case=F2-ci-detect-via-ci-env.md) | ci = `CI` set and not `false`; no other signal | clean | open — best-guessed | 90% |
| [F3](./inventory.of=fulcrums.case=F3-no-stdout-line.md) | no new stdout line; the cap shows in `--help` only | clean | open — best-guessed | 75% |
| [F4](./inventory.of=fulcrums.case=F4-ci-means-config-count.md) | on ci "every core" = no skill flag; the repo config governs | clean | open — best-guessed | 80% |
| [F5](./inventory.of=fulcrums.case=F5-explicit-count-via-passthrough.md) | the caller's count rides `-- --maxWorkers=N`; no new skill flag | clean | open — best-guessed | 80% |
| [F6](./inventory.of=fulcrums.case=F6-out-of-scope-worktree-changes.md) | pre-route `.husky`/`package.json` changes are out of scope; disputed, not edited | clean | open — best-guessed | 90% |
| [F7](./inventory.of=fulcrums.case=F7-match-the-file-style.md) | new code matches the file's extant style (positional bash args, one-fixture tests) | clean | open — best-guessed | 80% |
| [F8](./inventory.of=fulcrums.case=F8-note-header-class.md) | the worker-cap note keeps the `💥 MalfunctionError:` header though the run exits 0 | clean | open — best-guessed | 70% |
| [F9](./inventory.of=fulcrums.case=F9-timeout-tree-shape-unchanged.md) | the timeout tree keeps its two extant `status` rows; the redesign is a dream | clean | open — best-guessed | 85% |
| [F10](./inventory.of=fulcrums.case=F10-skill-tests-at-integration-grain.md) | the cap is proven at integration grain; no new acceptance suite | clean | open — best-guessed | 85% |
| [F11](./inventory.of=fulcrums.case=F11-tool-records-left-out-of-commit.md) | the route's tool-written records (`.reviews` givens, `.route/`) stay out of the commit; the drifted hook forbids their log stamps | clean | open — best-guessed | 70% |
| [F12](./inventory.of=fulcrums.case=F12-fault-note-where-decided.md) | the lookup-fault `workers` branch prints where the cap is decided, before `status` | clean | open — best-guessed | 75% |
| [F13](./inventory.of=fulcrums.case=F13-real-jest-cases-assert-not-snap.md) | the real-jest cases assert resolved counts; the run tree is snapped on the fake-npm cases | clean | open — best-guessed | 80% |
| [F14](./inventory.of=fulcrums.case=F14-stat-line-mask-per-suite.md) | the `suites:` stat line keeps each suite's extant mask; the `1 files` grammar joins the tree dream | clean | open — best-guessed | 80% |
| [F15](./inventory.of=fulcrums.case=F15-husky-practice-rides-the-commit.md) | the worktree's husky practice upgrade rides this commit; its lock refuses any commit without it | clean | open — best-guessed | 80% |
