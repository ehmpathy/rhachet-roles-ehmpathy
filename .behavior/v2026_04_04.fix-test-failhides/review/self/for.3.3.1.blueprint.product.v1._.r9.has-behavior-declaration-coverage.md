# self-review r9: has-behavior-declaration-coverage

## the question

> does the blueprint cover all requirements from the vision and criteria?

trace each requirement to its blueprint section. identify gaps.

---

## step 1: extract vision requirements

from the vision, the requirements are:

| # | requirement | source |
|---|-------------|--------|
| V1 | 6 rules total (3 prod, 3 test) | vision table |
| V2 | rename fail-fast → failfast | vision table |
| V3 | all 6 rules in boot.yml `say` section | vision "boot.yml requirement" |
| V4 | failhide patterns enumerated for test code | vision "mental model" |
| V5 | error classes: ConstraintError, MalfunctionError, etc. | vision table |
| V6 | behavior guard update for code.test rules | vision "contract inputs & outputs" |
| V7 | legitimate alternatives for test failhide | vision "awkward" section |
| V8 | exit codes: 2 for caller-must-fix, 1 for server-must-fix | vision table |
| V9 | symmetric terminology: failhide/failfast/failloud | vision "terminology" |
| V10 | test code rules in code.test/pitofsuccess.errors/ | vision table |
| V11 | prod code rules in code.prod/pitofsuccess.errors/ | vision table |

---

## step 2: extract criteria requirements

from the criteria, the requirements are:

| # | requirement | source |
|---|-------------|--------|
| C1 | rule.forbid.failhide blocks prod failhide patterns | usecase.1 |
| C2 | rule.require.failfast blocks early-exit violations | usecase.1 |
| C3 | rule.require.failloud blocks errors without class/context | usecase.1 |
| C4 | rule.forbid.failhide blocks test failhide patterns | usecase.2 |
| C5 | behavior guard emits blocker on failhide in prod/test | usecase.3 |
| C6 | boot.yml loads all 6 rules at session start | usecase.4 |
| C7 | ConstraintError/BadRequestError for caller-must-fix | usecase.5 |
| C8 | MalfunctionError/UnexpectedCodePathError for server-must-fix | usecase.5 |

---

## step 3: trace to blueprint

### vision requirements → blueprint

| # | requirement | blueprint section | covered? |
|---|-------------|-------------------|----------|
| V1 | 6 rules total | filediff tree shows 3 prod + 3 test rules | ✓ |
| V2 | rename fail-fast → failfast | filediff `[~] rule.require.fail-fast.md → rule.require.failfast.md` | ✓ |
| V3 | all 6 in boot.yml say | boot.yml changes (after) shows all 6 | ✓ |
| V4 | test failhide patterns | file spec rule.forbid.failhide.md (code.test) lists 6 patterns | ✓ |
| V5 | error classes | file spec rule.require.failloud.md (code.prod) lists 4 classes | ✓ |
| V6 | guard update | behavior guard handoff section | ✓ |
| V7 | legitimate alternatives | file spec rule.forbid.failhide.md (code.test) table | ✓ |
| V8 | exit codes 2/1 | file spec rule.require.failloud.md (code.prod) table | ✓ |
| V9 | symmetric terminology | filediff + codepath trees show failhide/failfast/failloud | ✓ |
| V10 | test rules in code.test/ | filediff tree `code.test/pitofsuccess.errors/` | ✓ |
| V11 | prod rules in code.prod/ | filediff tree `code.prod/pitofsuccess.errors/` | ✓ |

### criteria requirements → blueprint

| # | requirement | blueprint section | covered? |
|---|-------------|-------------------|----------|
| C1 | prod failhide block | `[○]` retain rule.forbid.failhide.md.pt1.md | ✓ |
| C2 | failfast block | `[~]` rename rule.require.fail-fast → failfast | ✓ |
| C3 | failloud block | `[+]` create rule.require.failloud.md (prod) | ✓ |
| C4 | test failhide block | `[+]` create rule.forbid.failhide.md (test) | ✓ |
| C5 | guard emits blocker | behavior guard handoff section | ✓ |
| C6 | boot.yml loads 6 | boot.yml changes (after) | ✓ |
| C7 | ConstraintError/BadRequestError | file spec error classes table | ✓ |
| C8 | MalfunctionError/UnexpectedCodePathError | file spec error classes table | ✓ |

---

## step 4: identify gaps

| gap | description |
|-----|-------------|
| (none) | all 11 vision requirements traced to blueprint |
| (none) | all 8 criteria requirements traced to blueprint |

---

## why each trace holds

### V1: 6 rules total (3 prod, 3 test)

**why it holds:**
- filediff tree shows exactly 6 rule files: 3 in `code.prod/` (1 new failloud + 2 extant) and 3 in `code.test/` (all new)
- the prod rules are: failhide.md.pt1.md (retain), failfast.md (rename), failloud.md (create)
- the test rules are: failhide.md (create), failfast.md (create), failloud.md (create)
- count is explicit in the tree structure

**lesson:** when vision prescribes a count, the filediff tree should make the count visually obvious through its structure.

### V2: rename fail-fast → failfast

**why it holds:**
- filediff entry `[~] rule.require.fail-fast.md → rule.require.failfast.md` explicitly shows the rename
- the `[~]` marker indicates update/rename, not create
- seed and demo files also show the rename pattern

**lesson:** renames should use the `[~]` marker with arrow notation that shows old → new name.

### V3: all 6 rules in boot.yml `say` section

