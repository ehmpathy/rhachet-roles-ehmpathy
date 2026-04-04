# self-review r2: has-questioned-assumptions (deeper reflection)

## reflection on r1

in r1, I identified several assumptions and flagged issues. now I need to go deeper: did I miss any assumptions? are my conclusions sound?

## deeper review

### hidden assumption A: "rules are the right mechanism"

**what do we assume?**
that brief rules are the correct way to address test failhides.

**what if the opposite were true?**
what if a linter, CI check, or test framework plugin would be better?

**evidence:**
- extant prod failhide rule works via review (human + guard)
- linters can catch static patterns but miss semantic failhides
- test framework plugins (jest custom matchers) could enforce at runtime

**verdict: holds** — rules + guards work for this because failhides are semantic (not syntactic). a linter can't know if `expect([0,1]).toContain(x)` is intentional or a failhide. human + guard review can.

---

### hidden assumption B: "failhides in tests are worse than absent tests"

**what do we assume?**
the vision says "failhides in tests are worse than no tests at all".

**what if the opposite were true?**
what if a failhide test at least exercises some code paths, which is better than zero tests?

**evidence:**
- failhide tests create false confidence: "we have tests, so this is safe"
- absent tests create no false confidence: "we have no tests, so be careful"
- false confidence is more dangerous than acknowledged uncertainty

**verdict: holds** — the claim is correct. a failhide test is worse because it masks risk.

---

### hidden assumption C: "the wish examples are representative"

**what do we assume?**
that the three patterns in the wish cover the majority of test failhide cases.

**what if the opposite were true?**
what if there are other common failhide patterns we haven't considered?

**evidence:**
other patterns I can imagine:
- `expect.any(Object)` used to avoid verification
- `try { ... } catch { /* pass anyway */ }` in tests
- empty test bodies: `it('does task', () => {})`
- `beforeEach` that silently swallows setup errors

**verdict: issue** — the vision should include more patterns, or at least note that the wish examples are not exhaustive.

**fix applied**: will add note to vision about pattern completeness.

---

### hidden assumption D: "behavior guards can detect failhides"

**what do we assume?**
that the behavior guard's rule-based review can catch test failhides.

**what if the opposite were true?**
failhides are semantic — they require context to detect. can a rule-based review really catch them?

**evidence:**
- the guard runs `npx rhachet run --skill review --rules ...`
- this uses AI review, not static analysis
- AI can understand semantic patterns

**verdict: holds** — the guard uses AI review, which can understand semantic patterns like "this code path passes without verification".

---

### hidden assumption E: "we need both forbid and require rules"

**what do we assume?**
that we need `rule.forbid.failhide` (don't do X) AND `rule.require.failfast` (do Y).

**what if the opposite were true?**
what if a single rule covers both? "don't failhide" implies "do failfast".

**evidence:**
- extant prod code has both: `rule.forbid.failhide` + `rule.require.fail-fast`
- they serve different purposes:
  - forbid: tells you what NOT to do (patterns to avoid)
  - require: tells you what TO do (patterns to use)
- both are useful for different learner types

**verdict: holds** — symmetric forbid/require rules are the established pattern.

---

## summary

| assumption | r1 verdict | r2 verdict | action |
|------------|------------|------------|--------|
| rules are right mechanism | not reviewed | holds | confirmed |
| failhides worse than absent | not reviewed | holds | confirmed |
| wish examples representative | not reviewed | issue | note in vision |
| guards can detect failhides | not reviewed | holds | confirmed |
| need forbid + require rules | not reviewed | holds | confirmed |

## fix applied

I will update the vision to note that the wish examples are not exhaustive and more patterns may exist. this will be captured in the criteria phase when we enumerate patterns.

## conclusion

the vision assumptions hold. the main refinement needed is a note that more failhide patterns exist beyond the wish examples. this is expected — the wish provides concrete examples of the problem, not an exhaustive taxonomy.
