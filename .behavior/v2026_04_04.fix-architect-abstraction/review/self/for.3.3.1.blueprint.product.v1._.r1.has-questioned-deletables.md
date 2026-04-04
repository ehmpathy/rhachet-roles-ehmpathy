# self-review r1: has-questioned-deletables

review of: 3.3.1.blueprint.product.v1.i1.md

---

## features questioned

### feature 1: define.domain-operation-grains.[define].md

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — wisher said "leaf domain.operations = transformers" and "all other domain.operations = orchestrators" |
| wisher asked for it? | **yes** — explicitly requested the two grains be defined |
| assumed? | no |

**verdict:** keep. core structural definition.

---

### feature 2: philosophy.transform-orchestrator-separation.[philosophy].md

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — vision includes book metaphor, compiler metaphor, "c-a-t" example |
| wisher asked for it? | **yes** — wisher said "this is a really good analogy; lets include that in the philosophy" |
| assumed? | no |

**verdict:** keep. wisher explicitly requested.

---

### feature 3: rule.require.orchestrators-as-narrative.md

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — wisher said "it should all read like a book, narrative flow" |
| wisher asked for it? | **yes** — explicitly requested require + forbid rules |
| assumed? | no |

**verdict:** keep. core rule.

---

### feature 4: rule.forbid.decode-friction-in-orchestrators.md

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — wisher said "there should never be machine code in orchestration layer codepaths" |
| wisher asked for it? | **yes** — explicitly requested require + forbid rules |
| assumed? | no |

**verdict:** keep. core rule.

---

### feature 5: rule.require.named-transforms.md (mechanic level)

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — wisher confirmed dual-level structure (architect + mechanic) |
| wisher asked for it? | **yes** — "lets also create a brief at the architect grain... put this inside that for the mechanic" |
| assumed? | no |

**verdict:** keep. mechanic-level implementation guidance.

---

### feature 6: rule.forbid.inline-decode-friction.md (mechanic level)

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — same as above, mechanic-level forbid rule |
| wisher asked for it? | **yes** — dual-level structure confirmed |
| assumed? | no |

**verdict:** keep. mechanic-level enforcement.

---

### feature 7: update rule.prefer.wet-over-dry.md

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — wisher said "we must make sure that all our briefs are coherent in their preference to abstract for readability" |
| wisher asked for it? | **yes** — explicitly requested |
| assumed? | no |

**verdict:** keep. required for coherence.

---

### feature 8: handoff.bhuild-readability-review-rule.md

| question | answer |
|----------|--------|
| traces to requirement? | **yes** — wisher said "lets include a todo requirement to create a handoff to add a rule to review this to the bhuild repo" |
| wisher asked for it? | **yes** — explicitly requested |
| assumed? | no |

**verdict:** keep. wisher explicitly requested.

---

## components questioned

### can any component be deleted?

| component | can delete? | why |
|-----------|-------------|-----|
| architect briefs | no | core structural foundation |
| mechanic briefs | no | implementation guidance, wisher confirmed dual-level |
| wet-over-dry update | no | required for coherence |
| bhuild handoff | no | wisher explicitly requested |

### did we optimize a component that shouldn't exist?

no. all components are minimal and trace to wisher requirements.

### what is the simplest version that works?

the blueprint is already minimal:
- 4 architect briefs (define, philosophy, require, forbid)
- 2 mechanic briefs (require, forbid)
- 1 update to extant brief
- 1 handoff

no further simplification possible without deletes to wisher-requested features.

---

## summary

| feature | verdict |
|---------|---------|
| define.domain-operation-grains | keep — core definition |
| philosophy.transform-orchestrator-separation | keep — wisher requested |
| rule.require.orchestrators-as-narrative | keep — core rule |
| rule.forbid.decode-friction-in-orchestrators | keep — core rule |
| rule.require.named-transforms (mechanic) | keep — dual-level |
| rule.forbid.inline-decode-friction (mechanic) | keep — dual-level |
| update wet-over-dry | keep — coherence |
| bhuild handoff | keep — wisher requested |

**no deletables found.** all features trace to wisher requirements.
