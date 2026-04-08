# self-review r4: has-questioned-assumptions

## fresh eyes review

paused and re-examined the blueprint for assumptions I might have missed.

### 7. log directory path structure

**assumption**: `.log/role=mechanic/skill=git.repo.test/` is the correct path.

**question**: why this specific structure? is it consistent with other skills? what if we just use `.log/git.repo.test/`?

**investigation**: the vision specifies this exact path. the structure follows a pattern of `role={role}/skill={skill}` which allows organization by role. this is forward-compatible if other roles need log directories.

**verdict**: assumption is valid. path structure is intentional and forward-compatible.

### 8. npm vs pnpm to run lint

**assumption**: the skill uses `npm run test:lint`.

**question**: the fix hook uses `pnpm run --if-present fix`. should lint also use pnpm?

**investigation**:
- the wish explicitly says `npm run test:lint`
- ehmpathy repos have both npm and pnpm available
- `npm run` works even in pnpm repos via scripts in package.json
- the key is what package.json scripts define, not which package manager runs them

**verdict**: assumption is valid. `npm run test:lint` works in all ehmpathy repos regardless of package manager.

### 9. stderr handle on success

**assumption**: skill stderr is empty, npm output goes to log file.

**question**: what if npm emits warnings to stderr even on success?

**investigation**:
- the skill captures npm stdout AND stderr to separate log files
- the skill itself emits empty stderr
- npm stderr goes to the log file, not skill stderr
- this is the correct behavior — raw output captured, summary emitted

**verdict**: assumption is valid. clear separation between skill output and npm output.

### 10. single test file for all usecases

**assumption**: one integration test file covers all 6 usecases.

**question**: should we have multiple test files? is one file too large?

**investigation**:
- 6 usecases, each with setup + assertion
- similar pattern to teesafe.integration.test.ts which tests multiple usecases in one file
- test patterns research shows single file per skill is standard

**verdict**: assumption is valid. consistent with codebase test structure.

## summary of r3 + r4 assumptions

| # | assumption | evidence | verdict |
|---|------------|----------|---------|
| 1 | npm run test:lint | wish, vision | valid |
| 2 | defect count parseable | eslint output format | valid |
| 3 | isotime filesystem-safe | vision format spec | valid |
| 4 | .gitignore self-ignore | teesafe research | valid |
| 5 | 60s timeout | reasonable default | valid |
| 6 | exit code 2 = constraint | codebase convention | valid |
| 7 | log path structure | vision specification | valid |
| 8 | npm works in pnpm repos | package.json abstraction | valid |
| 9 | stderr separation | log file capture design | valid |
| 10 | single test file | test pattern research | valid |

## verdict

10 assumptions surfaced and questioned. all trace to evidence or codebase convention. no hidden technical assumptions found.
