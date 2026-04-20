# self-review r7: has-thorough-test-coverage

third pass. deep examination of each coverage category.

---

## layer coverage analysis

### rmsafe.sh — contract layer

**required:** integration + acceptance tests
**declared:** integration tests
**acceptance:** snapshots serve as acceptance (contract stdout captured)

**verification:**
- integration tests exercise the CLI contract
- snapshots capture stdout/stderr for each scenario
- snapshot comparison = acceptance criteria

**verdict:** holds — snapshots are the acceptance tests

### output.sh — utility layer

**required:** unit tests for pure functions
**declared:** tested via integration

**verification:**
- print_coconut_hint() is a pure formatter
- it has no branches or logic beyond echo
- integration tests exercise it via rmsafe output

**verdict:** holds — trivial formatter, unit test would duplicate integration

### ensure_trash_dir() — internal function

**required:** covered by caller tests
**declared:** tested via rmsafe integration

**verification:**
- function creates dir + gitignore
- integration tests verify dir extant after rm
- integration tests verify .gitignore extant

**verdict:** holds — fully covered by integration assertions

---

## case coverage analysis

| case type | declared | verification |
|-----------|----------|--------------|
| positive | file, dir, symlink | [t0], [t1], [t3] |
| negative | path not found, outside repo | extant tests unchanged |
| happy path | delete → trash → coconut | [t0] |
| edge cases | duplicate, crickets | [t2], [t4] |

**verdict:** holds — all case types covered

### why negative cases hold

the blueprint says "extant error paths unchanged" because:
1. error handle code is [○] (no modification)
2. extant tests already cover error paths
3. new trash logic only runs on success paths
4. error paths exit before trash mkdir

---

## snapshot coverage analysis

| scenario | purpose | change type |
|----------|---------|-------------|
| single file delete | turtle + coconut | update extant |
| directory delete | turtle + coconut | update extant |
| glob delete | turtle + coconut | update extant |
| crickets | no coconut | unchanged |
| error paths | error message | unchanged |

**verification:**
- success snapshots update to include coconut section
- error snapshots unchanged (error exits before coconut)
- crickets snapshot unchanged (no coconut when zero files)

**verdict:** holds — snapshot strategy is correct

---

## test tree analysis

**new test cases declared:**
- [case12] trash feature with 5 sub-cases
- modification to [case1] for trash assertion

**extant cases unchanged:**
- error paths (path not found, outside repo)
- crickets path (zero matches)
- dir without -r error

**verdict:** holds — test tree shows changes only, extant tests implied

---

## found issues

none — all coverage is thorough and appropriate in scope.

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| acceptance tests | snapshots serve as acceptance |
| output.sh unit tests | trivial formatter, integration sufficient |
| error path tests | extant tests unchanged |
| error snapshots | unchanged (error before coconut) |
| negative cases | extant coverage, new code on success path only |

---

## conclusion

test coverage is thorough:
- layer coverage appropriate (integration + snapshots as acceptance)
- case coverage complete (positive, negative, happy, edge)
- snapshot strategy correct (update success, unchanged error)
- test tree shows changes, implies extant unchanged
