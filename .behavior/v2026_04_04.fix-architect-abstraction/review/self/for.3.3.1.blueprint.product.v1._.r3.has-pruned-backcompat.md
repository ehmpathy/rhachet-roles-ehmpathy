# self-review r3: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## backwards compat concerns identified

### concern 1: wet-over-dry update

**what:** we add an exception to `rule.prefer.wet-over-dry`

**backwards compat question:** does this change how the extant rule applies?

| before | after |
|--------|-------|
| wait for 3+ usages before abstract | same, EXCEPT readability abstraction triggers immediately |

**analysis:**
- the core rule (wait for 3+ for reuse) remains intact
- we add an exception for readability abstraction
- this is an *extension*, not a *change*
- extant code that follows wet-over-dry is still correct

**did wisher explicitly request?** yes — "we must make sure that all our briefs are coherent"

**verdict:** not a backwards compat issue. extension, not change.

---

### concern 2: new terminology "transforms"

**what:** we introduce "transforms" as a term for one grain of domain.operations

**backwards compat question:** does this conflict with extant terminology?

**analysis:**
- checked extant briefs: no prior use of "transforms" in this context
- "leaf operations" was prior term in some discussions
- "transformers" was wisher's original term in wish
- wisher confirmed "transforms" as preferred

**did wisher explicitly request?** yes — "transforms vs orchestrators" and "transforms"

**verdict:** no conflict. new terminology for new concept.

---

### concern 3: decode-friction vs machine-code

**what:** we use "decode-friction" instead of "machine code"

**backwards compat question:** does this conflict with extant usage?

**analysis:**
- wisher originally said "machine code"
- vision evolved to "decode-friction" as clearer term
- wisher confirmed via "decode-friction-in-orchestrators"
- no extant briefs use either term

**did wisher explicitly request?** yes — wisher confirmed the term change

**verdict:** no conflict. evolved terminology, wisher confirmed.

---

### concern 4: new briefs might conflict with extant briefs

**what:** we add 6+ new briefs

**backwards compat question:** do any new briefs conflict with extant briefs?

**analysis:**
- architect briefs: new content, no extant briefs in this space
- mechanic briefs in `readable.narrative/`: extant briefs exist, let me check

extant briefs in `readable.narrative/`:
- `rule.require.narrative-flow.md` — about flat code structure, not about transforms
- `rule.avoid.unnecessary-ifs.md` — about control flow
- `rule.forbid.else-branches.md` — about control flow

new briefs:
- `rule.require.named-transforms.md` — about abstraction level
- `rule.forbid.inline-decode-friction.md` — about abstraction level

**verdict:** no conflict. new briefs address different concern (abstraction) vs extant (control flow).

---

## issues found

### none

all backwards compat concerns are either:
1. extensions, not changes (wet-over-dry)
2. new terminology for new concepts (transforms)
3. wisher-confirmed evolution (decode-friction)
4. non-conflict new content (new briefs)

---

## why it holds

| concern | why not an issue |
|---------|------------------|
| wet-over-dry update | extension, not change; core rule intact |
| "transforms" term | new term for new concept; wisher confirmed |
| "decode-friction" term | evolved from "machine code"; wisher confirmed |
| new briefs | address different concern than extant briefs |

---

## summary

no backwards compat issues found. all changes are either:
- additive (new briefs, new exception)
- wisher-confirmed terminology

no extant behavior is broken by this blueprint.
