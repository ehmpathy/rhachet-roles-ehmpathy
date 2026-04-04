# self-review r5: has-consistent-conventions

review for divergence from extant names and patterns.

---

## research: extant conventions

### file name conventions

**define.* briefs:**
| extant | tag |
|--------|-----|
| define.why-ergonomist-not-designer.md | none |
| define.domain-operation-core-variants.md | none |
| define.bivariance-for-generics.[lesson].md | [lesson] |
| define.exec-vs-apply.md | none |
| define.why-seaturtles-love-software.md | none |

**philosophy.* briefs:**
| extant | tag |
|--------|-----|
| philosophy.domain-as-a-garden.[philosophy].md | [philosophy] |

**rule.* briefs:**
| extant | tag |
|--------|-----|
| rule.require.solve-at-cause.md | none |
| rule.require.narrative-flow.md | none |
| rule.forbid.else-branches.md | none |
| rule.forbid.else-branches.[demo].md | [demo] |

### our new briefs

**architect:**
| file | tag |
|------|-----|
| define.domain-operation-grains.[define].md | [define] |
| philosophy.transform-orchestrator-separation.[philosophy].md | [philosophy] |
| rule.require.orchestrators-as-narrative.md | none |
| rule.forbid.decode-friction-in-orchestrators.md | none |

**mechanic:**
| file | tag |
|------|-----|
| rule.require.named-transforms.md | none |
| rule.forbid.inline-decode-friction.md | none |

---

## analysis: convention alignment

### issue found: [define] tag is new

**what:** blueprint uses `define.domain-operation-grains.[define].md` with [define] tag.

**extant pattern:** define.* briefs do NOT use [define] tag. tags used are [lesson], [demo], [philosophy].

**options:**
1. remove [define] tag: `define.domain-operation-grains.md`
2. introduce [define] as new tag convention

**resolution:** remove [define] tag. align with extant convention.

the extant brief `define.domain-operation-core-variants.md` has no tag. follow that pattern.

**fix:** change `define.domain-operation-grains.[define].md` to `define.domain-operation-grains.md`

**status:** FIXED. updated blueprint and vision to remove [define] tag.

---

### non-issue: [philosophy] tag is consistent

**what:** blueprint uses `philosophy.transform-orchestrator-separation.[philosophy].md`

**extant pattern:** `philosophy.domain-as-a-garden.[philosophy].md` uses [philosophy] tag.

**verdict:** consistent. follows extant convention.

---

### non-issue: rule.* names are consistent

**what:** blueprint uses:
- `rule.require.orchestrators-as-narrative.md`
- `rule.forbid.decode-friction-in-orchestrators.md`
- `rule.require.named-transforms.md`
- `rule.forbid.inline-decode-friction.md`

**extant pattern:** rule.require.* and rule.forbid.* without tags (unless [demo]).

**verdict:** consistent. follows extant convention.

---

## issues found

### issue 1: remove [define] tag from architect brief

**file:** `define.domain-operation-grains.[define].md`
**fix:** rename to `define.domain-operation-grains.md`
**status:** FIXED — updated blueprint filediff tree, codepath tree, content outline header, and vision file structure

---

## summary

| convention | extant | new brief | consistent? |
|------------|--------|-----------|-------------|
| define.* tag | none | [define] | no — fix: remove tag |
| philosophy.* tag | [philosophy] | [philosophy] | yes |
| rule.require.* tag | none | none | yes |
| rule.forbid.* tag | none | none | yes |

one convention divergence found and FIXED:
- `define.domain-operation-grains.[define].md` → `define.domain-operation-grains.md`

blueprint and vision updated to align with extant conventions.
