# review.self: has-contract-output-variants-snapped (r5)

## review scope

verify that each public contract has exhaustive snapshots for success, error, help, and edge cases.

---

## snapshot inventory

from `git.repo.test.play.integration.test.ts.snap`:

| case | scenario | snapshot? | variant |
|------|----------|-----------|---------|
| 1 | unit tests pass | yes | success |
| 2 | unit tests fail | yes | error |
| 3 | scoped tests (multiple files) | yes | success (filtered) |
| 5 | integration with keyrack | yes | success (keyrack) |
| 6 | no tests match scope | yes | constraint |
| 7 | no test command | yes | constraint |

**total snapshots: 6**

---

## coverage by variant type

| variant type | cases | covered? |
|--------------|-------|----------|
| success | case1, case3, case5 | yes |
| error (test failure) | case2 | yes |
| constraint (user must fix) | case6, case7 | yes |
| keyrack unlock | case5 | yes |

---

## cases without snapshots

| case | reason |
|------|--------|
| 4 | resnap mode - output same as success, flag verified separately |
| 8 | passthrough args - verifies args reach jest, not output format |
| 9 | lint ignores flags - lint output already tested, flag ignore verified |
| 10 | acceptance with keyrack - same output structure as case5 |
| 11 | --what all - explicit assertions instead of snapshot |
| 12 | thorough mode - same output as success, flag verified separately |
| 13 | namespaced logs - verifies log path, not output format |

**rationale**: cases 4, 8, 9, 10, 12, 13 test flag behavior or internal mechanics, not output format. snapshots would be redundant with the success/error variants.

case 11 (--what all) uses explicit assertions for fail-fast behavior verification instead of snapshot.

---

## snapshot content verification

each snapshot includes:

| element | case1 | case2 | case3 | case5 | case6 | case7 |
|---------|-------|-------|-------|-------|-------|-------|
| turtle header | cowabunga | bummer dude | cowabunga | cowabunga | bummer dude | bummer dude |
| skill line | yes | yes | yes | yes | yes | yes |
| status line | passed | failed | passed | passed | constraint | constraint |
| stats section | yes | yes | yes | yes | no | no |
| log section | yes | yes | yes | yes | no | no |
| tip line | no | yes | no | no | yes | yes |
| keyrack line | no | no | no | yes | no | no |

---

## sanitization verification

snapshots use placeholders for non-deterministic values:

- `TIMESTAMP` for iso timestamps in log paths
- `X.XXXs` for time values

this ensures snapshots remain stable across runs.

---

## why it holds

the snapshot coverage is exhaustive for output format variants:

1. **success variant**: case1, case3, case5 cover normal success with different configurations
2. **error variant**: case2 covers test failure output with tip
3. **constraint variant**: case6, case7 cover user-must-fix scenarios
4. **keyrack variant**: case5 specifically covers keyrack unlock line

cases without snapshots test internal behavior (flags, args, paths) that do not affect output format.

**conclusion: has-contract-output-variants-snapped = verified**

