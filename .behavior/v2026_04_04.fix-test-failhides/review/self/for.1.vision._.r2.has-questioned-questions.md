# self-review r2: has-questioned-questions

## questions from vision

I'll review each question from the vision's "open questions & assumptions" section and triage.

---

### question 1: "should we create separate rules (prod + test) or unified rule with scoped examples?"

**can this be answered via logic now?**
yes.

the directory structure already separates `code.prod/` from `code.test/`. the extant rules follow this pattern. a unified rule would break the structure.

**answer:** separate rules, one in `code.prod/`, one in `code.test/`.

**status: [answered]**

---

### question 2: "is 'failloud' the right term, or should we reuse 'failfast' for tests too?"

**can this be answered via logic now?**
partially. I can reason about it, but the wisher explicitly proposed "failloud" in the wish.

**can this be answered via extant docs or code now?**
let me check if there's precedent for "failloud" vs "failfast" terminology.

the extant rules use:
- `rule.forbid.failhide` — for prod
- `rule.require.fail-fast` — for prod

there is no "failloud" term in extant briefs.

**does only the wisher know the answer?**
yes — the wisher explicitly proposed "failloud" as a distinct term. I should confirm whether they want a new term or to reuse "failfast".

**status: [wisher]** — need confirmation on terminology preference.

---

### question 3: "should the guard run on all test file changes, or only integration/acceptance tests?"

**can this be answered via logic now?**
yes.

failhides can occur in any test type:
- unit tests: `if (condition) { expect(true).toBe(true) }`
- integration tests: `if (!apiKey) { expect(exitCode).toContain([0,1,2]) }`
- acceptance tests: same patterns

the guard should run on all test files. if noise is a concern, we can tune the rule to focus on high-risk patterns.

**answer:** all test files.

**status: [answered]**

---

### additional question from r2: "should absent resources cause test failures or explicit skips?"

**can this be answered via logic now?**
partially.

the wish says tests should "fail loudly". but there's nuance:
- test failure = blocks ci = forces fix
- explicit skip = visible notice = allows ci to pass

both are "loud" — neither is a failhide. the question is: which is the pit of success?

**does only the wisher know the answer?**
yes — this is a policy decision. should absent api keys block ci, or be a visible notice?

**status: [wisher]** — need confirmation on failure vs skip preference.

---

## summary

| question | status | next step |
|----------|--------|-----------|
| separate vs unified rules | [answered] | separate rules |
| failloud vs failfast term | [wisher] | ask wisher |
| guard scope (all tests vs subset) | [answered] | all tests |
| absent resources: fail or skip | [wisher] | ask wisher |

## fixes applied

I will update the vision to mark each question with its status.
