# self-review: has-questioned-requirements

review of: 1.vision.md

---

## requirements questioned

### 1. "orchestrators must contain no machine code"

| question | answer |
|----------|--------|
| who said this was needed? | the wisher, explicitly in 0.wish.md |
| what evidence supports this? | concrete example: `slug.split('.')[0]!` requires decode cycles; every read pays the cost |
| what if we didn't do this? | orchestrators remain opaque; humans burn mental energy, robots burn tokens |
| is the scope too large? | **maybe** — is `items.length` really "machine code"? the "allowed" table tries to clarify but may need refinement |
| simpler way to achieve the goal? | this IS the simple way — named operations are fundamental |

**verdict:** holds. the core requirement is sound. edge cases need calibration but the principle stands.

---

### 2. "extract immediately for readability, even if single-use"

| question | answer |
|----------|--------|
| who said this was needed? | wisher made clear this isn't about "deduplication abstraction for reusability (which might be premature here)" |
| what evidence supports this? | every read pays the decode cost; first read isn't special |
| what if we didn't do this? | we'd wait for 3+ usages per wet-over-dry, but readability suffers immediately |
| is the scope too large? | no — single-use extraction is the key insight that distinguishes this from reuse abstraction |
| simpler way? | the "decode cost" heuristic is already simple |

**verdict:** holds. this is the core innovation of the vision — readability abstraction is a distinct category from reuse abstraction.

---

### 3. "leaf operations are pure transformers"

| question | answer |
|----------|--------|
| who said this was needed? | inferred from wish, not explicit |
| what evidence supports this? | purity enables easy tests, clear reason, composition |
| what if we didn't do this? | side effects in leaf operations would complicate orchestrators |
| is the scope too large? | no — transformers should be pure by definition |
| simpler way? | n/a |

**verdict:** holds. this aligns with extant patterns in domain.operations.

---

### 4. the "allowed" vs "forbidden" tables

| question | answer |
|----------|--------|
| who said this was needed? | i drafted this to operationalize the wish |
| what evidence supports this? | extrapolated from wish examples |
| what if we didn't do this? | the rule would be vague; "machine code" needs examples |
| is the scope too large? | **possible issue** — some forbidden items may be too strict |
| simpler way? | the heuristic "do i have to decode this?" is simpler |

**issues found:**

1. **`items.map(x => x.foo)` as forbidden** — this may be too strict. a simple projection is arguably readable. the issue is *chained* transforms like `.map(...).filter(...).reduce(...)`.

2. **`x ?? computeDefault()` as forbidden** — this may be too strict. `x ?? []` is perfectly clear. the issue is when `computeDefault()` has logic worth a name.

3. **"machine code" terminology** — unclear. the wish itself uses this term, but readers may think actual assembly. alternatives: "decode-required logic", "implementation detail", "opaque transform".

---

### 5. relationship to wet-over-dry

| question | answer |
|----------|--------|
| who said this was needed? | i identified this tension when i drafted the vision |
| what evidence supports this? | wet-over-dry says wait for 3+ usages; this rule says extract immediately |
| what if we didn't reconcile? | confusion about when to abstract |
| is the scope too large? | no — this is necessary clarification |
| simpler way? | the "two types of abstraction" frame is already clear |

**verdict:** holds. the reconciliation (readability=immediate, reuse=wait) resolves the tension cleanly.

---

## issues found

### issue 1: forbidden table may be too broad

**what:** some items in the "forbidden" table are too strict (e.g., `items.map(x => x.foo)`, `x ?? []`)

**how fixed:** refine the forbidden table to target *complex* versions:
- forbid: `items.map(x => x.foo).filter(...).reduce(...)`
- allow: `items.map(x => x.foo)` if the projection is simple

**why it matters:** over-strict rules cause pushback and exceptions

### issue 2: "machine code" terminology unclear

**what:** "machine code" sounds like assembly language, but we mean "opaque transform logic"

**how fixed:** consider alternative terminology in the final rule:
- "decode-required logic"
- "implementation detail"
- "opaque transform"
- or define "machine code" explicitly as a term of art

**why it matters:** clarity for readers who encounter this rule for the first time

---

## non-issues that hold

### the core insight: readability abstraction vs reuse abstraction

**why it holds:** this is the key innovation. readability is a first-class reason to abstract, distinct from deduplication. this resolves the tension with wet-over-dry and provides a clear mental model.

### the "decode cost" heuristic

**why it holds:** "do i have to decode this to understand it?" is practical, intuitive, and easy to apply. it doesn't require usage counts or future prediction.

### the examples are clear

**why they hold:** `slug.split('.')[0]!` vs `asKeyrackKeyOrg({ slug })` is immediately obvious. the before/after contrast demonstrates value without explanation.

---

## summary

| requirement | verdict | notes |
|-------------|---------|-------|
| no machine code in orchestrators | holds | core requirement, sound |
| extract immediately for readability | holds | key insight |
| leaf operations are pure | holds | aligns with extant patterns |
| allowed/forbidden tables | **needs refinement** | too strict in places |
| reconciliation with wet-over-dry | holds | clean resolution |
| "machine code" terminology | **needs clarification** | consider alternatives |

overall: the vision is sound. two refinements needed in the blueprint phase.
