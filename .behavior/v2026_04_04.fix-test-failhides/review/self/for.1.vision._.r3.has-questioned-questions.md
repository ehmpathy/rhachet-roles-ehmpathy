# self-review r3: has-questioned-questions (deep reflection)

## what I missed in r2

I reviewed the vision again and found questions hidden in the "what is awkward?" section that I didn't fully address. let me surface them.

---

## hidden question: "how do we distinguish legitimate conditional logic from failhides?"

the vision says:
> "the line between 'graceful degradation' and 'failhide' may not always be obvious — need clear examples to train intuition"

**can this be answered via logic now?**
yes, partially. I can articulate the distinction:

| pattern | verdict | why |
|---------|---------|-----|
| `if (cond) { expect(a) } else { expect(b) }` | legitimate | both branches verify |
| `if (cond) { expect(a) }` | failhide | one branch does no verification |
| `if (!cond) { return }; expect(...)` | legitimate | early return is explicit skip (though `it.skip` is better) |
| `if (!cond) { expect(true).toBe(true) }` | failhide | verification is fake |

**answer:** the test is: "does every code path either verify behavior or explicitly skip/fail?"

**issue found:** this distinction should be in the vision, not just implied.

**status: [answered]** — I can articulate the distinction now, but need to add it to vision.

---

## hidden question: "what about noise from overly broad guard scope?"

the vision's awkward section says:
> "check all test code may be noisy"

**can this be answered via logic now?**
yes. noise is a rule tune problem, not a scope problem. the guard should run on all tests, but the rule should focus on high-confidence patterns.

low-risk patterns (may be intentional):
- `expect.any(String)` — could be legitimate schema check
- `expect([0, 1]).toContain(x)` — could be valid exit codes

high-risk patterns (almost always wrong):
- `expect(true).toBe(true)` — fake verification
- `if (!cond) { return }` without test annotation — silent skip
- empty test body — no verification at all

**answer:** scope is all tests; rule prioritizes high-confidence patterns first.

**status: [answered]** — clarified in vision via "if noise is a concern, tune the rule".

---

## verification of prior triage

| question | r2 status | r3 verification |
|----------|-----------|-----------------|
| separate vs unified rules? | [answered] | ✓ holds — structural constraint |
| failloud vs failfast term? | [wisher] | ✓ holds — wish proposed new term |
| guard scope? | [answered] | ✓ holds — all tests, tune rule for noise |
| absent resources: fail or skip? | [wisher] | ✓ holds — policy decision |
| how to distinguish legit conditionals? | (hidden) | [answered] — both branches must verify |

---

## fix applied

**issue:** the vision said "need clear examples to train intuition" but did not provide them.

**fix:** updated the vision's "conditional skip vs conditional pass" section to include:
1. a clear test question: "does every code path either verify behavior or explicitly skip/fail?"
2. a table of patterns with verdicts and reasons
3. the key insight: "silent pass-through is the failhide"

**how I will remember this for next time:**
- when the vision says "need X" or "unclear", that's an implicit question
- if I can answer it now, I should answer it and update the vision
- don't leave "need" statements in the vision — answer them or mark them [research] or [wisher]

---

## prior questions: why they hold

**"separate vs unified rules?" → [answered]**
why it holds: the directory structure `code.prod/` vs `code.test/` is an extant constraint. this is not a preference — it's architecture. the answer is forced by structure.

**"failloud vs failfast term?" → [wisher]**
why it holds: the wish explicitly proposes "failloud". even though I can argue "failfast" works for both, I cannot override what the wisher proposed without confirmation.

**"guard scope (all tests vs subset)?" → [answered]**
why it holds: failhides can occur in any test type. scope is all tests. noise is a rule problem, not a scope problem.

**"absent resources: fail or skip?" → [wisher]**
why it holds: both are valid (neither is a failhide). this is policy, not logic. only the wisher can decide.

**"how to distinguish legit conditionals?" → [answered]**
why it holds: I articulated the distinction via logic: "every path must verify or announce skip". this is now in the vision.

---

## summary

r2 missed a hidden question in the "what is awkward?" section. r3 surfaces it, answers it, and confirms the fix was applied to the vision.

the key insight: every code path must either verify behavior or explicitly skip/fail — silent pass-through is the failhide.

all questions are now triaged: 3 answered, 2 require wisher input.
