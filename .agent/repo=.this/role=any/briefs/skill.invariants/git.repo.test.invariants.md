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

### .best practice: stack path + name for fastest feedback

1. start narrow: `--scope path://myfeature --scope name://case3`
2. widen path: `--scope path://myfeature` (all tests in file)
3. widen name: `--scope name://case3` (all files, one test)
4. full suite: (no `--scope`) only to verify no regressions
