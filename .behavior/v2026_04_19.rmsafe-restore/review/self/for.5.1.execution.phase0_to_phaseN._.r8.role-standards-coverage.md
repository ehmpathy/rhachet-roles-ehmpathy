# self-review: role-standards-coverage (r8)

## final review

complete enumeration of mechanic role standards and coverage verification.

### standard: fail-fast error behavior

spec: commands should exit immediately on error

coverage:
- rmsafe.sh:26 has `set -euo pipefail`
- cp failure exits before rm executes
- no silent failures

why it holds: pipefail ensures any pipeline failure propagates.

### standard: idempotent operations

spec: repeated calls should have same effect

coverage:
- findsert_trash_dir() is idempotent:
  - checks `if [[ ! -d ]]` before mkdir
  - checks `if [[ ! -f ]]` before write gitignore
- cp overwrites extant trash (usecase.4 tested)

why it holds: guard checks before create operations.

### standard: atomic output

spec: output should be complete or absent

coverage:
- all print statements execute in sequence
- no partial output on error (exit happens immediately)

why it holds: fail-fast exits prevent partial output.

### standard: no external state mutation

spec: commands should not modify state outside declared scope

coverage:
- trash dir is within repo (.agent/.cache/...)
- gitignore is within trash dir
- no temp files left behind on failure

why it holds: all mutations scoped to declared trash path.

### standard: snapshot test coverage

spec: output format should have snapshot tests

coverage:
- extant snapshots updated via --resnap
- coconut output captured in snapshot

why it holds: test run with --resnap updated snapshots.

### standard: test isolation

spec: tests should not leave state between runs

examined test code:
- [t0-t1,t3-t4] use runInTempGitRepo which cleans up
- [t2] uses genTempDir with explicit temp dir

why it holds: temp directories isolate test state.

### standard: assertion clarity

spec: assertions should be explicit about expected state

examined assertions:
- all use explicit `.toBe()` not loose equality
- symlink check uses `fs.lstatSync().isSymbolicLink()` specifically
- content checks read file and compare exact value

why it holds: no fuzzy or magic assertions.

### standard: test file imports

examined imports at top of test file:
- fs, path from node
- spawnSync from child_process
- extant test utilities (genTempDir, etc)

no new dependencies introduced.

why it holds: reuses extant test infrastructure.

## conclusion

final standards review complete:
- fail-fast: yes (pipefail)
- idempotent: yes (guard checks)
- atomic output: yes (fail-fast)
- scoped mutations: yes (trash in repo)
- snapshot coverage: yes (resnap run)
- test isolation: yes (temp dirs)
- assertion clarity: yes (explicit comparisons)
- test imports: no new dependencies
