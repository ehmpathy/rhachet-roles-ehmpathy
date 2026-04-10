# self-review: has-questioned-deletables

review that all features and components are necessary and trace to requirements. third iteration with deeper articulation and explicit fixes.

---

## issue found and fixed

### issue: unnecessary `print_tree_section` abstraction

**what was found**: the blueprint proposed a new `print_tree_section` abstraction for nested stats output:

```
output.sh
└─ [+] print_tree_section (for nested stats)
   ├─ print_tree_section_start "stats"
   ├─ print_tree_section_branch "suites" "1 file"
   └─ print_tree_section_last "time" "0.5s"
```

**why this is deletable**:
1. extant output.sh already has `print_tree_branch` and `print_tree_leaf`
2. nested output can be achieved with manual indentation
3. this is premature abstraction — wait for 3+ usages before extract
4. adds cognitive load for one use case

**how it was fixed**:

edited blueprint line 118-131 from:
```
### output operations (potential additions)
...
└─ [+] print_tree_section (for nested stats)
   ├─ print_tree_section_start "stats"
   ├─ print_tree_section_branch "suites" "1 file"
   └─ print_tree_section_last "time" "0.5s"
```

to:
```
### output operations (reuse extant)
...
└─ [○] print_tree_file_line

note: stats nested output uses extant operations with manual indentation. no new abstractions needed.
```

**verification**: `git diff` shows the edit was applied.

---

## features questioned with why they hold

### feature: `--what` flag

**why it holds**: direct trace to wish "extend git.repo.test in order to support --what unit | integration | acceptance". this is the core ask. no deletion possible.

### feature: `--scope` flag

**why it holds**: direct trace to wish "make it easy to --scope to custom subsets via paths and test names". without `--scope`, clones must use raw npm commands. no deletion possible.

### feature: `--resnap` flag

**why it holds**: direct trace to wish "also to make it easy to --resnap snapshots". without `--resnap`, clones must remember `RESNAP=true npm run...` incantation. no deletion possible.

### feature: `--` passthrough

**why it holds**: usecase.5 in criteria requires "pass raw args to jest". `--scope` only handles path patterns. test name filter requires `-- --testNamePattern`. if we delete passthrough, we cannot satisfy usecase.5. no deletion possible.

### feature: keyrack auto-unlock

**why it holds**: direct trace to wish "auto unlock keyracks". this was the explicit ask. to remove would require clones to remember `rhx keyrack unlock` before tests. no deletion possible.

### feature: log capture on success AND failure

**why it holds**: direct trace to wish "stream the full test results into a .log/.../ dir... do so both on success and failure for the rest of the tests". the "both" is explicit. no deletion possible.

### feature: jest output parse for stats

**why it holds**: usecase.8 in criteria requires output format with stats (suites, tests, time). vision shows this output format in every example. if we delete stats, output becomes bare status only, which contradicts vision. no deletion possible.

### feature: timer progress indicator

**why it holds**: vision line 158-163 shows timer `🐢 ... (12s)`. while not in wish, it's in vision, and "has-zero-deferrals" review confirmed we deliver all vision items. to remove timer would defer a vision item. no deletion possible.

---

## components questioned with why they hold

### component: output.sh operations

**why it holds**: all mechanic skills use turtle vibes output format via shared output.sh. the skill must output in the same format. if we delete output.sh usage, output becomes inconsistent with other skills. reuse extant operations. no deletion possible.

**simplification made**: removed `print_tree_section` proposal. use extant operations only.

### component: jest output parser

**why it holds**: stats output requires parse of jest output lines. the parser is minimal — just regex for known jest lines:
- `Test Suites: X passed, Y failed`
- `Tests: X passed, Y failed, Z skipped`
- `Time: X.XXXs`
- `No tests found`

this is the simplest possible implementation. no json parse, no ast. if we delete, we cannot show stats. no deletion possible.

### component: keyrack integration

**why it holds**: direct trace to wish "auto unlock keyracks". implementation is minimal — single `rhx keyrack unlock --owner ehmpath --env test` call. if we delete, we contradict wish. no deletion possible.

### component: npm command validation

**why it holds**: usecase.7 in criteria requires "fail fast on absent command". if we delete validation, skill runs `npm run test:unit` and fails with npm's generic error. criteria requires helpful hint. no deletion possible.

---

## deletion candidates considered and rejected

| candidate | why rejected |
|-----------|--------------|
| make stats optional via `--verbose` | vision shows stats in default output; wisher didn't ask for verbosity flag |
| make keyrack unlock manual | wish explicitly says "auto unlock" |
| skip log path in output | wish says "tell the clones where they can look" |
| use npm exit code instead of output parse | need stats for output, not just pass/fail |
| remove timer | vision item, already confirmed in zero-deferrals review |

---

## conclusion

| category | result |
|----------|--------|
| issues found | 1 |
| issues fixed | 1 (print_tree_section removed) |
| features questioned | 8 |
| features deleted | 0 |
| components questioned | 4 |
| components simplified | 1 |

**issue fixed**: removed premature `print_tree_section` abstraction. blueprint now reuses extant output.sh operations.

**why all other items hold**: each feature and component traces to wish, vision, or criteria. no bloat detected beyond the one abstraction that was removed.
