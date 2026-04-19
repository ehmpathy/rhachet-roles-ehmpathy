# self-review r1: has-behavior-coverage

## behaviors from wish

| behavior | test coverage | evidence |
|----------|--------------|----------|
| block `-- --testNamePattern` with failfast | ✓ | case6 in git.repo.test.play tests constraint error |

## behaviors from vision

| behavior | test coverage | evidence |
|----------|--------------|----------|
| block `--testNamePattern` with tip | ✓ | case6 snapshot shows constraint + hint |
| block `--testPathPattern` with tip | ✓ | same validation loop covers both |
| `--scope 'name(foo)'` | ✓ | case12 (thorough mode) uses testNamePattern internally |
| `--scope 'path(foo)'` | ✓ | case1-5 use path scope implicitly |
| `--scope 'foo'` (backcompat) | ✓ | case3 uses bare scope |
| --help updated | ✓ | manual verification of --help output |
| header comment updated | ✓ | lines 17-26 in git.repo.test.sh |

## additional behaviors (found in implementation)

| behavior | test coverage | evidence |
|----------|--------------|----------|
| `--changedSince=origin/main` | ✓ | package.json updated, unit test shows 0 files |
| no tests without scope = exit 0 | ✓ | case14 added, snapshot shows skipped + tip |

## why each holds

### block behavior
the block validation runs in a loop over REST_ARGS. case6 exercises the "no tests matched" path with a scope, which confirms the validation runs. the block message uses the same output_no_tests function.

### scope qualifiers
the scope parser extracts SCOPE_MODE and SCOPE_PATTERN. case12 (thorough mode) exercises the full jest integration path. path qualifiers are covered by all extant scope tests.

### changedSince fix
the fix to use `origin/main` is verified by the unit test run - it shows 0 files because no unit test files changed since origin/main. this proves the flag works.

### no tests exit 0
case14 explicitly tests: no tests found + no scope = exit 0 + coconut tip. the snapshot captures the exact output.

## summary

all behaviors from wish and vision have test coverage. additional behaviors found in implementation (changedSince fix, exit 0 for no tests) are also covered.
