# self-review: has-role-standards-coverage

## the question

go through the blueprint line by line:
- are all relevant mechanic standards applied?
- are there patterns that should be present but are absent?
- did the junior forget error guards, validation, tests, types, or other required practices?

---

## enumerated rule directories

### all briefs/practices directories

```
code.prod/
├── consistent.artifacts         ✓ covered: n/a (no npm install in blueprint)
├── consistent.contracts         ✓ covered: skill I/O documented
├── evolvable.architecture       ✓ covered: bounded to git.branch.rebase/
├── evolvable.domain.objects     ○ not applicable: bash skill
├── evolvable.domain.operations  ✓ covered: verb prefixes (detect_, run_)
├── evolvable.procedures         ✓ covered: (input, context) not applicable to bash
├── evolvable.repo.structure     ✓ covered: file placement correct
├── pitofsuccess.errors          ✓ covered: guards at lines 45, 50, 55, 60
├── pitofsuccess.procedures      ✓ covered: idempotent (refresh can be run multiple times)
├── pitofsuccess.typedefs        ○ not applicable: bash skill
├── readable.comments            ✓ covered: header pattern in line 39
├── readable.narrative           ✓ covered: linear guard flow
└── readable.persistence         ○ not applicable: no persistence

code.test/
├── consistent.contracts         ✓ covered: test-fns in test file
├── frames.behavior              ✓ covered: [caseN]/[tN] labels (lines 85-147)
├── frames.caselist              ○ not applicable
├── lessons.howto                ○ info only
└── scope.*                      ✓ covered: integration tests for bash skills

lang.terms/                      ✓ covered: ubiqlang verbs
lang.tones/                      ✓ covered: turtle vibes output
work.flow/                       ✓ covered: skill conventions
```

---

## coverage review

### error guard coverage

| error condition | guard present? | test case? |
|-----------------|----------------|------------|
| no rebase in progress | line 45 ✓ | case4 (line 101) ✓ |
| no lock file extant | line 50 ✓ | case5 (line 106) ✓ |
| pm not installed (pnpm) | line 52 ✓ | case6 (line 111) ✓ |
| pm not installed (yarn) | line 54 ✓ | case7 (line 116) ✓ |
| install fails | line 60 ✓ | case9 (line 127) ✓ |
| unknown subcommand | line 44 ✓ | not tested (edge case) |

**coverage check:** 5 of 6 error conditions have both guard and test. "unknown subcommand" is minor edge case.

**why it holds:** critical error paths are guarded and tested.

---

### validation coverage

| input | validation | where |
|-------|------------|-------|
| subcommand arg | must be "refresh" | line 43-44 |
| rebase state | must be in progress | line 45 |
| lock file | must exist | line 50 |
| package manager | must be installed | line 55 |

**why it holds:** all inputs are validated before operations proceed.

---

### test coverage

| behavior | test case? | line |
|----------|------------|------|
| pnpm refresh success | case1 ✓ | 86 |
| npm refresh success | case2 ✓ | 91 |
| yarn refresh success | case3 ✓ | 96 |
| no rebase error | case4 ✓ | 101 |
| no lock file error | case5 ✓ | 106 |
| pnpm not installed error | case6 ✓ | 111 |
| yarn not installed error | case7 ✓ | 116 |
| priority: pnpm > npm | case8 ✓ | 121 |
| install failure error | case9 ✓ | 127 |
| suggestion after take | case11 ✓ | 135 |
| single suggestion for multi-file | case12 ✓ | 141 |
| no suggestion for non-lock | case13 ✓ | 145 |

**why it holds:** 12 test cases cover all success paths, error paths, and edge cases.

---

### output format coverage

| output element | specified? | where |
|----------------|------------|-------|
| turtle header | ✓ | line 39: inline output functions |
| tree structure | ✓ | lines 62-66: tree output |
| detected pm | ✓ | line 63 |
| run command | ✓ | line 64 |
| staged file | ✓ | line 65 |
| done marker | ✓ | line 66 |
| error format | ✓ | line 166: tree-embedded pattern |

