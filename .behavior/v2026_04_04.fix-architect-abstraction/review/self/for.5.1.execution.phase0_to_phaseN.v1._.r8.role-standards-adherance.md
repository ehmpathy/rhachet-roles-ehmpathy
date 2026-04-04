# self-review r8: role-standards-adherance

deep articulation of why each mechanic standard holds or was fixed.

---

## rule directories enumerated

checked all 29 directories under `src/domain.roles/mechanic/briefs/practices/`:

**relevant to this pr:**
- lang.terms (terminology: gerunds, order, ubiqlang)
- lang.tones (shouts, lowercase, chill emojis)
- code.prod/readable.narrative (new briefs placed here)
- code.prod/evolvable.architecture (wet-over-dry update)

**not applicable:**
- code.prod/consistent.* — no packages or contracts
- code.prod/evolvable.domain.* — no domain objects or operations (briefs are markdown)
- code.prod/evolvable.procedures — no typescript procedures
- code.prod/evolvable.repo.structure — file locations correct (checked below)
- code.prod/pitofsuccess.* — no error code, procedures, or typedefs
- code.prod/readable.comments — applies to code comments, not brief files
- code.prod/readable.persistence — no persistence layer
- code.test/* — no test files
- work.flow/* — no workflow automation

---

## issues found and fixed

### issue 1: `APIs` → `apis` in rule.forbid.decode-friction-in-orchestrators.md

**location:** line 18

**before:**
```
language primitives and third-party APIs are optimized for generality
```

**after:**
```
language primitives and third-party apis are optimized for generality
```

**why this was wrong:** rule.forbid.shouts requires acronyms lowercase. `APIs` uses all caps which "shouts" for attention. the fix normalizes to `apis`.

**how i found it:** searched all files for capital letter sequences. grep pattern `[A-Z]{2,}` revealed `APIs` on this line.

---

### issue 2: `APIs` → `apis` in rule.require.named-transforms.md

**location:** line 18

**before:**
```
language primitives and third-party APIs are optimized for generality
```

**after:**
```
language primitives and third-party apis are optimized for generality
```

**why this was wrong:** same as issue 1 — rule.forbid.shouts violation.

**how i found it:** same grep search.

---

## standards that hold (with articulation of why)

### rule.forbid.gerunds

**why it holds:**

examined all new briefs for `-ing` words used as nouns.

words found:
- "transform" — not a gerund, it's a noun (the noun form)
- "string" — not a gerund, it's a data type noun

the briefs use proper noun/verb forms:
- "transforms compute" (noun + verb) — correct
- "orchestrators compose" (noun + verb) — correct
- "extract to named transform" (verb + noun) — correct

no `-ing` words function as nouns in any of the 8 files.

---

### rule.prefer.lowercase

**why it holds:**

all sentences start lowercase. examples:

- `transforms do the work. orchestrators tell the story.` — lowercase start
- `if you have to decode it to understand it, extract it now` — lowercase start
- `orchestrators must read as narrative` — lowercase start

proper nouns are lowercase (ehmpathy is always lowercase per convention).

code constructs appear in backticks and keep their original case (e.g., `User`, `Context`).

---

### rule.require.order.noun_adj

**why it holds:**

examined compound names introduced:

| name | analysis | verdict |
|------|----------|---------|
| `domain-operation-grains` | [noun]-[noun]-[noun] | no adjective, rule n/a |
| `transform-orchestrator-separation` | [noun]-[noun]-[noun] | no adjective, rule n/a |
| `orchestrators-as-narrative` | [noun]-as-[noun] | preposition, rule n/a |
| `decode-friction` | [verb]-[noun] | not [adj]-[noun], rule n/a |
| `named-transforms` | [past participle]-[noun] | acceptable per brief |
| `inline-decode-friction` | [adverb]-[verb]-[noun] | acceptable per brief |

the briefs acknowledge that past participles (e.g., "named") and adverbs (e.g., "inline") are acceptable modifiers. no [adjective][noun] patterns that violate the rule.

---

### rule.require.ubiqlang

**why it holds:**

new terms introduced are well-defined:

| term | definition location | reuse consistent? |
|------|--------------------|--------------------|
| transform | define.domain-operation-grains.md line 9 | yes — all files use same definition |
| orchestrator | define.domain-operation-grains.md line 10 | yes — all files use same definition |
| decode-friction | rule.forbid.decode-friction-in-orchestrators.md line 5 | yes — all files use same definition |
| readability abstraction | rule.prefer.wet-over-dry.md line 120 | yes — contrasted with "reuse abstraction" |

no synonym drift detected:
- "transform" is used consistently (never "transformer", "converter", "mapper")
- "orchestrator" is used consistently (never "coordinator", "composer", "workflow")
- "decode-friction" is used consistently (never "machine code", "raw logic", "inline code")

---

### file structure conventions

**why it holds:**

architect briefs placed in: `src/domain.roles/architect/briefs/practices/`
- correct — this is the architect-level practices directory
- all 4 architect briefs are at the root of practices/ which is appropriate for cross-concern rules

mechanic briefs placed in: `src/domain.roles/mechanic/briefs/practices/code.prod/readable.narrative/`
- correct — this directory holds readability rules for production code
- the new briefs fit this category (narrative flow, named transforms)

handoff brief placed in: `.agent/repo=.this/role=any/briefs/`
- correct — repo-internal briefs that apply to any agent

---

### section header conventions

**why it holds:**

all section headers use `.` prefix as required:

| file | sections | all use `.` prefix? |
|------|----------|---------------------|
| define.domain-operation-grains.md | `.what`, `.why`, `.examples`, `.see also` | yes |
| philosophy.transform-orchestrator-separation.[philosophy].md | `.what`, `.the book metaphor`, `.the compiler metaphor`, `.the insight`, `.see also` | yes |
| rule.require.orchestrators-as-narrative.md | `.what`, `.why`, `.pattern`, `.enforcement`, `.see also` | yes |
| rule.forbid.decode-friction-in-orchestrators.md | `.what`, `.the test`, `.practical heuristic`, `.examples`, `.note`, `.enforcement`, `.see also` | yes |
| rule.require.named-transforms.md | `.what`, `.the heuristic`, `.practical heuristic`, `.examples`, `.name patterns`, `.note`, `.enforcement`, `.see also` | yes |
| rule.forbid.inline-decode-friction.md | `.what`, `.why`, `.what is decode-friction`, `.what is NOT decode-friction`, `.the test`, `.enforcement`, `.see also` | yes |

---

### cross-reference conventions

**why it holds:**

all cross-references use backticks as required:

examples from the files:
- `rule.require.orchestrators-as-narrative` — backticks
- `rule.forbid.decode-friction-in-orchestrators` — backticks
- `define.domain-operation-grains` — backticks
- `rule.require.get-set-gen-verbs` — backticks

no cross-references use plain text or markdown links.

---

### enforcement level explicit

**why it holds:**

all rule briefs have explicit enforcement sections:

| file | enforcement text |
|------|-----------------|
| rule.require.orchestrators-as-narrative.md | `orchestrator with decode-friction = blocker` |
| rule.forbid.decode-friction-in-orchestrators.md | `decode-friction in orchestrator = blocker` |
| rule.require.named-transforms.md | `decode-friction inline in orchestrator = blocker` |
| rule.forbid.inline-decode-friction.md | `decode-friction inline in orchestrator = blocker` |

all use `= blocker` format which is the standard enforcement declaration.

---

## summary

**2 issues found and fixed:**
1. `APIs` → `apis` in architect brief (rule.forbid.shouts)
2. `APIs` → `apis` in mechanic brief (rule.forbid.shouts)

**all other standards hold because:**
- no gerunds as nouns (proper noun/verb forms used)
- all sentences lowercase (no capitalized starts)
- no [adj][noun] violations (compounds use noun chains or acceptable modifiers)
- ubiqlang terms defined once and used consistently
- file locations match directory purposes
- section headers all use `.` prefix
- cross-references all use backticks
- enforcement levels explicitly stated
