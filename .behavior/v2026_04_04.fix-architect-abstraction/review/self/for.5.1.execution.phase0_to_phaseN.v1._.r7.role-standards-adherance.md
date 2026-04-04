# self-review r7: role-standards-adherance

thorough line-by-line review of all changed files against mechanic role standards.

---

## rule directories enumerated

mechanic briefs live in these directories:

| directory | relevance to this pr |
|-----------|---------------------|
| code.prod/consistent.artifacts | not applicable — no packages |
| code.prod/consistent.contracts | not applicable — no contracts |
| code.prod/evolvable.architecture | **relevant** — wet-over-dry update |
| code.prod/evolvable.domain.objects | not applicable — no domain objects |
| code.prod/evolvable.domain.operations | not applicable — no operations |
| code.prod/evolvable.procedures | not applicable — no procedures |
| code.prod/evolvable.repo.structure | not applicable — correct structure |
| code.prod/pitofsuccess.errors | not applicable — no error code |
| code.prod/pitofsuccess.procedures | not applicable — no procedures |
| code.prod/pitofsuccess.typedefs | not applicable — no typedefs |
| code.prod/readable.comments | **relevant** — new briefs |
| code.prod/readable.narrative | **relevant** — new briefs here |
| code.prod/readable.persistence | not applicable — no persistence |
| code.test/* | not applicable — no tests |
| lang.terms | **relevant** — terminology rules |
| lang.tones | **relevant** — tone rules |
| work.flow/* | not applicable — no workflow code |

---

## file-by-file line-by-line review

### file 1: define.domain-operation-grains.md

**line 1:** `# define.domain-operation-grains`
- filename matches h1: correct
- follows `define.*` pattern: correct

**lines 3-10:** `.what` section with table
- section header uses `.` prefix: correct
- table format: correct
- no capital acronyms: correct
- no gerunds: correct ("operation" is noun, "transform" is noun)

**lines 12-20:** `.why` section
- section header uses `.` prefix: correct
- lowercase sentences: correct
- no gerunds in noun position: correct

**lines 22-32:** `.examples` section
- uses backticks for code references: correct
- examples follow get/set/gen pattern: correct

**lines 34-38:** `.see also` section
- cross-references use backticks: correct

**verdict:** no violations found.

---

### file 2: philosophy.transform-orchestrator-separation.[philosophy].md

**line 1:** `# philosophy.transform-orchestrator-separation`
- filename matches h1: correct
- follows `philosophy.*.[philosophy].md` pattern: correct

**lines 3-5:** `.what` section
- section uses `.` prefix: correct
- no capital acronyms: correct

**lines 7-24:** `.the book metaphor` section
- prose is lowercase: correct
- code blocks properly formatted: correct
- no gerunds: correct

**lines 26-32:** `.the compiler metaphor` section
- prose is lowercase: correct
- no capital acronyms: correct

**lines 34-38:** `.the insight` section
- blockquote format: correct
- no gerunds: correct

**lines 40-44:** `.see also` section
- cross-references use backticks: correct

**verdict:** no violations found.

---

### file 3: rule.require.orchestrators-as-narrative.md

**line 1:** `# rule.require.orchestrators-as-narrative`
- filename matches h1: correct
- follows `rule.require.*` pattern: correct

**lines 3-5:** `.what` section
- section uses `.` prefix: correct
- no gerunds: correct

**lines 7-12:** `.why` section
- bullets are lowercase: correct
- no gerunds as nouns: correct ("readability" is acceptable, it's a derived noun from "readable")

**lines 14-43:** `.pattern` section with code examples
- typescript code blocks: correct
- good example vs bad example structure: correct

**lines 45-47:** `.enforcement` section
- states blocker level: correct

**lines 49-53:** `.see also` section
- cross-references use backticks: correct

**verdict:** no violations found.

---

### file 4: rule.forbid.decode-friction-in-orchestrators.md

**line 1:** `# rule.forbid.decode-friction-in-orchestrators`
- filename matches h1: correct
- follows `rule.forbid.*` pattern: correct

**lines 3-5:** `.what` section
- section uses `.` prefix: correct

**lines 7-12:** `.the test` section
- heuristic question format: correct

**lines 14-18:** `.practical heuristic` section
- **line 18:** `language primitives and third-party apis are...`
- **was:** `APIs` (capital acronym)
- **now:** `apis` (lowercase)
- **fix applied:** yes, earlier in this review

**lines 20-28:** `.examples of decode-friction` section
- table format: correct
- code in backticks: correct

**lines 30-34:** `.note` section
- prose is lowercase: correct

**lines 36-38:** `.enforcement` section
- states blocker level: correct

**lines 40-45:** `.see also` section
- cross-references use backticks: correct

**verdict:** one violation found and fixed (`APIs` → `apis`).

---

### file 5: rule.require.named-transforms.md

**line 1:** `# rule.require.named-transforms`
- filename matches h1: correct
- follows `rule.require.*` pattern: correct

**lines 3-5:** `.what` section
- section uses `.` prefix: correct

**lines 7-12:** `.the heuristic` section
- question format: correct
- arrow bullets: correct

**lines 14-18:** `.practical heuristic` section
- **line 18:** `language primitives and third-party apis are...`
- **was:** `APIs` (capital acronym)
- **now:** `apis` (lowercase)
- **fix applied:** yes, earlier in this review

**lines 20-27:** `.examples` section
- table format: correct
- code in backticks: correct

**lines 29-36:** `.name patterns` section
- defers to extant rule: correct
- examples use backticks: correct

**lines 38-40:** `.note` section
- prose is lowercase: correct

**lines 42-44:** `.enforcement` section
- states blocker level: correct

**lines 46-50:** `.see also` section
- cross-references use backticks: correct

**verdict:** one violation found and fixed (`APIs` → `apis`).

---

### file 6: rule.forbid.inline-decode-friction.md

**line 1:** `# rule.forbid.inline-decode-friction`
- filename matches h1: correct
- follows `rule.forbid.*` pattern: correct

**lines 3-5:** `.what` section
- section uses `.` prefix: correct

**lines 7-12:** `.why` section
- bullets are lowercase: correct
- no gerunds as nouns: correct

**lines 14-23:** `.what is decode-friction` section
- examples in backticks: correct
- no capital acronyms: correct

**lines 25-32:** `.what is NOT decode-friction` section
- "NOT" is emphasis, not acronym: acceptable
- examples in backticks: correct

**lines 34-39:** `.the test` section
- heuristic format: correct

**lines 41-43:** `.enforcement` section
- states blocker level: correct

**lines 45-49:** `.see also` section
- cross-references use backticks: correct

**verdict:** no violations found.

---

### file 7: rule.prefer.wet-over-dry.md (update to lines 120-137)

**line 120:** `#### .exception: readability abstraction`
- section uses `.` prefix: correct
- h4 for subsection: correct (this is an exception to extant rule)

**lines 122-127:** exception explanation
- prose is lowercase: correct
- cross-reference uses backticks: correct

**lines 129-132:** comparison table
- table format: correct

**lines 134-137:** extended `.see also`
- cross-references use backticks: correct

**verdict:** no violations found.

---

### file 8: handoff.bhuild-readability-review-rule.md

**line 1:** `# handoff: bhuild readability review rule`
- follows handoff brief pattern: correct

**all sections:**
- lowercase prose: correct
- code in backticks: correct
- no capital acronyms: correct
- cross-references use backticks: correct

**verdict:** no violations found.

---

## issues found and fixed

| file | line | issue | fix |
|------|------|-------|-----|
| rule.forbid.decode-friction-in-orchestrators.md | 18 | `APIs` (shout) | `apis` |
| rule.require.named-transforms.md | 18 | `APIs` (shout) | `apis` |

both fixes applied in this review.

---

## standards checked

| standard | files checked | result |
|----------|---------------|--------|
| rule.forbid.shouts | all 8 files | 2 violations fixed |
| rule.prefer.lowercase | all 8 files | pass |
| rule.forbid.gerunds | all 8 files | pass |
| rule.require.order.noun_adj | all names | pass |
| rule.require.ubiqlang | all terms | pass |
| rule.require.what-why-headers | n/a (briefs not code) | n/a |
| file structure conventions | all 8 files | pass |
| section header conventions | all 8 files | pass |
| cross-reference conventions | all 8 files | pass |
| enforcement level explicit | all rules | pass |

---

## summary

all changed files reviewed line by line against mechanic role standards.

two violations found (`APIs` shout pattern) — both fixed.

no other violations detected.
