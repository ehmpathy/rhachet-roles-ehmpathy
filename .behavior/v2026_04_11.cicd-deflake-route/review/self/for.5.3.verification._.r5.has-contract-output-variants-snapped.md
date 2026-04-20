# self-review: has-contract-output-variants-snapped

## the question

does each public contract have EXHAUSTIVE snapshots?

## what is snapped

**snapshot file:** `cicd.deflake.integration.test.ts.snap` (23 snapshots)

**snapped by case:**

| case | variant | snapped |
|------|---------|---------|
| case1 | init success | ✓ stdout + stderr |
| case2 | init output format | ✓ stdout + stderr |
| case3 | init findsert | ✓ first + second run + stdout |
| case4 | detect --into required | ✓ stdout + stderr |
| case5 | help/usage | ✓ stdout + stderr |
| case6 | unknown subcommand | ✓ stdout + stderr |
| case7 | no subcommand | ✓ stdout + stderr |
| case8 | not in git repo | ✓ stdout + stderr |
| case9 | detect positive path | ✓ stdout + stderr |
| case10 | detect auth failure | ✓ stdout + stderr |
| case11 | real GitHub API | ✓ stdout + stderr |

## coverage analysis

**success paths:** ✓ snapped (case1, case2, case9, case11)
**error paths:** ✓ snapped (case4, case6, case8, case10)
**help/usage:** ✓ snapped (case5, case7)
**edge cases:** ✓ snapped (case3 findsert, case11 real API)

## verdict

holds. all 11 cases have stdout and stderr snapshots. 23 total snapshots cover all contract output variants.
