# self-review r4: has-questioned-assumptions

## the question

> what hidden technical assumptions did the junior make? are they valid?

we question all assumptions, especially our own.

---

## assumption 1: separate files for prod and test rules

**what we assumed:** each rule (failhide, failfast, failloud) needs separate files for code.prod and code.test.

**what if the opposite were true?** could we have one combined rule per concept?

**evidence:**
- prod failhide patterns: try/catch swallow, error ignore
- test failhide patterns: fake verification, silent skip, accepts errors as valid
- these patterns are fundamentally different — they share a name but not content

**verdict:** separate files are correct. a combined rule would force awkward "if prod... else if test..." logic. distinct patterns require distinct rules.

---

## assumption 2: all 6 rules in boot.yml say section

**what we assumed:** all 6 rules must be in `say` (always loaded), not `ref` (on-demand).

**what if the opposite were true?** could some rules be in ref?

**evidence:**
- the vision explicitly states: "these are the most important rules, always loaded at session start"
- the wish says: "this is absolutely the most important rule you'll ever read"
- failhides are broken promises that break trust — they must be top of mind

**verdict:** say section is correct. these rules are too important to be optional references.

---

## assumption 3: handoff document instead of direct guard update

**what we assumed:** we create a handoff document with the guard update, rather than directly modifying guards.

**what if the opposite were true?** should we modify the behavior guards directly in this blueprint?

**evidence:**
- behavior guards live in the bhrain repo, not rhachet-roles-ehmpathy
- this blueprint's scope is the mechanic role rules
- guard updates require coordination with the bhrain route workflow

**verdict:** handoff is correct. guard updates belong in their own route in bhrain repo. separation of concerns.

---

## assumption 4: ConstraintError for absent resource in tests

**what we assumed:** when a test lacks a required resource, it should throw ConstraintError with exit code 2.

**what if the opposite were true?** could tests use a different error class?

**evidence:**
- exit 2 = caller must fix (constraint)
- exit 1 = server must fix (malfunction)
- absent API key = constraint on test execution, caller must provide
- this is not a malfunction — the test infra works fine, the caller just didn't configure it

**verdict:** ConstraintError is correct. absent resource is a caller-fixable constraint.

---

## assumption 5: snapshot-alone pattern in forbidden list

**what we assumed:** `toMatchSnapshot()` without prior assertions is a failhide.

**what if the opposite were true?** could snapshot-alone be valid?

**evidence:**
- snapshot captures output but doesn't verify behavior
- a snapshot could contain incorrect data and still "pass" if it matches
- the research (citation [4]) explicitly says: "use both a snapshot AND explicit assertions"

**verdict:** snapshot-alone is correctly forbidden. snapshot is observability, not verification.

---

## assumption 6: 5 legitimate alternatives are all needed

**what we assumed:** all 5 alternatives in the table are distinct and necessary.

**what if the opposite were true?** could we simplify to fewer alternatives?

**evidence:**
| alternative | distinct purpose |
|-------------|------------------|
| `given.runIf(condition)` | conditional test execution |
| `then.skipIf(condition)` | conditional assertion skip |
| `it.skip('reason', ...)` | jest-native explicit skip |
| `throw new ConstraintError(...)` | failfast on absent resource |
| snapshot with assertions | proper snapshot usage |

each serves a different scenario:
- runIf: the whole test is conditional
- skipIf: just one assertion is conditional
- it.skip: test exists but is disabled
- ConstraintError: resource is required
- snapshot with assertions: proper observability

**verdict:** all 5 alternatives are distinct. none redundant.

---

## assumption 7: rename fail-fast to failfast

**what we assumed:** we should rename `rule.require.fail-fast.md` to `rule.require.failfast.md`.

**what if the opposite were true?** could we keep the hyphen?

**evidence:**
- `failhide` has no hyphen
- `failloud` has no hyphen
- consistency across the triad matters
- the vision explicitly asks for this rename

**verdict:** rename is correct. consistent name convention prevents cognitive friction.

---

## assumption 8: pitofsuccess.errors directory name

**what we assumed:** the rules belong in `pitofsuccess.errors/` directory.

**what if the opposite were true?** should they go elsewhere?

**evidence:**
- prod already has `code.prod/pitofsuccess.errors/` with the extant failhide rule
- symmetric structure means test rules go in `code.test/pitofsuccess.errors/`
- "pitofsuccess" reflects the philosophy: defaults that lead to success
- "errors" reflects the domain: error patterns

**verdict:** directory name is correct. follows extant structure, reflects philosophy.

---

## issues found

none. all 8 assumptions hold under scrutiny.

---

## why assumptions hold

1. **separate files:** distinct patterns require distinct rules
2. **say section:** most important rules must be always-loaded
3. **handoff:** guard updates belong in their own repo/route
4. **ConstraintError:** absent resource is a caller-fixable constraint
5. **snapshot-alone forbidden:** snapshot is observability, not verification
6. **5 alternatives:** each serves a distinct scenario
7. **rename to failfast:** consistency with failhide and failloud
8. **pitofsuccess.errors/:** follows extant structure

---

## summary

- 8 assumptions examined
- 0 issues found
- all assumptions are deliberate choices, not habits
- each assumption has evidence or explicit vision support
