# self-review r6: has-consistent-conventions

sixth pass. what did r5 miss?

---

## pause. what conventions did r5 not check?

r5 checked:
1. file name tags ([define], [philosophy])
2. file name prefixes (define.*, rule.require.*, rule.forbid.*)

r6 checks:
1. directory placement
2. content structure patterns
3. term consistency

---

## deeper checks

### check 1: directory placement

**architect briefs:**

| extant location | extant briefs |
|-----------------|---------------|
| `architect/briefs/practices/` | philosophy.domain-as-a-garden.[philosophy].md |
| `architect/briefs/practices/` | rule.require.solve-at-cause.md |
| `architect/briefs/practices/` | prefer.env_access.prep_over_dev.md |

| new location | new briefs |
|--------------|------------|
| `architect/briefs/practices/` | define.domain-operation-grains.md |
| `architect/briefs/practices/` | philosophy.transform-orchestrator-separation.[philosophy].md |
| `architect/briefs/practices/` | rule.require.orchestrators-as-narrative.md |
| `architect/briefs/practices/` | rule.forbid.decode-friction-in-orchestrators.md |

**verdict:** consistent. all architect briefs go to `practices/`.

**mechanic briefs:**

| extant location | extant briefs |
|-----------------|---------------|
| `mechanic/briefs/practices/code.prod/readable.narrative/` | rule.require.narrative-flow.md |
| `mechanic/briefs/practices/code.prod/readable.narrative/` | rule.forbid.else-branches.md |
| `mechanic/briefs/practices/code.prod/readable.narrative/` | rule.avoid.unnecessary-ifs.md |

| new location | new briefs |
|--------------|------------|
| `mechanic/briefs/practices/code.prod/readable.narrative/` | rule.require.named-transforms.md |
| `mechanic/briefs/practices/code.prod/readable.narrative/` | rule.forbid.inline-decode-friction.md |

**verdict:** consistent. readability briefs go to `readable.narrative/`.

---

### check 2: content structure patterns

**architect brief structure:**

extant `rule.require.solve-at-cause.md`:
- H1: `# rule.require.solve-at-cause`
- H2 sections: `.what`, `.why`, `.pattern`, `.example`, `.enforcement`

new brief outlines follow same pattern:
- H1 matches filename
- H2 sections with dot prefix

**verdict:** consistent.

**mechanic brief structure:**

extant briefs in `readable.narrative/` vary:
- some minimal (rule.forbid.else-branches.md)
- some structured (rule.require.narrative-flow.md)

blueprint doesn't prescribe mechanic content structure. execution will match extant style.

**verdict:** no convention divergence.

---

### check 3: term consistency

**terms introduced:**

| term | usage |
|------|-------|
| transform | grain of domain.operation that computes |
| orchestrator | grain of domain.operation that composes |
| decode-friction | logic that requires mental simulation |

**potential conflicts:**

| term | extant usage | conflict? |
|------|--------------|-----------|
| transform | not used in domain.operations context | no |
| orchestrator | extant uses "composer" informally | no — we formalize |
| decode-friction | new term | no — wisher confirmed |

**verdict:** terms are consistent. "orchestrator" formalizes extant "composer".

---

## issues found in r6

### none beyond r5

r5 found and fixed the [define] tag issue. r6 went deeper on:
- directory placement: consistent
- content structure: consistent
- term usage: consistent

no additional issues found.

---

## why it holds

| convention | extant | new | consistent? |
|------------|--------|-----|-------------|
| directory placement | practices/, readable.narrative/ | same | yes |
| content structure | H1 + H2 with dot prefix | same | yes |
| term: transform | new | n/a | yes (no conflict) |
| term: orchestrator | "composer" informal | formalizes | yes |
| term: decode-friction | new | n/a | yes (wisher term) |

---

## summary

r6 confirmed r5's fix was complete. no additional convention divergences found.

the blueprint aligns with extant conventions for:
- file placement
- content structure
- terminology

r5 fix (remove [define] tag) was the only required change.
