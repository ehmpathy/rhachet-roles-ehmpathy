# howto: run tests with git.repo.test

## .what

use `rhx git.repo.test` to run tests with automatic keyrack unlock, log capture, and summary output.

## .critical

**always run in foreground** — never use `run_in_background: true` for test commands. tests require interactive terminal for spinners and proper exit code handle.

## .commands

| goal | command |
|------|---------|
| run unit tests | `rhx git.repo.test --what unit` |
| run all tests | `rhx git.repo.test --what all` |
| run scoped tests | `rhx git.repo.test --what unit --scope getUserById` |
| update snapshots | `rhx git.repo.test --what unit --resnap` |
| run thorough | `rhx git.repo.test --what unit --thorough` |
| run integration | `rhx git.repo.test --what integration` |
| run acceptance | `rhx git.repo.test --what acceptance` |
| run lint | `rhx git.repo.test --what lint` |
| pass raw jest args | `rhx git.repo.test --what unit -- --verbose` |

## .flags

| flag | description |
|------|-------------|
| `--what` | test type: lint, unit, integration, acceptance, all (required) |
| `--scope` | regex pattern for jest's `--testPathPatterns` (optional) |
| `--resnap` | set `RESNAP=true` to update snapshots (optional) |
| `--thorough` | set `THOROUGH=true` for full test runs (optional) |
| `--` | separator for raw args passed to jest (optional) |

## .auto behaviors

- **keyrack unlock**: integration and acceptance tests auto-unlock `ehmpath/test` credentials
- **log capture**: all output captured to `.log/role=mechanic/skill=git.repo.test/what=${TYPE}/`
- **summary only**: terminal shows summary (stats, log paths), not raw jest output

## .scope is regex

the `--scope` flag uses jest's `--testPathPatterns` which expects regex, not glob:

```sh
# correct: regex pattern
rhx git.repo.test --what unit --scope getUserById
rhx git.repo.test --what unit --scope "customer.*"

# wrong: glob syntax
rhx git.repo.test --what unit --scope "**/getUserById*"
```

## .exit codes

| code | semantics |
|------|-----------|
| 0 | tests passed |
| 1 | malfunction (npm failed, keyrack failed) |
| 2 | constraint (tests failed, no tests matched, absent command) |

## .log locations

logs are namespaced by test type to avoid overlap:

```
.log/role=mechanic/skill=git.repo.test/
├─ what=lint/
│  ├─ 2026-04-08T14-23-01Z.stdout.log
│  └─ 2026-04-08T14-23-01Z.stderr.log
├─ what=unit/
│  └─ ...
├─ what=integration/
│  └─ ...
└─ what=acceptance/
   └─ ...
```

## .example output

### success

```
🐢 cowabunga!

🐚 git.repo.test --what unit
   ├─ status: passed
   ├─ stats
   │  ├─ suites: 3 files
   │  ├─ tests: 12 passed, 0 failed, 0 skipped
   │  └─ time: 2.4s
   └─ log
      ├─ stdout: .log/role=mechanic/skill=git.repo.test/what=unit/2026-04-08T14-23-01Z.stdout.log
      └─ stderr: .log/role=mechanic/skill=git.repo.test/what=unit/2026-04-08T14-23-01Z.stderr.log
```

### failure

```
🐢 bummer dude...

🐚 git.repo.test --what unit
   ├─ status: failed
   ├─ stats
   │  ├─ suites: 1 files
   │  ├─ tests: 3 passed, 1 failed, 0 skipped
   │  └─ time: 1.2s
   ├─ log
   │  ├─ stdout: .log/role=mechanic/skill=git.repo.test/what=unit/2026-04-08T14-23-01Z.stdout.log
   │  └─ stderr: .log/role=mechanic/skill=git.repo.test/what=unit/2026-04-08T14-23-01Z.stderr.log
   └─ tip: Read the log for full test output and failure details
```

## .when to use each type

| type | what it tests | keyrack | typical duration |
|------|---------------|---------|------------------|
| lint | code style, format | no | < 5s |
| unit | pure logic, no i/o | no | < 30s |
| integration | db, apis, services | yes | 1-5 min |
| acceptance | full flows, contracts | yes | 1-10 min |
| all | lint → unit → integration → acceptance | yes | 5-15 min |

## .diagnosis workflow

1. run targeted test: `rhx git.repo.test --what unit --scope getUserById`
2. if fails, read log path from output
3. full jest output in the log file, not terminal
4. fix code, rerun same command
5. run broader tests: `rhx git.repo.test --what unit`