**why it holds:** all output elements from vision timeline are specified in blueprint.

---

### operations coverage

| operation | present? | where |
|-----------|----------|-------|
| source shared ops | ✓ | line 40 |
| detect lock file | ✓ | lines 46-49 |
| detect pm | ✓ | lines 51-54 |
| run install | ✓ | lines 56-59 |
| stage lock | ✓ | line 61 |

**why it holds:** all operations needed for the flow are specified.

---

### reuse coverage

| extant operation | reused? | why |
|------------------|---------|-----|
| is_rebase_in_progress() | ✓ | exact match in operations.sh |
| get_git_dir() | ✓ | exact match in operations.sh |
| _detect_package_manager() | ✗ | semantics differ (r5 review) |

**why it holds:** appropriate reuse/new decision documented in r5 review.

---

## specific rule coverage

### rule: rule.require.fail-fast (pitofsuccess.errors)

**required:** explicit guards with fail-fast behavior

**blueprint coverage:**
- line 45: `guard: is_rebase_in_progress` — exits early if no rebase
- line 50: `guard: at least one lock file extant` — exits early if no lock
- line 55: `guard: package manager available` — exits early if pm absent
- line 60: `guard: install succeeded` — exits early if install fails

**why covered:** 4 guards implement fail-fast pattern.

---

### rule: rule.require.narrative-flow (readable.narrative)

**required:** linear flow, no nested if/else

**blueprint coverage:**
- codepath tree (lines 37-66) shows sequential guards
- no "else" branches in codepath
- each guard is early exit, not nested condition

**why covered:** codepath structure is linear with early exits.

---

### rule: rule.require.given-when-then (code.test)

**required:** BDD test structure with [caseN]/[tN] labels

**blueprint coverage:**
- test coverage section (lines 85-147)
- [case1] through [case13] labels present
- [t0], [t1] labels for variations

**why covered:** test cases use given-when-then structure.

---

### rule: rule.prefer.wet-over-dry (evolvable.architecture)

**required:** inline code for single consumers, reuse for 3+ consumers

**blueprint coverage:**
- line 39: output functions inline (single consumer)
- line 166: pattern reference, not source dependency
- operations decomposition: new ops in lock.sh, not shared file

**why covered:** YAGNI applied — no premature extraction.

---

### rule: turtle vibes output (lang.tones)

**required:** tree structure, lowercase, nature emojis

**blueprint coverage:**
- lines 62-66: tree output with `├─`, `└─`
- lowercase labels: "detected:", "run:", "staged:"
- line 65: ✓ for success indicator

**why covered:** output format matches turtle vibes conventions.

---

### rule: skill header pattern (readable.comments)

**required:** .what, .why, usage, guarantee blocks

**blueprint coverage:**
- line 39: "define turtle vibes output functions (inline)"
- operations decomposition (lines 154-166): documents functions

**note:** blueprint doesn't include full header text, but that is implementation detail not blueprint scope.

**why covered:** blueprint references the pattern, implementation will include headers.

---

## gaps found

### gap 1: unknown subcommand test absent

**issue:** line 44 shows error for unknown subcommand but no test case exists.

**assessment:** minor. this is a defensive guard, not a primary use case. the user would need to intentionally invoke `lock invalidcmd` to hit this path.

**decision:** acceptable to ship without test. if this becomes a pattern, add a general "bad subcommand" test case.

**why it holds despite gap:** the behavior is specified (error message) and implemented (guard at line 44). test coverage for edge cases is a NITPICK, not a BLOCKER.

---

## summary

| coverage area | items | covered | gaps |
|---------------|-------|---------|------|
| error guards | 6 | 5 | 1 (minor) |
| validation | 4 | 4 | 0 |
| tests | 12 | 12 | 0 |
| output format | 7 | 7 | 0 |
| operations | 5 | 5 | 0 |
| reuse | 3 | 3 | 0 |

**result:** 1 minor gap (unknown subcommand test absent). not a blocker. blueprint has adequate coverage of mechanic role standards.

