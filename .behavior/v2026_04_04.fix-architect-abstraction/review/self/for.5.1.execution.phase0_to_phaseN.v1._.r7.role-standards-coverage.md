# self-review r7: role-standards-coverage

review for coverage — are all relevant patterns present that should be present?

---

## rule directories enumerated

| directory | relevant? | coverage check |
|-----------|-----------|----------------|
| lang.terms | yes | terminology defined, no jargon |
| lang.tones | yes | lowercase, no shouts |
| code.prod/readable.narrative | yes | new briefs placed here |
| code.prod/evolvable.architecture | yes | wet-over-dry updated |
| code.test/* | no | these are briefs, not code |
| all others | no | briefs are markdown, not typescript |

---

## coverage check: brief structure patterns

### pattern: all briefs must have `.what` section

| file | has `.what`? | why this holds |
|------|-------------|----------------|
| define.domain-operation-grains.md | yes | lines 3-10 |
| philosophy.transform-orchestrator-separation.[philosophy].md | yes | lines 3-5 |
| rule.require.orchestrators-as-narrative.md | yes | lines 3-5 |
| rule.forbid.decode-friction-in-orchestrators.md | yes | lines 3-5 |
| rule.require.named-transforms.md | yes | lines 3-5 |
| rule.forbid.inline-decode-friction.md | yes | lines 3-5 |

**verdict:** all briefs have `.what` sections.

---

### pattern: rule briefs must have `.enforcement` section

| file | has `.enforcement`? | level stated? |
|------|--------------------| --------------|
| rule.require.orchestrators-as-narrative.md | yes (lines 45-47) | yes — blocker |
| rule.forbid.decode-friction-in-orchestrators.md | yes (lines 36-38) | yes — blocker |
| rule.require.named-transforms.md | yes (lines 42-44) | yes — blocker |
| rule.forbid.inline-decode-friction.md | yes (lines 41-43) | yes — blocker |

**verdict:** all rule briefs have explicit enforcement with severity level.

---

### pattern: briefs should have `.see also` for cross-references

| file | has `.see also`? | references relevant briefs? |
|------|-----------------|----------------------------|
| define.domain-operation-grains.md | yes | 3 cross-refs to related rules |
| philosophy.transform-orchestrator-separation.[philosophy].md | yes | 3 cross-refs to related briefs |
| rule.require.orchestrators-as-narrative.md | yes | 3 cross-refs |
| rule.forbid.decode-friction-in-orchestrators.md | yes | 4 cross-refs |
| rule.require.named-transforms.md | yes | 3 cross-refs |
| rule.forbid.inline-decode-friction.md | yes | 3 cross-refs |

**verdict:** all briefs have `.see also` sections with relevant cross-references.

---

## coverage check: content completeness

### pattern: rules must have examples

**rule.require.orchestrators-as-narrative.md:**
- has good example (lines 18-27): `getActiveUserEmails`, `isEligibleForPremiumFeatures`
- has bad example (lines 31-43): inline filter/map/sort, complex boolean
- **verdict:** examples present and contrastive

**rule.forbid.decode-friction-in-orchestrators.md:**
- has examples table (lines 20-28): string parse, date extract, aggregate, pipeline, boolean
- **verdict:** examples cover 5 categories

**rule.require.named-transforms.md:**
- has examples table (lines 20-27): 4 before/after pairs
- **verdict:** examples present

**rule.forbid.inline-decode-friction.md:**
- has "what is decode-friction" section (lines 14-23): 6 patterns
- has "what is NOT decode-friction" section (lines 25-32): 4 patterns
- **verdict:** examples cover both positive and negative cases

---

### pattern: require/forbid rules should have paired counterpart

| require rule | paired forbid rule | present? |
|--------------|--------------------------|----------|
| rule.require.orchestrators-as-narrative | rule.forbid.decode-friction-in-orchestrators | yes |
| rule.require.named-transforms | rule.forbid.inline-decode-friction | yes |

**verdict:** both require rules have their forbid counterparts. the dual structure is complete.

---

### pattern: mechanic briefs must defer to architect briefs for structural principles

**rule.require.named-transforms.md** references:
- `define.domain-operation-grains` (line 50) — architect-level definition
- `rule.require.get-set-gen-verbs` (line 31) — defers for name conventions

**rule.forbid.inline-decode-friction.md** references:
- `define.domain-operation-grains` (line 49) — architect-level definition

**verdict:** mechanic briefs properly defer to architect-level definitions. no structural principles duplicated.

---

### pattern: wet-over-dry update must reconcile with new rule

**rule.prefer.wet-over-dry.md** update (lines 120-137):
- explains the distinction: reuse abstraction (wait for 3+) vs readability abstraction (immediate)
- includes comparison table
- cross-references `rule.forbid.decode-friction-in-orchestrators` and `rule.forbid.inline-decode-friction`

**verdict:** reconciliation is explicit. no contradiction remains between wet-over-dry and readability abstraction.

---

## coverage check: patterns that should be present

### question: should there be a `.why` section in all rule briefs?

examined extant briefs:
- rule.require.solve-at-cause.md has `.why` — explains motivation
- rule.prefer.wet-over-dry.md has `.why` — explains motivation

new briefs:
- rule.require.orchestrators-as-narrative.md has `.why` (lines 7-12) — correct
- rule.forbid.decode-friction-in-orchestrators.md has `.the test` instead of `.why` — acceptable, the heuristic serves as rationale
- rule.require.named-transforms.md has `.the heuristic` instead of `.why` — acceptable
- rule.forbid.inline-decode-friction.md has `.why` (lines 7-12) — correct

**verdict:** motivation is present in all briefs, either as `.why` or as heuristic explanation.

---

### question: should boot.yml updates be checked?

**architect/boot.yml** (verified earlier in behavior-declaration-coverage):
- all 4 new briefs in say section
- correct

**mechanic/boot.yml** (verified earlier):
- both new briefs in say section under readable.narrative
- correct

**verdict:** boot.yml updates present. new briefs will be loaded at session start.

---

## gaps found

none.

all expected patterns are present:
- `.what` sections in all briefs
- `.enforcement` sections with severity in all rule briefs
- `.see also` sections with cross-references
- examples in all rule briefs
- require/forbid counterparts complete
- deference to architect-level definitions
- wet-over-dry reconciliation explicit
- motivation explained in all rules
- boot.yml updated for both roles

---

## summary

coverage review complete.

no absent patterns detected.

all relevant mechanic standards are applied:
- brief structure conventions followed
- content completeness verified
- cross-reference graph complete
- boot.yml updates present
