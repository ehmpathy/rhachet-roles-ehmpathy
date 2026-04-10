# self-review: has-pruned-yagni

review for extras that were not prescribed. YAGNI = "you ain't gonna need it".

---

## components reviewed

### component: `--what` flag

**was this requested?**: yes. wish says "extend git.repo.test in order to support --what unit | integration | acceptance".

**minimum viable?**: yes. directly maps to the three test types requested.

**verdict**: keep. core requirement.

---

### component: `--scope` flag

**was this requested?**: yes. wish says "make it easy to --scope to custom subsets via paths and test names".

**minimum viable?**: yes. single flag that maps to jest's `--testPathPattern`.

**verdict**: keep. core requirement.

---

### component: `--resnap` flag

**was this requested?**: yes. wish says "also to make it easy to --resnap snapshots".

**minimum viable?**: yes. single flag that sets RESNAP=true env var.

**verdict**: keep. core requirement.

---

### component: `--` passthrough

**was this requested?**: implied. wish mentions "test names" in addition to paths. `--scope` handles paths only. `--` passthrough allows `--testNamePattern` for test name filter.

**minimum viable?**: yes. standard npm/bash convention. no new abstraction.

**verdict**: keep. enables test name filter without new flag.

---

### component: keyrack auto-unlock

**was this requested?**: yes. wish says "auto unlock keyracks".

**minimum viable?**: yes. single command call before tests.

**verdict**: keep. core requirement.

---

### component: log capture on success AND failure

**was this requested?**: yes. wish says "stream the full test results into a .log/.../ dir... do so both on success and failure for the rest of the tests".

**minimum viable?**: yes. same pattern as extant lint behavior, extended to all test types.

**verdict**: keep. core requirement.

---

### component: jest output parse for stats

**was this requested?**: implied. vision shows output with suites, tests, time. wish doesn't mention stats explicitly, but vision does.

**minimum viable?**: yes. simple regex parse of known jest output lines.

**did we add abstraction for future flexibility?**: no. parse is inline, no separate parser module.

**did we optimize before needed?**: no. regex parse is the simplest approach.

**verdict**: keep. vision requirement.

---

### component: timer progress indicator

**was this requested?**: vision shows `🐢 ... (12s)` in example output (line 158-163).

**minimum viable?**: yes. simple elapsed timer in shell.

**did we add for "while we're here"?**: no. explicitly shown in vision.

**verdict**: keep. vision requirement.

---

### component: graceful degradation for output parse

**was this requested?**: no. this was added in assumption review (r4).

**minimum viable?**: yes. just omits stats if parse fails.

**did we add abstraction for future flexibility?**: no. single conditional.

**did we optimize before needed?**: no. prevents breakage with custom reporters.

**verdict**: keep. defensive design that prevents failures.

---

### component: keyrack mock for journey 5

**was this requested?**: no. this was added in assumption review (r4).

**minimum viable?**: yes. uses extant PATH injection pattern.

**did we add abstraction for future flexibility?**: no. adds mockKeyrack boolean to fixture.

**did we optimize before needed?**: no. required for hermetic tests.

**verdict**: keep. test quality requirement.

---

### component: howto.run-tests brief

**was this requested?**: yes. wish says "add a brief that covers this and how to run tests".

**minimum viable?**: yes. documents commands, flags, exit codes, example output.

**verdict**: keep. core requirement.

---

## extras not requested (YAGNI check)

### checked: vitest support

**in blueprint?**: no. deferred explicitly.

**verdict**: correct. not requested.

---

### checked: `--env` flag for keyrack

**in blueprint?**: no. deferred explicitly.

**verdict**: correct. not requested.

---

### checked: jest 30 compatibility

**in blueprint?**: no. deferred explicitly.

**verdict**: correct. not requested.

---

### checked: new output.sh operations

**in blueprint?**: originally proposed `print_tree_section`. removed in deletables review (r3).

**verdict**: correct. was removed.

---

### checked: verbose mode flag

**in blueprint?**: no. not requested.

**verdict**: correct. not requested.

---

### checked: json output format

**in blueprint?**: no. not requested.

**verdict**: correct. not requested.

---

## summary

| component | requested by | verdict |
|-----------|--------------|---------|
| `--what` | wish | keep |
| `--scope` | wish | keep |
| `--resnap` | wish | keep |
| `--` passthrough | implied by wish | keep |
| keyrack unlock | wish | keep |
| log capture | wish | keep |
| stats parse | vision | keep |
| timer progress | vision | keep |
| parse fallback | assumption review | keep |
| keyrack mock | assumption review | keep |
| brief | wish | keep |

---

## conclusion

**no YAGNI issues found.**

every component in the blueprint traces to:
1. explicit wish requirement
2. explicit vision requirement
3. implied requirement (e.g., test name filter via `--`)
4. defensive design (e.g., parse fallback)
5. test quality (e.g., hermetic tests)

items that were considered but not requested (vitest, --env, jest 30, new output operations, verbose mode, json output) are correctly absent from the blueprint.

the print_tree_section abstraction was originally proposed but was removed in the deletables review. no "future flexibility" abstractions remain.
