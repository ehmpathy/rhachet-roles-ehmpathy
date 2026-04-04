# self-review r10: has-behavior-declaration-adherance

## the question

> does the blueprint correctly implement what the vision describes?

check each blueprint section against the vision and criteria for correctness.

---

## step 1: review filediff tree adherance

### vision says: 6 rules total

| concept | prod | test | vision status |
|---------|------|------|---------------|
| failhide (forbid) | extant | [NEW] | vision table row 1 |
| failfast (require) | rename from fail-fast | [NEW] | vision table row 2 |
| failloud (require) | [NEW] | [NEW] | vision table row 3 |

**blueprint shows:**

```
code.prod/pitofsuccess.errors/
├── [○] rule.forbid.failhide.md.pt1.md       ← matches "extant"
├── [○] rule.forbid.failhide.md.pt2.md       ← matches "extant" (companion file)
├── [~] rule.require.fail-fast.md → rule.require.failfast.md  ← matches "rename"
└── [+] rule.require.failloud.md             ← matches "[NEW]"

code.test/pitofsuccess.errors/
├── [+] rule.forbid.failhide.md              ← matches "[NEW]"
├── [+] rule.require.failfast.md             ← matches "[NEW]"
└── [+] rule.require.failloud.md             ← matches "[NEW]"
```

**adherance check:** ✓ all 6 rules present with correct markers

**why it adheres:**
- each vision table row maps to exactly one filediff entry
- markers match: `[○]` for extant, `[~]` for rename, `[+]` for new
- no extra files added beyond what vision prescribes

**lesson:** when vision has a table with "status" column, the filediff tree should use markers that map directly to those statuses. this makes verification visual and immediate.

---

## step 2: review file specifications adherance

### vision says: error classes with exit codes

vision table:

| category | classes | who fixes | exit code |
|----------|---------|-----------|-----------|
| caller must fix | ConstraintError, BadRequestError | caller/user | 2 |
| server must fix | MalfunctionError, UnexpectedCodePathError | server/developer | 1 |

**blueprint file spec for rule.require.failloud.md (code.prod) shows:**

| who fixes | class | exit code |
|-----------|-------|-----------|
| caller | ConstraintError, BadRequestError | 2 |
| server | MalfunctionError, UnexpectedCodePathError | 1 |

**adherance check:** ✓ all 4 classes present with correct exit codes

**why it adheres:**
- same classes, same exit codes, same categorization
- blueprint table matches vision table exactly
- no classes added or removed

**lesson:** when vision defines a taxonomy (classes with attributes), the blueprint file spec should reproduce that taxonomy as a table with identical structure. this prevents drift and makes comparison trivial.

### vision says: test failhide patterns

vision "awkward" section lists patterns:

| pattern | blueprint has it? |
|---------|-------------------|
| `if (!cond) { expect(true).toBe(true) }` | ✓ in forbidden patterns table |
| `if (!hasResource) { return }` | ✓ in forbidden patterns table |
| `expect([0, 1, 2]).toContain(exitCode)` | ✓ in forbidden patterns table |
| `expect.any(Object)` | ✓ in forbidden patterns table |
| empty test body | ✓ in forbidden patterns table |

**adherance check:** ✓ all vision patterns present

**why it adheres:**
- each pattern from vision appears in blueprint forbidden patterns table
- blueprint adds `toMatchSnapshot()` alone — valid extension, not deviation
- all have "why forbidden" rationale

**lesson:** when vision lists forbidden patterns, the blueprint may extend the list with related patterns, but must not omit any vision pattern. extensions are acceptable; omissions are not.

### vision says: legitimate alternatives

vision "awkward" section lists legitimate patterns:

| pattern | blueprint has it? |
|---------|-------------------|
| `given.runIf(condition)(...)` | ✓ conditional test |
| `then.skipIf(condition)(...)` | ✓ skip on condition |
| `it.skip('reason', ...)` | ✓ explicit skip |
| `throw new ConstraintError(...)` | ✓ absent resource |

**adherance check:** ✓ all vision alternatives present

**why it adheres:**
- each legitimate alternative from vision appears in blueprint table
- blueprint adds snapshot-with-assertions — valid extension

**lesson:** forbid rules that lack legitimate alternatives are incomplete. the blueprint correctly pairs forbidden patterns with viable alternatives, as the vision prescribes.

---

## step 3: review boot.yml adherance

### vision says: all 6 rules in `say` section (not `ref`)

