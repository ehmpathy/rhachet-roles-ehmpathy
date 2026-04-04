# self-review: has-questioned-requirements

## requirements reviewed

### requirement 1: create a rule for test failhides (rule.forbid.failhide.test.md)

**who said this was needed?**
the wish explicitly states: "we need to create a rule to eliminate failhides in tests"

**what evidence supports this?**
the wish includes concrete examples of failhide patterns found in real tests:
- `expect([0, 1, 2]).toContain(result.exitCode)` — accepts any exit code
- `if (!hasApiKey) { expect(...) }` — conditional assertions that pass when key absent

**what if we didn't do this?**
tests would continue to silently pass without verified behavior. mechanics would have false confidence. the wish examples show this already happened.

**is the scope too large?**
no — a single rule document is appropriate scope.

**could we achieve the goal simpler?**
no — a rule is the standard mechanism for this. we already have rule.forbid.failhide for prod code, so symmetry with test code is natural.

**verdict: holds** ✓

---

### requirement 2: symmetric terminology (failhide/failfast/failloud)

**who said this was needed?**
the wish says: "ensure that our rules clearly make symmetric: failhide (forbid) vs failfast (require) vs failloud (require)"

**what evidence supports this?**
terminology consistency aids recall. the prod rules use failhide/failfast, so test rules should follow the same pattern.

**what if we didn't do this?**
inconsistent terminology would confuse mechanics. "is it fail-fast in tests too? or fail-loud? or just fail?"

**is the scope too large?**
no — terminology is part of the rule documentation, not additional work.

**could we achieve the goal simpler?**
**issue found**: do we need a new term "failloud"?

the wish proposes three terms, but prod code already uses only two:
- failhide (forbid) — hide errors
- failfast (require) — exit early

in tests, "failfast" could mean "fail the test immediately" rather than "exit the process". the semantics transfer naturally. a third term "failloud" adds cognitive load without clear benefit.

**verdict: issue** — recommend use of `failfast` for both prod and test, with scoped examples in each rule.

---

### requirement 3: separate rules for prod and test

**who said this was needed?**
the wish says: "create both a failhide forbid rule for prod codepaths and test codepaths each"

**what evidence supports this?**
prod and test have different patterns:
- prod: `try/catch` that swallows errors
- test: `if (!condition) { expect(...) }` that passes without verification

**what if we didn't do this?**
a single rule would be too long and unclear, with mixed prod and test patterns.

**could we achieve the goal simpler?**
**issue found**: do we need two separate files, or one file with two sections?

the extant `rule.forbid.failhide.md` is already split into `.pt1.md` and `.pt2.md` partials. we could add a `.pt3.md` for test patterns, to keep it unified.

however, the wish explicitly says "create both... each" which implies separate files. and the directory structure separates `code.prod/` from `code.test/`, so separate files follows the pattern.

**verdict: holds** ✓ — separate files aligns with directory structure.

---

### requirement 4: update behavior guards to include test rules

**who said this was needed?**
the wish says: "ensure that the behavior guard on 5.1 execution and 3.3.1 blueprint both include each of those rules"

**what evidence supports this?**
current guard uses: `--rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.*.md'`

this only catches prod rules. test rules live in `code.test/`, so the guard needs to include both.

**what if we didn't do this?**
the new test failhide rule would exist but never be enforced automatically.

**could we achieve the goal simpler?**
the proposed glob `code.{prod,test}/**/rule.forbid.failhide*.md` is already minimal.

**verdict: holds** ✓

---

## summary

| requirement | verdict | action |
|-------------|---------|--------|
| test failhide rule | holds | proceed |
| symmetric terminology | issue | reconsider "failloud" — may just use "failfast" for both |
| separate prod/test rules | holds | proceed |
| update behavior guards | holds | proceed |

## issue resolution

**issue: "failloud" terminology**

on reflection, "failloud" is awkward. the wish may have proposed it to distinguish test behavior, but:
- "failfast" works for both: "exit early in prod" / "fail test early in test"
- a third term increases cognitive load
- the distinction is in the examples, not the concept

**proposed fix**: use `rule.require.failfast.test.md` instead of `rule.require.failloud.test.md`. the rule.forbid.failhide pattern already has prod/test variants, so failfast can too.

will flag this in questions for wisher.
