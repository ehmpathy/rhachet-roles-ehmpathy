# self-review r7: has-behavior-declaration-coverage

## behavior declaration coverage review

### source: vision

**vision requirement 1:** mechanic resumes from compaction, sees inherited claim, verifies before action

| vision element | blueprint coverage |
|----------------|-------------------|
| "pauses" before action | brief teaches "claim → verify → act" pattern |
| runs verification command | brief lists verification methods (e.g., `rhx show.gh.test.errors`) |
| finds actual error | brief pattern leads to truth discovery |

**verdict:** [OK] covered

**why it holds:**
- vision describes the "aha" moment: "wait — the summary was just a claim. i should have checked."
- blueprint brief contract teaches exactly this: `.what = verify inherited claims before you act on them`
- the brief's verification methods table gives concrete commands to check claims

---

**vision requirement 2:** brief teaches verification pattern

| vision element | blueprint coverage |
|----------------|-------------------|
| "trust but verify" | brief contract: ## .mantra "trust but verify — don't even trust yourself" |
| pattern: claim → verify → act | brief contract: ## .pattern claim → verify → act |
| antipattern: claim → act | brief contract: ## .antipattern claim → act (orphan processes story) |

**verdict:** [OK] covered

**why it holds:**
- vision user experience section says: "pattern: claim → verify → act" and "antipattern: claim → act"
- blueprint brief contract mirrors this exactly in ## .pattern and ## .antipattern sections
- vision says mantra is "trust but verify — don't even trust yourself"
- blueprint brief contract has ## .mantra with that exact phrase
- the orphan processes story from vision is captured in the antipattern section

---

**vision requirement 3:** optional hook emits reminder after compaction

| vision element | blueprint coverage |
|----------------|-------------------|
| fires after compaction | hook fires via PostCompact event |
| emits nudge | hook contract emits text to stdout |
| lists claim types | hook contract lists: diagnoses, objectives, state claims, conclusions |
| points to brief | hook contract: "see: rule.require.trust-but-verify" |

**verdict:** [OK] covered

**why it holds:**
- vision says hook is "optional" — blueprint marks it "(optional)" in summary
- vision says hook "emits a nudge" — blueprint hook emits 10-line reminder text
- vision says hook "lists claim types that may be stale" — blueprint hook lists 4 types: diagnoses, objectives, state claims, conclusions
- vision says hook "points to the brief" — blueprint hook ends with "see: rule.require.trust-but-verify"
- vision says to use PostCompact event — blueprint uses PostCompact (researched and verified in prior stones)

---

### source: criteria blackbox

**usecase.1:** brief teaches verification pattern

| criterion | blueprint coverage |
|-----------|-------------------|
| brief reminds: verify claims before you act | brief contract: ## .what "verify inherited claims before you act on them" |
| brief provides pattern: claim → verify → act | brief contract: ## .pattern |
| brief provides antipattern: claim → act | brief contract: ## .antipattern |
| brief provides mantra | brief contract: ## .mantra |
| brief lists claim types | brief contract: ## .the rule (table) |
| brief lists verification methods | brief contract: ## .the rule (verification column) |

**verdict:** [OK] all criteria covered

**why it holds:**
- criteria usecase.1 has 6 given/when/then clauses for brief content
- each clause maps to a specific section in the blueprint brief contract:
  - `.what` section satisfies "brief reminds: verify claims"
  - `.pattern` section satisfies "brief provides pattern"
  - `.antipattern` section satisfies "brief provides antipattern"
  - `.mantra` section satisfies "brief provides mantra"
  - `.the rule` table satisfies both "lists claim types" and "lists verification methods"
- no missing clauses

---

**usecase.2:** postcompact hook reminds at critical moment

| criterion | blueprint coverage |
|-----------|-------------------|
| compaction triggers reminder | hook fires via PostCompact event |
| reminder visible before response | PostCompact fires after compaction, before Claude responds |
| reminder lists stale claim types | hook contract lists: diagnoses, objectives, state claims, conclusions |
| reminder points to brief | hook contract: "see: rule.require.trust-but-verify" |
| reminder is concise | hook contract is 10 lines of output |

**verdict:** [OK] all criteria covered

**why it holds:**
- criteria usecase.2 specifies PostCompact event — blueprint uses PostCompact
- criteria says "visible before response" — PostCompact fires after compaction but before Claude responds (verified in research stone)
- criteria says "lists stale claim types" — hook contract lists 4 types (diagnoses, objectives, state claims, conclusions)
- criteria says "points to brief" — hook contract ends with "see: rule.require.trust-but-verify"
- criteria says "concise, not verbose" — hook contract is 10 lines, no walls of text

---

**usecase.3:** pattern applies beyond compaction

| criterion | blueprint coverage |
|-----------|-------------------|
| brief applies to own conclusions | brief contract: ## .mantra "don't even trust yourself" |
| brief applies to external input | brief covers all inherited claims, not just compaction |

**verdict:** [OK] covered by broad scope of brief

**why it holds:**
- criteria usecase.3 tests that brief applies beyond compaction
- blueprint brief contract `.what` says "verify inherited claims" — not "verify compaction claims"
- blueprint brief contract `.mantra` says "don't even trust yourself" — applies to own conclusions
- the brief is scoped broadly to all inherited state, making usecase.3 a natural consequence

---

**edgecases:**

| edgecase | blueprint coverage |
|----------|-------------------|
| claim is correct | brief: verification confirms quickly, minimal time lost |
| verification is expensive | brief: suggest cheap checks first (error logs, file reads) |
| no obvious verification | brief: suggest ask human |

**verdict:** [OK] edgecases addressed in brief contract

**why it holds:**
- criteria edgecases test graceful handling of corner cases
- "claim is correct" → verification is fast and confirms truth, minimal overhead
- "verification is expensive" → blueprint brief contract includes verification methods table that starts with cheap checks (error logs, file reads) before expensive ones
- "no obvious verification" → blueprint brief contract includes "ask human" as escape hatch when uncertain
- all three edgecases from criteria have corresponding coverage in blueprint

---

## summary

| declaration | blueprint coverage | verdict |
|-------------|-------------------|---------|
| vision: verification pattern | brief teaches pattern | [OK] |
| vision: optional hook | hook fires on PostCompact | [OK] |
| criteria usecase.1: brief teaches | all sections covered | [OK] |
| criteria usecase.2: hook reminds | all elements covered | [OK] |
| criteria usecase.3: broader scope | mantra covers self | [OK] |
| criteria edgecases | brief addresses all | [OK] |

## conclusion

all vision and criteria requirements are addressed in the blueprint. no gaps found.

## what i'll remember

- cross-reference each vision element against blueprint line by line
- cross-reference each criterion against blueprint line by line
- cite specific blueprint sections that satisfy each requirement
- edgecases are often overlooked — check them explicitly

