# self-review r3: has-questioned-deletables

## the question

> can any feature or component be deleted before we proceed?

"the best code is no code at all" — if we can remove it, we should.

---

## step 1: enumerate blueprint features

from the blueprint, the features are:

1. **rule.forbid.failhide.md (code.prod)** — extant, retain
2. **rule.require.failfast.md (code.prod)** — rename from fail-fast
3. **rule.require.failloud.md (code.prod)** — new file with spec
4. **rule.forbid.failhide.md (code.test)** — new file with spec
5. **rule.require.failfast.md (code.test)** — new file with spec
6. **rule.require.failloud.md (code.test)** — new file with spec
7. **boot.yml changes** — add rules to say sections
8. **behavior guard handoff** — document for guard update

---

## step 2: trace each feature to vision

| feature | traces to | source |
|---------|-----------|--------|
| prod failhide (retain) | vision table row 1 | "extant" |
| prod failfast (rename) | vision table row 2 | "rename from fail-fast" |
| prod failloud (new) | vision table row 3 | "new" |
| test failhide (new) | vision table row 4 | "new" |
| test failfast (new) | vision table row 5 | "new" |
| test failloud (new) | vision table row 6 | "new" |
| boot.yml changes | vision boot.yml requirement | "all 6 rules must be in say section" |
| behavior guard handoff | wish explicit ask | "ensure behavior guard... include each of those rules" |

**all 8 features trace to vision or wish. no features added without explicit ask.**

---

## step 3: question each feature

### could we delete rule.forbid.failhide.md (code.prod)?

no. the vision says "extant" — we must retain it.

### could we delete rule.require.failfast.md (code.prod)?

no. the vision says "rename from fail-fast" — we must rename it.

### could we delete rule.require.failloud.md (code.prod)?

no. the vision says "new" — we must create it.

### could we delete rule.forbid.failhide.md (code.test)?

no. the vision says "new" — we must create it. this is the core ask of the wish: "create a rule to eliminate failhides in tests".

### could we delete rule.require.failfast.md (code.test)?

no. the vision says "new" and the wish emphasizes symmetric terminology. failfast in test = throw ConstraintError on absent resource.

### could we delete rule.require.failloud.md (code.test)?

no. the vision says "new" and the wish emphasizes symmetric terminology. failloud in test = error message must be actionable.

### could we delete boot.yml changes?

no. the vision explicitly states: "all 6 rules must be in boot.yml `say` section (not `ref`) — these are the most important rules".

### could we delete behavior guard handoff?

no. the wish explicitly asks to "ensure that the behavior guard on 5.1 execution and 3.3.1 blueprint both include each of those rules in the failhides review".

---

## step 4: question component complexity

### could the rule specifications be simpler?

examined each specification section:

| section | purpose | could delete? |
|---------|---------|---------------|
| .what | defines what the rule does | no — essential |
| .why | explains rationale | no — required for adoption |
| .forbidden patterns | lists patterns to catch | no — core of rule |
| .legitimate alternatives | guides toward pit of success | no — prevents confusion |
| .enforcement | sets severity | no — enables automation |

**each section serves a distinct purpose. none are redundant.**

### could the forbidden patterns be fewer?

examined the 6 patterns in rule.forbid.failhide.md (code.test):

| pattern | from | could delete? |
|---------|------|---------------|
| `if (!cond) { expect(true).toBe(true) }` | wish example | no — core failhide |
| `if (!hasResource) { return }` | wish example | no — core failhide |
| `expect([0, 1, 2]).toContain(exitCode)` | wish example | no — core failhide |
| `expect.any(Object)` | vision | no — avoids verification |
| empty test body | vision | no — worst failhide |
| `toMatchSnapshot()` alone | research | no — subtle failhide |

**all patterns trace to wish, vision, or research. none invented.**

### could the legitimate alternatives be fewer?

examined the 5 alternatives:

| alternative | purpose | could delete? |
|-------------|---------|---------------|
| `given.runIf(condition)` | explicit conditional test | no — pit of success |
| `then.skipIf(condition)` | explicit conditional skip | no — pit of success |
| `it.skip('reason', ...)` | explicit skip | no — pit of success |
| `throw new ConstraintError(...)` | failfast pattern | no — the answer |
| snapshot with assertions | proper snapshot use | no — prevents confusion |

**all alternatives guide toward pit of success. none redundant.**

---

## step 5: could we combine rules?

### could prod + test failhide rules be one file?

no. they have different forbidden patterns:
- prod: try/catch swallow, error ignore
- test: fake verification, silent skip, accepts errors as valid

different patterns require separate rules.

### could prod + test failfast rules be one file?

no. they have different contexts:
- prod: guard clauses, early throw
- test: throw ConstraintError on absent resource

### could prod + test failloud rules be one file?

no. they have different contexts:
- prod: ConstraintError/MalfunctionError with full context
- test: error must include hint for resolution

---

## issues found

none. all features trace to vision or wish. no components can be deleted without violating requirements.

---

## why it holds

1. **every feature traces:** 8 features, 8 traceable sources
2. **no invented features:** we did not add features the wish did not ask for
3. **each component serves a purpose:** .what, .why, patterns, alternatives, enforcement
4. **each pattern traced:** all forbidden patterns come from wish, vision, or research
5. **separate rules required:** different patterns for prod vs test necessitate separate files

---

## summary

- 0 deletable features found
- 0 deletable components found
- all 8 features trace to vision or wish
- all patterns trace to sources
- simplification would violate requirements
