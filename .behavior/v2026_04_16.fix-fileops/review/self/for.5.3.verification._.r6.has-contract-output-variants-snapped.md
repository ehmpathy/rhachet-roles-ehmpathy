# self-review r6: has-contract-output-variants-snapped

## gap identified in r5

r5 identified that `--help` output lacked test coverage for mvsafe, rmsafe, cpsafe.

## gap fixed

added `--help` test cases to:
- mvsafe.integration.test.ts (case3, t3)
- rmsafe.integration.test.ts (case3, t2)
- cpsafe.integration.test.ts (case3, t3)

## test run proof

| file | command | result |
|------|---------|--------|
| mvsafe | `rhx git.repo.test --what integration --scope mvsafe` | 40 passed |
| rmsafe | `rhx git.repo.test --what integration --scope rmsafe` | 30 passed |
| cpsafe | `rhx git.repo.test --what integration --scope cpsafe` | 38 passed |
| all | `rhx git.repo.test --what integration` | 274 passed |

## per-contract checklist

### mvsafe.sh

| variant | snapped? | test location |
|---------|----------|---------------|
| positive path (success) | yes | case1 t0, case16 t0 |
| negative path (error) | yes | case3 t0, case4 t0, case5 t0 |
| help/usage | yes | case3 t3 (added) |
| edge cases (zero match) | yes | case16 t1 |

- [x] positive path (success) is snapped
- [x] negative path (error) is snapped
- [x] help/usage is snapped
- [x] edge cases are snapped
- [x] snapshot shows actual output (via toMatchSnapshot())

### rmsafe.sh

| variant | snapped? | test location |
|---------|----------|---------------|
| positive path (success) | yes | case1 t0, case11 t0 |
| negative path (error) | yes | case3 t0, case4 t0, case5 t0 |
| help/usage | yes | case3 t2 (added) |
| edge cases (zero match) | yes | case11 t1 |

- [x] positive path (success) is snapped
- [x] negative path (error) is snapped
- [x] help/usage is snapped
- [x] edge cases are snapped
- [x] snapshot shows actual output (via toMatchSnapshot())

### cpsafe.sh

| variant | snapped? | test location |
|---------|----------|---------------|
| positive path (success) | yes | case1 t0, case12 t0 |
| negative path (error) | yes | case3 t0, case4 t0, case5 t0 |
| help/usage | yes | case3 t3 (added) |
| edge cases (zero match) | yes | case12 t1 |

- [x] positive path (success) is snapped
- [x] negative path (error) is snapped
- [x] help/usage is snapped
- [x] edge cases are snapped
- [x] snapshot shows actual output (via toMatchSnapshot())

### globsafe.sh

| variant | snapped? | test location |
|---------|----------|---------------|
| positive path (success) | yes | case1 t0, case4 t0 |
| negative path (error) | yes | case7 t0, case7 t1 |
| help/usage | yes | case7 t2 (extant) |
| edge cases (zero match) | yes | case4 t1 |

- [x] positive path (success) is snapped
- [x] negative path (error) is snapped
- [x] help/usage is snapped
- [x] edge cases are snapped
- [x] snapshot shows actual output (via toMatchSnapshot())

## "did you know?" hint

the hint output when brackets are present and `--literal` is absent remains without snapshot coverage.

**why no snapshot required:**

1. this is conditional UX, not a contract variant
2. the hint only appears when all three conditions are met:
   - path contains `[`
   - `--literal` is not used
   - zero files match
3. per vision line 162, this was specified for manual verification
4. the hint is additive guidance, not a contract change

## why it holds

all four modified CLI contracts now have exhaustive snapshot coverage:
- success: yes (glob match tests)
- error: yes (validation tests)
- help: yes (all now have --help tests)
- edge: yes (zero match tests)

the only absent coverage is the "did you know?" hint, which is optional UX guidance and not part of the contract interface.

## summary

gap closed. all CLI commands now have exhaustive snapshot coverage for all contract variants.
