# self-review r3: has-consistent-mechanisms

deeper review for mechanism duplication.

---

## artifacts created in execution

| artifact | type | mechanism introduced |
|----------|------|---------------------|
| define.domain-operation-grains.md | definition | "grains" taxonomy (transform vs orchestrator) |
| philosophy.transform-orchestrator-separation.md | philosophy | book metaphor, compiler metaphor |
| rule.require.orchestrators-as-narrative.md | rule | "narrative" requirement |
| rule.forbid.decode-friction-in-orchestrators.md | rule | "decode-friction" concept |
| rule.require.named-transforms.md | rule | extraction heuristic |
| rule.forbid.inline-decode-friction.md | rule | forbid counterpart |
| wet-over-dry exception | update | readability vs reuse distinction |
| handoff.bhuild-readability-review-rule.md | handoff | detection patterns |

---

## search for duplication

### "grains" taxonomy

searched for extant grain/layer/tier definitions:
- `define.domain-operation-core-variants.md` — defines compute/imagine axis

**verdict:** no duplication. compute/imagine = determinism axis. transform/orchestrator = composition axis. orthogonal.

### "narrative" concept

searched for extant narrative/readability rules:
- `rule.require.narrative-flow.md` — flat linear paragraphs, no nested branches

**verdict:** no duplication. narrative-flow = structure (how lines are arranged). orchestrators-as-narrative = content (what lines contain).

### "decode-friction" concept

searched for extant decode/readability/complexity terms:
- no extant term found

**verdict:** new concept. fills a gap. no prior mechanism to reuse.

### book metaphor

searched for extant metaphors:
- `philosophy.domain-as-a-garden.[philosophy].md` — gardeners vs architects metaphor

**verdict:** no duplication. garden metaphor = evolution of domain objects. book metaphor = structure of orchestrators. different concerns.

### extraction heuristic

searched for extant extraction guidance:
- `rule.prefer.wet-over-dry.md` — rule of three (3+ usages before extract)

**verdict:** complementary, not duplicate. wet-over-dry = reuse extraction. new rule = readability extraction. explicit exception added to wet-over-dry to reconcile.

---

## could we reuse extant components?

| new component | extant candidate | reuse possible? | action |
|---------------|------------------|-----------------|--------|
| "decode-friction" term | none | no | keep new term |
| "grains" taxonomy | compute/imagine | no, orthogonal | keep new taxonomy |
| book metaphor | garden metaphor | no, different concern | keep new metaphor |
| extraction heuristic | rule of three | extended, not replaced | added exception |

---

## verdict

all new mechanisms either:
1. fill gaps where no extant mechanism exists (decode-friction, grains)
2. complement extant mechanisms without duplication (narrative-flow, wet-over-dry)
3. address different concerns than similarly-named extant mechanisms (book vs garden)

no mechanism duplication found. no action needed.
