# self-review r5: has-contract-output-variants-snapped

## the question

does each public contract have EXHAUSTIVE snapshots? zero gaps in caller experience.

---

## contract identification

the behavior adds one public contract:

| contract | type | command |
|----------|------|---------|
| git.repo.test | cli skill | `rhx git.repo.test --what lint` |

---

## output variants analysis

### all possible output variants

| variant | exit code | stdout pattern | when |
|---------|-----------|----------------|------|
| success | 0 | turtle success summary | lint passes |
| failure | 2 | turtle failure summary + defect count + tip | lint fails |
| malfunction | 1 | error message | npm errors |
| no package.json | 2 | constraint message | no package.json |
| --what absent | 2 | constraint message | arg validation |
| --what invalid | 2 | constraint message | arg validation |
| not in git repo | 2 | constraint message | wrong context |

### snapshots present

the snapshot file contains **7 snapshots**:

| snapshot | variant | content |
|----------|---------|---------|
| [case1] success | lint passes | turtle header, status: passed, log path |
| [case2] failure | lint fails | turtle header, status: failed, defects, log path, tip |
| [case3] malfunction | npm error | raw npm error output |
| [case4] no package.json | constraint | turtle header, error message, explanation |
| [case7] --what absent | constraint | turtle header, error message, usage hint |
| [case7] --what invalid | constraint | turtle header, error message |
| [case8] not in git repo | constraint | turtle header, error message |

---

## gap analysis: are all variants snapped?

| variant | snapped? | snapshot key |
|---------|----------|--------------|
| success | yes | [case1] |
| failure | yes | [case2] |
| malfunction | yes | [case3] |
| no package.json | yes | [case4] |
| --what absent | yes | [case7] t0 |
| --what invalid | yes | [case7] t1 |
| not in git repo | yes | [case8] |

**all 7 variants are snapped.** zero gaps.

---

## snapshot content verification

verified by read of snapshot file:

| snapshot | shows |
|----------|-------|
| [case1] success | turtle header + status: passed + log path |
| [case2] failure | turtle header + status: failed + defects: 7 + log path + tip |
| [case3] malfunction | raw npm error output |
| [case4] no package.json | turtle header + error + explanation |
| [case7] --what absent | turtle header + error + usage hint |
| [case7] --what invalid | turtle header + error |
| [case8] not in git repo | turtle header + error |

each snapshot shows actual output, not placeholders. isotime values are sanitized for determinism.

---

## conclusion

| check | result |
|-------|--------|
| positive path snapped? | yes — [case1] |
| negative path snapped? | yes — [case2] |
| help/usage snapped? | n/a — skill has no --help flag |
| edge cases snapped? | yes — [case3,4,7,8] |
| actual output shown? | yes — verified |

**all 7 output variants are snapped.** exhaustive coverage of caller experience.

---

## checklist

- [x] positive path (success) is snapped — [case1]
- [x] negative path (failure) is snapped — [case2]
- [x] help/usage is snapped — n/a (skill has no --help)
- [x] edge cases are snapped — [case3,4,7,8]
- [x] snapshots show actual output — verified

