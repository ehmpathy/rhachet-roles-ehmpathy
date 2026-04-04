# self-review r5: has-consistent-mechanisms

fifth pass. what did r4 miss?

---

## pause. did r4 search thoroughly?

r4 found four potential overlaps. r5 asks: are there more?

---

## deeper research: all briefs in readable.narrative/

extant briefs in `readable.narrative/`:
1. `rule.avoid.unnecessary-ifs.md` — minimize conditionals
2. `rule.require.narrative-flow.md` — flat structure, code paragraphs
3. `rule.forbid.else-branches.md` — no else blocks
4. `rule.forbid.else-branches.[demo].md` — example of no else
5. `rule.prefer.early-returns.[demo].md` — example of early returns
6. `rule.prefer.transformers-over-conditionals.[lesson].md` — pipelines vs mazes

new briefs we add:
1. `rule.require.named-transforms.md` — extract decode-friction to named ops
2. `rule.forbid.inline-decode-friction.md` — no machine code in orchestrators

### pattern recognition

| extant briefs | concern |
|---------------|---------|
| avoid unnecessary ifs | control flow |
| narrative flow | code structure |
| forbid else | control flow |
| early returns | control flow |
| transformers over conditionals | code style |

| new briefs | concern |
|------------|---------|
| named transforms | abstraction boundary |
| forbid inline decode-friction | abstraction level |

**insight:** extant briefs are about **control flow structure**. new briefs are about **abstraction boundaries**.

these are orthogonal concerns:
- extant: HOW to structure code (flat, no else, early return)
- new: WHAT to put where (decode-friction in transforms, narrative in orchestrators)

---

## question: could rule.require.named-transforms be part of rule.require.narrative-flow?

| option | description |
|--------|-------------|
| merge | add abstraction guidance to narrative-flow |
| separate | keep as distinct brief |

**analysis:**
- narrative-flow is about structure (paragraphs, flat flow)
- named-transforms is about content (what goes inline vs named)
- a merge would mix two different concerns
- separate briefs enable independent evolution

**verdict:** keep separate. different concerns deserve different briefs.

---

## question: does "forbid inline decode-friction" duplicate "avoid unnecessary ifs"?

| extant brief | new brief |
|--------------|-----------|
| avoid ifs that create branches | forbid inline decode-friction |
| focus: control flow complexity | focus: comprehension complexity |
| example: unnecessary if/else | example: slug.split('.')[0]! |

**analysis:**
- "avoid unnecessary ifs" targets control flow branch points
- "forbid inline decode-friction" targets mental decode cost
- an if can be necessary but still contain decode-friction
- decode-friction can exist without any ifs

**verdict:** not a duplicate. orthogonal concerns.

---

## issues found in r5

### none found beyond r4

r5 confirmed r4's findings with deeper analysis:
1. all extant readable.narrative/ briefs address control flow structure
2. new briefs address abstraction level
3. these concerns are orthogonal, no overlap
4. no additional duplicates discovered

---

## why it holds

| extant concern | new concern | orthogonal? |
|----------------|-------------|-------------|
| control flow structure | abstraction boundary | yes |
| code paragraphs | decode-friction containment | yes |
| flat vs nested | inline vs named | yes |
| conditional style | operation granularity | yes |

the two sets of briefs answer different questions:
- extant: "how should code flow?"
- new: "what should code contain?"

---

## summary

r5 went deeper on the readable.narrative/ directory. found:
- 6 extant briefs, all about control flow structure
- 2 new briefs, both about abstraction boundaries
- zero overlap between concerns

extant and new briefs are complementary. a well-written orchestrator follows BOTH:
- flat structure (narrative-flow, early-returns, no-else)
- named operations (named-transforms, forbid-decode-friction)

no additional duplicates found. r4 findings confirmed.
