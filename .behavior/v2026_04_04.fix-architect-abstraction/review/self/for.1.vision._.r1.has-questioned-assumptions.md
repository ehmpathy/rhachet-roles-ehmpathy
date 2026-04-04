# self-review: has-questioned-assumptions

review of: 1.vision.md

---

## assumptions questioned

### assumption 1: "readability abstraction is distinct from reuse abstraction"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that these are truly separate categories, not a spectrum |
| what evidence supports this? | the wish explicitly says "the issue here isn't deduplication abstraction... instead the issue here is for readability abstraction" |
| what if the opposite were true? | if they're the same category, we'd apply wet-over-dry uniformly and wait for 3+ usages |
| did the wisher actually say this? | **yes** — the wish draws this distinction explicitly |
| what exceptions exist? | some cases may be both (readable AND reused) — but that's fine, they're not mutually exclusive |

**verdict:** holds. the wisher explicitly made this distinction. this is not an inference — it's a stated requirement.

---

### assumption 2: "robots benefit from named operations (token efficiency)"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that llms spend fewer tokens to comprehend `asKeyrackKeyOrg({ slug })` than `slug.split('.')[0]!` |
| what evidence supports this? | the wish says "for robots, thats cash and tokens spent -> datacenter waste -> climate pollution" |
| what if the opposite were true? | llms might parse inline code as efficiently as named calls — this would weaken the argument |
| did the wisher actually say this? | **yes** — but without citation to research |
| what exceptions exist? | very simple inline operations might be equally comprehensible to llms |

**verdict:** likely holds, but unproven. the wisher stated it as fact. we marked it as "what must we research externally" in the vision. acceptable to proceed with this assumption while flagged for validation.

---

### assumption 3: "orchestrators should read like prose / narrative flow"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that narrative-style code is better than dense technical code |
| what evidence supports this? | the wish says "it should all read like a book, narrative flow" |
| what if the opposite were true? | some might argue dense code is more efficient for experts |
| did the wisher actually say this? | **yes** — explicitly |
| what exceptions exist? | performance-critical inner loops might warrant denser code |

**verdict:** holds. the wisher explicitly stated this. the scope is orchestrators, not inner loops.

---

### assumption 4: "leaf operations are pure (no side effects)"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that "transformers" (leaf operations) should have no side effects |
| what evidence supports this? | inferred from the wish, not explicitly stated |
| what if the opposite were true? | impure leaf operations could work, but would complicate orchestrator logic |
| did the wisher actually say this? | **no** — this is an inference |
| what exceptions exist? | a leaf operation that logs could be useful, though it's a side effect |

**issue found:** this assumption was not stated by the wisher. i inferred it from the pattern. however, it aligns with extant domain.operations practices and makes sense for "transformers". decision: keep as assumption, mark as "needs validation with wisher".

---

### assumption 5: "property access like `input.slug` is allowed"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that simple property access doesn't require a named operation |
| what evidence supports this? | the wish focuses on transforms like `split()[0]`, not property access |
| what if the opposite were true? | we'd need operations like `getSlugFromInput({ input })` — absurd |
| did the wisher actually say this? | **no** — but the examples clearly show this isn't the target |
| what exceptions exist? | none obvious — property access is universally readable |

**verdict:** holds. the wish examples target transforms, not property access. this is a reasonable inference from the examples.

---

### assumption 6: "the `as{DomainConcept}` pattern is the right name pattern"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that `as{DomainConcept}` is the right verb prefix for transformers |
| what evidence supports this? | the wish examples show `asKeyrackKeyOrg`, `asKeyrackKeyEnv`, `asKeyrackKeyName` |
| what if the opposite were true? | we might use `get{DomainConcept}` or `to{DomainConcept}` instead |
| did the wisher actually say this? | **yes** — the extant pattern is `as*` |
| what exceptions exist? | verbs like `get` are for retrieval, `as` for transformation — this aligns with extant rules |

**verdict:** holds. the wish shows the `as*` pattern, which aligns with extant verb conventions.

---

### assumption 7: "this rule applies to all orchestrators"

| question | answer |
|----------|--------|
| what do we assume without evidence? | that the rule applies uniformly to all layers that orchestrate |
| what evidence supports this? | the wish uses "orchestration layer codepaths" |
| what if the opposite were true? | we might only apply this to certain layers (e.g., domain.operations but not contract/) |
| did the wisher actually say this? | **partially** — "orchestration layer" is mentioned but not scoped precisely |
| what exceptions exist? | contract/ layer might have different constraints |

**issue found:** scope is underspecified. the wish says "orchestration layer codepaths" but doesn't enumerate which layers qualify. decision: add to "what must we validate with the wisher" — already present in the vision.

---

## issues found

### issue 1: "leaf operations are pure" — not stated by wisher

**what:** i assumed leaf operations should be pure, but the wisher didn't say this

**how fixed:** already listed in "what must we validate with wisher" section. no change needed to vision, but should confirm this assumption.

**why it matters:** if the wisher allows impure leaf operations, the rule would need adjustment.

### issue 2: scope of "orchestrators" — underspecified

**what:** the wish says "orchestration layer codepaths" but doesn't define which layers qualify

**how fixed:** already listed in "what must we validate with wisher" as "does this apply to all orchestrators, or specific layers?"

**why it matters:** without scope clarity, mechanics won't know where to apply the rule.

---

## non-issues that hold

### "readability abstraction is distinct from reuse abstraction"

**why it holds:** the wisher explicitly made this distinction. it's not an inference — it's a stated requirement.

### "robots benefit from named operations"

**why it holds:** the wisher stated this. flagged for external research but acceptable to proceed.

### "orchestrators should read like prose"

**why it holds:** the wisher said "it should all read like a book, narrative flow" — direct quote.

### "property access is allowed"

**why it holds:** the wish targets transforms (`split()[0]`), not property access (`input.slug`). reasonable inference from examples.

### "`as{DomainConcept}` pattern"

**why it holds:** the wish shows this pattern; it aligns with extant verb conventions.

---

## summary

| assumption | verdict | notes |
|------------|---------|-------|
| readability vs reuse abstraction | holds | wisher stated explicitly |
| robots benefit from named ops | holds | stated, flagged for research |
| narrative flow | holds | wisher stated explicitly |
| leaf operations are pure | **needs validation** | inferred, not stated |
| property access allowed | holds | reasonable inference |
| `as*` pattern | holds | shown in wish, aligns with extant |
| scope = all orchestrators | **needs validation** | underspecified |

overall: two assumptions need validation with wisher. both are already captured in the vision's "what must we validate" section.
