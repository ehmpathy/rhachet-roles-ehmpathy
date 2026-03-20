# self-review: has-preserved-test-intentions

## review scope

for every test touched:
- what did this test verify before?
- does it still verify the same behavior after?
- did you change what the test asserts, or fix why it failed?

forbidden:
- weaken assertions to make tests pass
- remove test cases that "no longer apply"
- change expected values to match broken output
- delete tests that fail instead of fix code

---

## tests touched

### new file: git.branch.rebase.lock.integration.test.ts

**action:** created new file with 11 test cases

**intention analysis:** not applicable — these are new tests. no prior intentions to preserve.

---

### modified file: git.branch.rebase.take.integration.test.ts

**tests modified:** none of the extant tests were modified.

**tests added:** 3 new test cases (case12, case13, case14) were added.

| case | intention |
|------|-----------|
| case12 | verify suggestion shown when lock file taken |
| case13 | verify suggestion shown once when multiple files taken |
| case14 | verify no suggestion shown for non-lock files |

**verification:** ran git diff on the test file. extant tests (case1-case11) were not touched. only new cases added.

---

### modified file: git.branch.rebase.take.integration.test.ts.snap

**what changed:** case1 snapshot was updated to include the suggestion output.

**was the intention preserved?** yes.

**analysis:**
- **before:** case1 tested that `take --whos theirs pnpm-lock.yaml` settles the file correctly
- **after:** case1 still tests the same behavior, but now the output includes the suggestion

this is an additive change, not a weakened assertion:
- the extant assertions still pass (file is settled)
- new behavior is captured (suggestion is shown)

**the intention holds:** case1 still verifies that `take` settles lock files correctly. the suggestion is bonus output from the new feature. the snapshot adds content; it does not remove or replace prior assertions.

---

## forbidden actions check

| forbidden action | did we do this? |
|------------------|-----------------|
| weaken assertions | no — assertions unchanged |
| remove test cases | no — zero cases removed |
| change expected values to match broken output | no — snapshot update reflects new feature, not broken output |
| delete tests that fail | no — zero tests deleted |

---

## why it holds

1. **no extant test code was modified** — only new tests added
2. **snapshot update is additive** — new output is captured, not removal of extant assertions
3. **the suggestion feature is documented in criteria** — this is intentional behavior, not a bug
4. **extant assertions still pass** — the `take` command still settles files as before

---

## conclusion

| check | result |
|-------|--------|
| extant tests unchanged | ✓ case1-case11 untouched |
| new tests added | ✓ case12-case14 |
| snapshot update valid | ✓ additive, not weakened |
| zero assertions weakened | ✓ verified |
| zero tests removed | ✓ verified |

all test intentions preserved.

