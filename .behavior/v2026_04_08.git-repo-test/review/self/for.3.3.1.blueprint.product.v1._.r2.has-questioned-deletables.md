# self-review: has-questioned-deletables

review that all features and components are necessary and trace to requirements.

---

## features questioned

### feature: `--what` flag

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.1, usecase.2, usecase.3, usecase.4 |
| wisher asked? | yes — wish says "extend git.repo.test in order to support --what unit \| integration \| acceptance" |
| assumed? | no |

**verdict**: keep. core requirement.

### feature: `--scope` flag

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.1, usecase.2, usecase.3, usecase.5 (scope filter) |
| wisher asked? | yes — wish says "make it easy to --scope to custom subsets via paths and test names" |
| assumed? | no |

**verdict**: keep. core requirement.

### feature: `--resnap` flag

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.1, usecase.2, usecase.3 (resnap mode) |
| wisher asked? | yes — wish says "also to make it easy to --resnap snapshots" |
| assumed? | no |

**verdict**: keep. core requirement.

### feature: `--` passthrough

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.5 "pass raw args to jest" |
| wisher asked? | implied by "make it easy to --scope to custom subsets via paths and test names" |
| assumed? | partially — vision added this as an escape hatch |

**examination**: if we delete `--` passthrough, can users still pass test name filters? no, they cannot. `--scope` is path only. the vision explicitly shows `-- --testNamePattern` as the escape hatch. this was a deliberate design decision in vision, not blueprint bloat.

**verdict**: keep. necessary for completeness.

### feature: keyrack auto-unlock

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.2, usecase.3, usecase.10 |
| wisher asked? | yes — wish says "auto unlock keyracks" |
| assumed? | no |

**verdict**: keep. core requirement.

### feature: log capture on success AND failure

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.9 |
| wisher asked? | yes — wish says "stream the full test results into a .log/.../ dir... do so both on success and failure" |
| assumed? | no |

**verdict**: keep. core requirement.

### feature: jest output parse for stats

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.8 (output format shows stats) |
| wisher asked? | implied by vision output format which shows suites, tests, time |
| assumed? | vision assumed |

**examination**: if we delete stats parse, output becomes:
```
🐚 git.repo.test --what unit
   ├─ status: passed
   └─ log
      ...
```

is this acceptable? the wisher said "tell the clones where they can look to access the full test details". stats are not strictly required — clone could read the log for counts. but the vision explicitly designed stats as part of the output. this was a vision decision, not blueprint bloat.

**verdict**: keep. vision requirement.

### feature: timer progress indicator

| question | answer |
|----------|--------|
| traces to criteria? | yes — usecase.8 (output format includes timer) |
| wisher asked? | not explicitly |
| assumed? | vision assumed |

**examination**: vision line 158-163 shows timer `🐢 ... (12s)`. this was added in vision for UX, not from wish. however, it's a small feature (few lines) and provides valuable feedback.

**could we delete it?** yes, but tests would appear to hang with no output. timer is low-cost, high-value.

**verdict**: keep. low cost, high value.

---

## components questioned

### component: output.sh extensions

| question | answer |
|----------|--------|
| can remove entirely? | no — output operations are shared across skills |
| would we add back? | yes — turtle vibes require tree output |
| optimized what shouldn't exist? | no — extends extant pattern |
| simplest version? | reuse extant operations + minimal additions |

**examination**: blueprint mentions `print_tree_section` for nested stats. is this needed?

current output.sh has: `print_tree_branch`, `print_tree_leaf`, `print_tree_file_line`

for stats section, we need nested output:
```
├─ stats
│  ├─ suites: 1 file
│  └─ time: 0.5s
```

can we do this with extant operations? yes, with careful indentation. `print_tree_section` is a convenience, not a necessity.

**verdict**: simplify. use extant operations, avoid new abstraction.

**fix applied**: remove `print_tree_section` from blueprint. use extant operations.

### component: jest output parser

| question | answer |
|----------|--------|
| can remove entirely? | no — need stats for output |
| would we add back? | yes — output requires test counts |
| optimized what shouldn't exist? | no — simple regex parse |
| simplest version? | grep/sed for jest output lines |

**examination**: parser extracts:
- suite count: `"Test Suites: X passed, Y failed"`
- test count: `"Tests: X passed, Y failed, Z skipped"`
- time: `"Time: X.XXXs"`
- no tests found: `"No tests found"`

is this the simplest? yes — just regex on known jest output lines. no json parse, no complex state.

**verdict**: keep. already minimal.

### component: keyrack integration

| question | answer |
|----------|--------|
| can remove entirely? | no — keyrack unlock is core requirement |
| would we add back? | yes |
| optimized what shouldn't exist? | no — single command call |
| simplest version? | `rhx keyrack unlock --owner ehmpath --env test` |

**verdict**: keep. already minimal.

### component: npm command validation

| question | answer |
|----------|--------|
| can remove entirely? | no — fail-fast is core requirement |
| would we add back? | yes — usecase.7 requires this |
| optimized what shouldn't exist? | no |
| simplest version? | check package.json for `scripts.test:${WHAT}` |

**verdict**: keep. already minimal.

---

## deletions made

### 1. `print_tree_section` operation

**before**: blueprint proposed new `print_tree_section` abstraction

**after**: use extant `print_tree_branch` and `print_tree_leaf` with manual indentation

**why deleted**: abstraction not needed. extant operations suffice. avoid premature abstraction.

---

## simplifications considered but rejected

### stats as separate output mode

could we make stats optional via `--verbose`? no — vision shows stats in default output. user didn't ask for verbosity flag.

### keyrack unlock as separate step

could we make user unlock manually? no — wish explicitly asks for "auto unlock keyracks".

### log path as environment variable instead of output

could we skip log path display? no — wish says "tell the clones where they can look to access the full test details".

---

## conclusion

| category | result |
|----------|--------|
| features questioned | 8 |
| features deleted | 0 |
| features kept | 8 |
| components questioned | 4 |
| components simplified | 1 (print_tree_section removed) |
| components kept | 4 |

**one simplification made**: removed `print_tree_section` abstraction from output.sh. use extant operations instead.

all other features and components trace to vision, criteria, or wish. no bloat detected.
