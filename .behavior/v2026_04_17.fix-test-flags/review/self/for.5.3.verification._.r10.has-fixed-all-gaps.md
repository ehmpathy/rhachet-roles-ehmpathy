# self-review r10: has-fixed-all-gaps

## gaps found and fixed

### gap 1: changedSince used wrong branch
**found in:** user feedback
**issue:** `--changedSince=main` compared to local main, not remote
**fix:** changed to `--changedSince=origin/main` in package.json
**proof:** unit tests now show 0 files (correct)

### gap 2: exit 2 for no tests without scope
**found in:** user feedback
**issue:** when changedSince finds 0 files, exit 2 (constraint) was wrong
**fix:** changed to exit 0 (success) with helpful message
**proof:** case14 test verifies exit 0

### gap 3: no test coverage for new behavior
**found in:** user feedback
**issue:** new "no tests without scope" behavior lacked test
**fix:** added case14 with snapshot
**proof:** 64 tests pass, snapshot exists

### gap 4: output_no_tests lacked has_scope parameter
**found in:** test run
**issue:** line 930 called `output_no_tests "true"` without has_scope
**fix:** changed to `output_no_tests "true" "true"`
**proof:** scope constraint now shows correct message

## gaps NOT deferred

| gap type | deferred? | evidence |
|----------|-----------|----------|
| absent test | no | case14 added |
| absent prod | no | output_no_tests updated |
| failed test | no | all 64 pass |
| skipped test | no | grep found none |

## final checklist

- [x] all reviews above addressed (no TODOs)
- [x] all tests pass
- [x] all gaps fixed (not noted)
- [x] no coverage marked incomplete

## summary

all gaps found were fixed immediately. zero deferrals. ready for peer review.
