# self-review r6: role-standards-adherance

review for adherance to role standards (ehmpathy briefs).

---

## rule.forbid.shouts

### standard

acronyms must be lowercase — no capital letters that shout.

### check

searched all new briefs for capital acronyms:

| file | found | status |
|------|-------|--------|
| define.domain-operation-grains.md | none | pass |
| philosophy.transform-orchestrator-separation.[philosophy].md | none | pass |
| rule.require.orchestrators-as-narrative.md | none | pass |
| rule.forbid.decode-friction-in-orchestrators.md | `APIs` on line 18 | **fixed** |
| rule.require.named-transforms.md | none | pass |
| rule.forbid.inline-decode-friction.md | none | pass |

**action taken:** changed `APIs` to `apis` on line 18 of rule.forbid.decode-friction-in-orchestrators.md.

---

## rule.prefer.lowercase

### standard

words must be lowercase unless code constructs or proper nouns.

### check

examined all new briefs for capitalized sentence starts or domain nouns:

- no capitalized sentence starts found
- proper nouns (ehmpathy) lowercase as expected
- code references use backticks as required

**verdict:** adherance correct.

---

## rule.forbid.gerunds

### standard

no -ing words used as nouns in code, docs, or comms.

### check

searched all new briefs for forbidden -ing noun patterns.

**patterns checked (using grep):**
- words that end in `-ing` and function as nouns

**results:**

| file | -ing words found | context | verdict |
|------|------------------|---------|---------|
| define.domain-operation-grains.md | none | — | pass |
| philosophy.transform-orchestrator-separation.[philosophy].md | none | — | pass |
| rule.require.orchestrators-as-narrative.md | none | — | pass |
| rule.forbid.decode-friction-in-orchestrators.md | "string" (not gerund) | category label | pass |
| rule.require.named-transforms.md | "string" (not gerund) | category label | pass |
| rule.forbid.inline-decode-friction.md | none | — | pass |

note: "string" is a noun (data type), not a gerund.

**verdict:** no gerund violations found.

---

## rule.require.order.noun_adj

### standard

use [noun][adjective] order for compound names.

### check

examined all new names introduced:

| name | structure | verdict |
|------|-----------|---------|
| domain-operation-grains | [noun][noun] | n/a — no adjective |
| transform-orchestrator-separation | [noun][noun][noun] | n/a — no adjective |
| orchestrators-as-narrative | [noun][prep][noun] | n/a — no adjective |
| decode-friction-in-orchestrators | [noun][prep][noun] | n/a — no adjective |
| named-transforms | [adj][noun] | acceptable — "named" is past participle |
| inline-decode-friction | [adj][noun][noun] | acceptable — "inline" is modifier |

**verdict:** no violations. compound names use noun chains or acceptable modifiers.

---

## rule.require.ubiqlang

### standard

use consistent domain vocabulary; no synonym drift.

### check

terms introduced in new briefs:

| term | definition | consistent with extant? |
|------|------------|------------------------|
| transform | compute grain of domain.operation | yes — aligns with verb patterns |
| orchestrator | compose grain of domain.operation | yes — aligns with get/set/gen verbs |
| decode-friction | logic that requires mental simulation | new term — well defined |
| readability abstraction | extract for clarity (vs reuse abstraction) | new term — well defined |

no synonym drift detected. new terms are explicitly defined.

**verdict:** adherance correct.

---

## rule.require.what-why-headers

### standard

every procedure requires `.what` and `.why` jsdoc headers.

### check

this rule applies to code procedures, not brief files.

brief files use `.what`, `.why`, `.examples` sections (different convention).

all new briefs have appropriate section headers per their type:
- defines have `.what`, `.why`, `.examples`
- rules have `.what`, `.why`, `.enforcement`
- philosophy has `.what`, metaphor sections

**verdict:** adherance correct (rule not applicable to briefs).

---

## rule.require.treestruct-output

### standard

cli output must use turtle vibes treestruct format.

### check

this rule applies to cli skills, not brief files.

no cli output in new briefs.

**verdict:** n/a — no cli output.

---

## summary

| standard | status |
|----------|--------|
| rule.forbid.shouts | fixed (`APIs` → `apis`) |
| rule.prefer.lowercase | pass |
| rule.forbid.gerunds | pass |
| rule.require.order.noun_adj | pass |
| rule.require.ubiqlang | pass |
| rule.require.what-why-headers | n/a (briefs, not code) |
| rule.require.treestruct-output | n/a (no cli output) |

all applicable role standards followed.
