# self-review r2: has-consistent-mechanisms

review for mechanism duplication or contradiction with extant briefs.

---

## related extant briefs examined

### rule.require.narrative-flow.md

this brief covers **code structure** — flat linear paragraphs, no nested branches, guard-first pattern.

```markdown
.what = structure logic as flat linear code paragraphs — no nested branches
```

**relationship to new briefs:**

| new brief | overlap? | verdict |
|-----------|----------|---------|
| rule.require.orchestrators-as-narrative | complementary | narrative-flow = structure, orchestrators-as-narrative = content |
| rule.forbid.decode-friction-in-orchestrators | complementary | narrative-flow = no nests, decode-friction = no machine code |

the new briefs address *what goes into* each line, not *how lines are structured*. no duplication.

### rule.prefer.transformers-over-conditionals.[lesson].md

this brief covers **control flow** — prefer pipelines/transformers over conditionals for data transformation.

```markdown
- 👎 conditionals add cognitive load for simple transforms
- 👍 transformers compose better and read cleaner
```

**relationship to new briefs:**

the "transformers" in this brief means *functional pipelines* (map/filter/reduce), not *domain transform operations*.

| term in extant brief | term in new briefs | same concept? |
|---------------------|-------------------|-------------|
| transformer | transform | no — different concepts |
| pipeline pattern | extract to named operation | complementary approaches |

the extant brief says: prefer `arr.map(fn)` over `if/else` chains.
the new briefs say: if `arr.map(fn).filter(fn2)` requires decode, extract it.

these are complementary:
1. first, prefer pipelines over conditionals (extant brief)
2. then, if pipeline is complex, extract to named transform (new brief)

no contradiction. no duplication.

---

## other potentially related briefs

### rule.avoid.unnecessary-ifs.md

this brief: minimize code paths via shape-fit and consistent operations.

new briefs: extract decode-friction to named transforms.

**relationship:** orthogonal. unnecessary-ifs is about branch count; decode-friction is about readability of each branch.

### rule.forbid.else-branches.md

this brief: use explicit ifs and early returns, no else.

new briefs: extract decode-friction.

**relationship:** orthogonal. else-branches is about structure; decode-friction is about content.

---

## mechanism consistency check

| new mechanism | extant mechanism | consistent? |
|---------------|------------------|-------------|
| "orchestrators as narrative" | "narrative flow" | yes — different layers |
| "decode-friction" | no prior term | new concept, no conflict |
| "transforms vs orchestrators" | "compute vs imagine" | complementary grains |
| "readability abstraction" | "wet-over-dry" | explicit exception added |

### compute vs imagine distinction

extant brief `define.domain-operation-core-variants.md` defines:
- `compute*` = deterministic computed work
- `imagine*` = probabilistic creative work via context.brain

the new briefs define:
- **transform** = compute decode-friction logic
- **orchestrator** = compose named operations

these are orthogonal grains:
- compute/imagine = determinism axis
- transform/orchestrator = composition axis

a transform can be either compute or imagine. an orchestrator composes both.

no conflict. the grains stack.

---

## verdict

the new briefs:
1. do not duplicate extant mechanisms
2. do not contradict extant rules
3. complement extant briefs (narrative-flow, transformers-over-conditionals)
4. introduce new concepts (decode-friction, readability abstraction) that fill a gap

mechanism consistency holds. no action needed.
