# self-review: has-preserved-test-intentions (r3)

## tests touched in this change

from `git status`:
- `M rmsafe.integration.test.ts` - test file modified
- `M rmsafe.integration.test.ts.snap` - snapshot updated

## what I changed vs what I preserved

### tests I ADDED (new)

[case13] trash feature (lines 597-719):
- t0: single file deleted → file extant in trash
- t1: directory deleted → structure preserved in trash
- t2: same file deleted twice → overwrite behavior
- t3: symlink deleted → symlink preserved, not target
- t4: glob matches zero → no coconut hint

these are net-new tests. no prior test intention to preserve.

### tests I DID NOT TOUCH

examined git diff for extant test cases:

| case | lines | touched? | why |
|------|-------|----------|-----|
| [case1] positional args | 64-100 | no | no diff in these lines |
| [case2] named args | 102-126 | no | no diff in these lines |
| [case3] argument validation | 128-175 | no | no diff in these lines |
| [case4] target validation | 177-232 | no | no diff in these lines |
| [case5] safety boundary | 234-298 | no | no diff in these lines |
| [case6-case12] | 300-595 | no | no diff in these lines |

all extant tests untouched. their assertions verify the same behaviors they always did.

### snapshot changes

the snapshot file was updated via `--resnap` to capture:
- new [case13] test output
- coconut hint section in output

the extant test snapshots are unchanged because their output is unchanged.

## forbidden patterns checked

| pattern | found? |
|---------|--------|
| weakened assertions | no |
| removed test cases | no |
| changed expected values | no |
| deleted tests that fail | no |

## why test intentions are preserved

I only added new tests. I did not modify any extant test assertions.
the new tests verify new behaviors (trash feature) that did not exist before.
extant tests continue to verify the same behaviors they always did.

## conclusion

test intentions preserved. no extant test modified.
