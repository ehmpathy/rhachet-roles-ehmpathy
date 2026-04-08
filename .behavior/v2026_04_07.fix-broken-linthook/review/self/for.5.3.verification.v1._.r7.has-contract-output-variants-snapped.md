# self-review r7: has-contract-output-variants-snapped

## the question

does each public contract have EXHAUSTIVE snapshots? zero gaps in caller experience.

---

## the journey

### r5: initial review

i rationalized absent snapshots for simple error messages. wrong approach.

### r6: found and fixed the gap

added 5 new snapshot tests. ran tests. verified.

### r7: proof of fix

let me verify the fix was applied and tests pass.

---

## proof of fix

### 1. test file changes

added `then('output matches snapshot', ...)` blocks to:

| case | test added |
|------|------------|
| [case3] npm error | yes — snaps stderr |
| [case4] no package.json | yes — snaps stdout |
| [case7] t0 --what omitted | yes — snaps stdout |
| [case7] t1 --what invalid | yes — snaps stdout |
| [case8] not in git repo | yes — snaps stdout |

### 2. test execution

ran `RESNAP=true THOROUGH=true npm run test:integration -- src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts`

result:
```
PASS src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts (10.397 s)
Tests:       32 passed, 32 total
Snapshots:   5 written, 2 passed, 7 total
```

### 3. snapshot file verification

read `__snapshots__/git.repo.test.integration.test.ts.snap`:

| snapshot | content verified |
|----------|------------------|
| [case1] success | `🐢 cowabunga!` + status: passed |
| [case2] failure | `🐢 bummer dude...` + defects: 7 + tip |
| [case3] malfunction | `npm ERR! command not found` |
| [case4] no package.json | `🐢 bummer dude...` + error message |
| [case7] t0 | `🐢 bummer dude...` + --what is required |
| [case7] t1 | `🐢 bummer dude...` + only 'lint' supported |
| [case8] | `🐢 bummer dude...` + not in a git repository |

---

## checklist verification

| requirement | status | evidence |
|-------------|--------|----------|
| positive path (success) snapped | done | [case1] snapshot extant |
| negative path (failure) snapped | done | [case2] snapshot extant |
| help/usage snapped | done | [case7] t0 shows usage |
| edge cases snapped | done | 5 new snapshots added |
| snapshots show actual output | done | verified in snapshot file |

---

## what i learned

the guide says "zero leniency" for a reason.

**before**: i rationalized "simple messages are covered by assertions."

**after**: snapshots provide value assertions do not:
- pr reviewers see exact output without run
- output drift surfaces in snapshot diffs
- visual verification catches format issues

the fix was not optional. the fix was required.

---

## conclusion

all 7 output variants are snapped:

1. success (turtle vibes)
2. failure (turtle vibes + defect count + tip)
3. malfunction (npm error)
4. no package.json (turtle vibes error)
5. --what omitted (turtle vibes error + usage)
6. --what invalid (turtle vibes error)
7. not in git repo (turtle vibes error)

the contract has exhaustive snapshot coverage. proof:
- 32 tests pass
- 7 snapshots extant
- all variants verified in snapshot file