**blueprint boot.yml after shows:**

```yaml
subject.code.prod:
  briefs:
    say:
      - briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt1.md
      - briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.md
      - briefs/practices/code.prod/pitofsuccess.errors/rule.require.failloud.md
      # ... plus extant rules

subject.code.test:
  briefs:
    say:
      - briefs/practices/code.test/pitofsuccess.errors/rule.forbid.failhide.md
      - briefs/practices/code.test/pitofsuccess.errors/rule.require.failfast.md
      - briefs/practices/code.test/pitofsuccess.errors/rule.require.failloud.md
```

**adherance check:** ✓ all 6 rules in `say` section

**why it adheres:**
- vision says "all 6 rules must be in boot.yml `say` section"
- blueprint shows exactly 6 rules under `say:` (3 prod + 3 test)
- no rules in `ref:` section
- failfast uses new name (not fail-fast)

**lesson:** the difference between `say` and `ref` is critical for rule priority. vision explicitly requires `say` because these are "the most important rules". the blueprint faithfully places all 6 in `say`.

---

## step 4: review behavior guard adherance

### vision says: guard update for code.test rules

vision "behavior guards" section says:
- current: `--rules '.../code.prod/pitofsuccess.errors/rule.*.md'`
- proposed: `--rules '.../code.{prod,test}/pitofsuccess.errors/rule.*.md'`

**blueprint behavior guard handoff shows:**

```
## .current
--rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.*.md'

## .proposed
--rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md'
```

**adherance check:** ✓ glob pattern matches vision

**why it adheres:**
- current and proposed patterns match vision exactly
- uses same brace expansion syntax
- handoff format is standard

**lesson:** guard glob patterns are shell syntax — the blueprint must use identical syntax to what the vision proposes. `{prod,test}` brace expansion is standard shell; any variation would break the guard.

---

## step 5: review terminology adherance

### vision says: symmetric terminology failhide/failfast/failloud

| term | vision definition | blueprint usage |
|------|-------------------|-----------------|
| failhide | hide errors, continue as if ok | `rule.forbid.failhide.md` |
| failfast | detect bad state early, throw immediately | `rule.require.failfast.md` |
| failloud | use proper error class with full details | `rule.require.failloud.md` |

**adherance check:** ✓ terminology matches vision

**why it adheres:**
- all three terms used in blueprint file names
- no hyphens (failfast not fail-fast) — matches rename requirement
- symmetric structure in both prod and test directories

**lesson:** terminology symmetry is not just about names — it's about structure. the blueprint mirrors `failhide/failfast/failloud` in both directories, which visually reinforces the triad concept from the vision.

---

## issues found

none. blueprint adheres to vision and criteria.

---

## why adherance holds (summary)

| aspect | check |
|--------|-------|
| file count | 6 rules as prescribed |
| file markers | `[○]`, `[~]`, `[+]` match status |
| error classes | all 4 with correct exit codes |
| failhide patterns | all vision patterns present |
| legitimate alternatives | all vision patterns present |
| boot.yml placement | all 6 in `say` section |
| guard glob | matches vision proposed pattern |
| terminology | symmetric, no hyphens |

**key insight:** the blueprint is a faithful translation of the vision. no requirements are misinterpreted or deviated from.

---

## what could have gone wrong (avoided mistakes)

### could have: used fail-fast instead of failfast

**bad alternative:** keep the hyphen in file names

**why it would be wrong:** vision explicitly prescribes "rename from fail-fast" — the hyphen must be removed for symmetry with failhide.

**what the blueprint does instead:** uses `failfast` consistently in all file names and boot.yml paths.

### could have: put rules in `ref` instead of `say`

**bad alternative:** place rules in boot.yml `ref` section

**why it would be wrong:** vision explicitly says "all 6 rules must be in boot.yml `say` section" — these are the most important rules, always loaded.

**what the blueprint does instead:** all 6 rules are under `say:` in both prod and test sections.

### could have: omitted error class exit codes

**bad alternative:** list classes without exit code semantics

**why it would be wrong:** vision table explicitly shows exit codes (2 for caller, 1 for server) — this is part of the failloud concept.

**what the blueprint does instead:** includes exit code column in error classes table.

---

## summary

- 5 adherance areas reviewed (filediff, file specs, boot.yml, guard, terminology)
- 0 deviations found
- blueprint is faithful to vision and criteria
- 3 potential mistakes identified and avoided

