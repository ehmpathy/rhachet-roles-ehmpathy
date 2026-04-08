# self-review: has-questioned-deletables

## features questioned

### 1. `git.repo.test.operations.sh`

**question**: can this be deleted? inline all operations?

**analysis**: other skills (git.commit, git.release) use operations.sh for shared logic. but git.repo.test is simpler — it runs one npm command and parses output.

**verdict**: could delete. inline operations directly in git.repo.test.sh. simpler is better.

**action**: delete from blueprint, simplify.

### 2. `output.sh`

**question**: can this be deleted? source git.commit/output.sh directly?

**analysis**: the blueprint shows `output.sh` sources git.commit/output.sh and adds `print_test_result`. but print_test_result is just a thin wrapper. could inline it.

**verdict**: could delete. source claude.tools/output.sh directly for turtle vibes. inline any test-specific output.

**action**: delete from blueprint, simplify.

### 3. `--when` flag

**question**: can this be deleted? criteria say behavior is identical with or without it.

**analysis**: wish explicitly mentions `[--when hook.onStop]`. it's a context hint for future use. the flag exists, it just doesn't change behavior.

**verdict**: keep. traced to wish. removal would conflict with wish intent.

### 4. multiple `--what` values (types, unit, integration, format)

**question**: can these be deleted? criteria only test lint.

**analysis**: vision contract shows `--what <lint|types|unit|integration|format>`. but usecases table marks non-lint as "future". criteria only cover lint.

**verdict**: simplify. blueprint should only implement `--what lint` for now. other values can error gracefully with "not yet implemented".

**action**: simplify contract in blueprint to `--what lint`.

## components questioned

### filediff tree simplification

before:
```
├─ [+] git.repo.test.sh
├─ [+] git.repo.test.operations.sh
├─ [+] output.sh
└─ [+] git.repo.test.integration.test.ts
```

after:
```
├─ [+] git.repo.test.sh
└─ [+] git.repo.test.integration.test.ts
```

removed 2 files. simpler.

## issues found and fixed

| issue | action |
|-------|--------|
| unnecessary operations.sh | deleted from blueprint |
| unnecessary output.sh | deleted from blueprint |
| over-designed --what values | simplified to lint only |

## verdict

blueprint can be simplified. will update blueprint to remove unnecessary components.