**why it holds:**
- boot.yml "after" section lists all 6 paths under `say:`
- prod rules: 3 paths under `subject.code.prod.briefs.say`
- test rules: 3 paths under `subject.code.test.briefs.say`
- none in `ref:` section

**lesson:** when vision prescribes rules be "in say section", the boot.yml after section should list each path explicitly.

### V4: test failhide patterns enumerated

**why it holds:**
- file spec for `rule.forbid.failhide.md (code.test)` contains table with 6 forbidden patterns
- patterns match vision examples: `expect(true).toBe(true)`, silent return, `expect([0,1,2]).toContain()`
- each pattern has "why forbidden" column

**lesson:** pattern enumeration in file specs should match the patterns mentioned in vision, with clear rationale for each.

### V5: error classes

**why it holds:**
- file spec for `rule.require.failloud.md (code.prod)` contains error classes table
- table lists all 4 classes: ConstraintError, BadRequestError, MalfunctionError, UnexpectedCodePathError
- "who fixes" column shows caller vs server distinction

**lesson:** when vision specifies error class taxonomy, the file spec should present it as a table with clear categorization.

### V6: behavior guard update

**why it holds:**
- blueprint has dedicated "behavior guard handoff" section
- handoff shows current glob (code.prod only) and proposed glob (code.{prod,test})
- brace expansion `{prod,test}` is standard shell pattern

**lesson:** guard updates should be documented as handoffs with before/after glob patterns.

### V7: legitimate alternatives for test failhide

**why it holds:**
- file spec for `rule.forbid.failhide.md (code.test)` contains "legitimate alternatives" table
- table shows 5 patterns: `given.runIf()`, `then.skipIf()`, `it.skip()`, `ConstraintError`, snapshot with assertions
- each has a use case column

**lesson:** forbid rules should pair forbidden patterns with legitimate alternatives — show the pit of success.

### V8: exit codes 2/1

**why it holds:**
- file spec for `rule.require.failloud.md (code.prod)` shows exit codes in error classes table
- exit 2 for caller-must-fix (ConstraintError, BadRequestError)
- exit 1 for server-must-fix (MalfunctionError, UnexpectedCodePathError)

**lesson:** exit code semantics should be in the error class table, not a separate section — they're part of class identity.

### V9: symmetric terminology

**why it holds:**
- filediff tree shows symmetric structure: `failhide`, `failfast`, `failloud` in both directories
- codepath tree shows symmetric behavior: all three concepts in both prod and test
- terminology is consistent throughout (no hyphens, no variants)

**lesson:** terminology symmetry should be visible in the tree structures — the pattern should be visually obvious.

### V10/V11: rules in correct directories

**why they hold:**
- filediff tree explicitly shows `code.prod/pitofsuccess.errors/` and `code.test/pitofsuccess.errors/`
- directory structure mirrors extant `code.prod/` pattern
- no rules are in wrong directories

**lesson:** directory placement is documented in the filediff tree structure itself — the tree is the specification.

### C1-C4: rules block patterns

**why they hold:**
- each rule file spec has an `.enforcement` section
- enforcement specifies severity (blocker) and trigger (pattern detected)
- the pattern → enforcement chain is explicit

**lesson:** file specs should include `.enforcement` section that defines what the rule blocks and at what severity.

### C5: guard emits blocker

**why it holds:**
- behavior guard handoff section specifies the glob pattern
- handoff notes that guards run `--mode hard` (blocker mode)
- the glob includes both prod and test rules

**lesson:** guard configuration belongs in a handoff document, not inline in file specs — guards are separate artifacts.

### C6: boot.yml loads rules

**why it holds:**
- boot.yml after section is explicit yaml that shows all 6 paths
- paths use correct relative format from boot.yml location
- comment notes "most important rules"

**lesson:** boot.yml changes should show complete before/after yaml, not just delta descriptions.

### C7/C8: error class categories

**why they hold:**
- error classes table in failloud file spec shows all 4 classes
- "who fixes" column distinguishes caller vs server
- exit code column shows 2 vs 1

**lesson:** error class taxonomy is a single table, not separate descriptions — the table is the canonical reference.

---

## why coverage is complete

### V1-V11 coverage

each vision requirement has a direct artifact in the blueprint:

| requirement type | artifact type |
|------------------|---------------|
| file creation | filediff tree `[+]` entries |
| file rename | filediff tree `[~]` entries |
| file retain | filediff tree `[○]` entries |
| content spec | file specifications section |
| boot.yml changes | boot.yml before/after |
| guard update | behavior guard handoff |

### C1-C8 coverage

each criteria requirement maps to an enforcement artifact:

| criteria type | enforcement via |
|---------------|-----------------|
| rule blocks pattern | file specification with `.enforcement` section |
| guard emits blocker | handoff document with proposed glob |
| boot.yml loads rules | boot.yml after section |
| error classes | file specification with `.error classes` table |

---

## the coverage test

> for each requirement, can the executor find exactly where to implement it?

| question | answer |
|----------|--------|
| which files to create? | filediff tree with `[+]` markers |
| which files to rename? | filediff tree with `[~]` markers |
| what content in each file? | file specifications section |
| what boot.yml changes? | boot.yml before/after diff |
| what guard changes? | behavior guard handoff |

all requirements are traceable. executor can proceed within scope.

---

## summary

- 11 vision requirements examined
- 8 criteria requirements examined
- 0 gaps found
- all requirements have artifacts in blueprint
- blueprint is complete for declared scope

