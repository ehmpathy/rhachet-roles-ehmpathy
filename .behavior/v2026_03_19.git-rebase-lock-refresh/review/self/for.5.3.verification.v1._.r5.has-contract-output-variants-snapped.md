# self-review: has-contract-output-variants-snapped

## review scope

for each new or modified public contract:
- is there a dedicated snapshot file?
- does the snapshot capture what the caller would actually see?
- does it exercise the success case?
- does it exercise error cases?
- does it exercise edge cases and variants?

---

## public contracts in scope

this feature introduces one new CLI contract:

| contract | description |
|----------|-------------|
| `rhx git.branch.rebase lock refresh` | regenerate lock file mid-rebase |

and modifies one extant CLI contract:

| contract | modification |
|----------|--------------|
| `rhx git.branch.rebase take` | adds suggestion output for lock files |

---

## snapshot coverage analysis

### contract: lock refresh

**snapshot file:** `git.branch.rebase.lock.integration.test.ts.snap`

**variants covered:**

| variant | test case | snapshot? |
|---------|-----------|-----------|
| success: pnpm | case1 | yes |
| success: npm | case2 | yes |
| success: yarn | case3 | yes (env-dependent) |
| error: no rebase | case4 | yes |
| error: no lock file | case5 | yes |
| error: pnpm not found | case6 | yes |
| error: yarn not found | case7 | yes (env-dependent) |
| error: install fails | case9 | yes |
| error: unknown subcommand | case10 | yes |

**coverage assessment:** all output variants have snapshots.

---

### contract: take (suggestion modification)

**snapshot file:** `git.branch.rebase.take.integration.test.ts.snap`

**variants covered:**

| variant | test case | snapshot? |
|---------|-----------|-----------|
| take lock file → suggestion shown | case12.t0 (pnpm-lock) | yes |
| take lock file → suggestion shown | case12.t1 (package-lock) | yes |
| take lock file → suggestion shown | case12.t2 (yarn.lock) | yes |
| take multiple → suggestion once | case13 | yes |
| take non-lock → no suggestion | case14 | yes |

**coverage assessment:** all suggestion output variants have snapshots.

---

## why it holds

### every variant is snapped

examined both snapshot files:
- lock.integration.test.ts.snap: 9 snapshots
- take.integration.test.ts.snap: includes suggestion cases

each test case uses `.toMatchSnapshot()` on the stdout output, so reviewers can see actual CLI output in PR diffs.

### success cases covered

- lock refresh: case1 (pnpm), case2 (npm), case3 (yarn)
- take suggestion: case12 (all lock file types)

### error cases covered

- no rebase: case4
- no lock file: case5
- pm not found: case6, case7
- install fails: case9
- unknown subcommand: case10

### edge cases covered

- multiple files with lock: case13 (suggestion shown once)
- non-lock file: case14 (no suggestion)
- priority detection: case8 (pnpm preferred over npm)

---

## conclusion

| check | result |
|-------|--------|
| lock refresh snapshots | ✓ 9 variants snapped |
| take suggestion snapshots | ✓ 5 variants snapped |
| success cases | ✓ covered |
| error cases | ✓ covered |
| edge cases | ✓ covered |

all public contract output variants have snapshot coverage.

