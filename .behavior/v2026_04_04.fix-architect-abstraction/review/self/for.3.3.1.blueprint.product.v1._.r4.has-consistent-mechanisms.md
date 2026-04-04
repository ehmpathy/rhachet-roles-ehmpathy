# self-review r4: has-consistent-mechanisms

review for new mechanisms that duplicate extant functionality.

---

## research: extant briefs that might overlap

### found: define.domain-operation-core-variants.md

**location:** `src/domain.roles/mechanic/briefs/practices/code.prod/evolvable.domain.operations/`

**what it defines:**
- `compute*` = deterministic computed work (pure functions)
- `imagine*` = probabilistic creative work (via brain.repl)
- "composer operations" = orchestrate one or more leaf operations

### found: rule.require.narrative-flow.md

**location:** `src/domain.roles/mechanic/briefs/practices/code.prod/readable.narrative/`

**what it defines:**
- flat, linear code paragraphs
- no nested branches
- guard clauses, early returns

### found: rule.prefer.transformers-over-conditionals.[lesson].md

**location:** `src/domain.roles/mechanic/briefs/practices/code.prod/readable.narrative/`

**what it defines:**
- prefer pipelines over conditional mazes
- uses "transformer" in the context of data pipelines

---

## analysis: do we duplicate?

### question 1: does define.domain-operation-grains duplicate define.domain-operation-core-variants?

| extant brief | new brief |
|--------------|-----------|
| axis: determinism (compute vs imagine) | axis: readability (transform vs orchestrator) |
| focus: leaf operation type | focus: decode-friction containment |
| purpose: signal testability, dependencies | purpose: enable narrative flow |

**verdict:** not a duplicate. different axes of classification.

extant brief asks: "is this leaf deterministic or probabilistic?"
new brief asks: "does this contain decode-friction or compose named operations?"

both can apply to the same operation. they are complementary, not redundant.

---

### question 2: does rule.require.named-transforms duplicate rule.require.narrative-flow?

| extant brief | new brief |
|--------------|-----------|
| focus: code structure (flat vs nested) | focus: abstraction level (inline vs named) |
| guidance: use early returns, code paragraphs | guidance: extract decode-friction to named ops |
| scope: control flow | scope: operation boundaries |

**verdict:** not a duplicate. complementary concerns.

extant brief: "structure your orchestrator as flat narrative"
new brief: "extract machine code so orchestrator reads as narrative"

one addresses structure, the other addresses content.

---

### question 3: does "orchestrator" conflict with "composer"?

extant brief uses "composer operations" casually (line 17):
> "composer operations that orchestrate leaf operations use normal names"

new brief formally defines "orchestrator" as a grain.

**analysis:**
- extant brief uses "composer" informally, not as formal taxonomy
- new brief formalizes the concept as "orchestrator"
- no contradiction — we formalize what was informal

**verdict:** no conflict. we formalize extant informal concept.

---

### question 4: does "transform" conflict with "transformer"?

extant brief uses "transformer:pipeline" (rule.prefer.transformers-over-conditionals):
> "pipelines are transformers"

new brief uses "transform" for a grain of domain.operations.

**analysis:**
- extant: "transformer" = a style of code (pipeline vs conditional)
- new: "transform" = a grain of operation (compute work vs compose)
- different contexts, different meanings

**verdict:** slight terminology overlap but different concepts. acceptable.

---

## issues found

### issue 1: should note relationship to extant briefs

**what:** new define.domain-operation-grains should acknowledge define.domain-operation-core-variants.

**resolution:** add note to define.domain-operation-grains content outline:

```markdown
## .see also

- define.domain-operation-core-variants — orthogonal classification (compute vs imagine)
```

**status:** flag for execution, not a blueprint change. content outlines are skeletal.

---

## summary

| new mechanism | extant mechanism | duplicate? |
|---------------|------------------|------------|
| define.domain-operation-grains | define.domain-operation-core-variants | no — different axis |
| rule.require.orchestrators-as-narrative | rule.require.narrative-flow | no — different scope |
| rule.require.named-transforms | none | no |
| "orchestrator" term | "composer" (informal) | no — we formalize it |
| "transform" term | "transformer" (pipeline context) | no — different concept |

**no duplicates found.** new briefs are complementary to extant mechanisms.

the new briefs add a readability axis to the extant determinism axis for domain.operations.
