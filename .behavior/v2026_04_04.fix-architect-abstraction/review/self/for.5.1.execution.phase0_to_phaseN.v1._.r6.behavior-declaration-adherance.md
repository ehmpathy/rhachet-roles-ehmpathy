# self-review r6: behavior-declaration-adherance

line-by-line comparison of implementation vs blueprint outlines.

---

## define.domain-operation-grains.md

### blueprint outline (lines 100-122)

```markdown
# define.domain-operation-grains

## .what

domain.operations have two grains:

| grain | role | contains |
|-------|------|----------|
| **transform** | compute | decode-friction logic |
| **orchestrator** | compose | named operation calls only |

## .why

transforms do the work. orchestrators tell the story.

## .examples

transforms: `asKeyrackKeyOrg`, `isEligibleForPremiumFeatures`, `getActiveUserEmails`
orchestrators: `genInvoice`, `setCustomer`, `setUserNotifications`
```

### implementation (actual file)

**line 1:** `# define.domain-operation-grains` ✓
**line 3:** `## .what` ✓
**lines 5-10:** exact table as blueprint ✓
**line 12:** `## .why` ✓
**line 14:** `transforms do the work. orchestrators tell the story.` ✓
**line 22:** `## .examples` ✓
**lines 24-32:** examples present (expanded format, same content) ✓

### additions beyond blueprint

**line 16-20:** expanded .why with bullet points
- "orchestrators read as narrative — each line tells *what* happens"
- "transforms encapsulate *how* — implementation detail hidden"
- "readers grasp intent at orchestrator level without decode"
- "robots spend fewer tokens on comprehension"

**question:** is this acceptable or spec drift?

**answer:** acceptable. the bullets expand on "transforms do the work. orchestrators tell the story." — no contradictions present. blueprint outlines are summaries, not complete files.

**line 34-38:** `.see also` section with cross-references

**question:** is this acceptable?

**answer:** yes. cross-references are expected per brief conventions.

**verdict:** adherance correct. additions are appropriate expansions.

---

## rule.forbid.decode-friction-in-orchestrators.md

### blueprint outline (lines 145-171)

```markdown
## .what

orchestrators must not contain logic that requires mental simulation to understand.

## .the test

"do i have to decode this to understand what it produces?"
- yes = extract to named transform
- no = leave inline

## .practical heuristic

if the operation isn't named by us in this repo or from an ehmpathy package, wrap it in a domain-named transform.

## .note

this is not about specific categories (array access, regex, etc). complexity that requires decode can come from anywhere. the examples are illustrative, not prescriptive.

## .enforcement

decode-friction in orchestrator = blocker
```

### implementation (actual file)

**line 1:** `# rule.forbid.decode-friction-in-orchestrators` ✓
**line 3:** `## .what` ✓
**line 5:** exact text from blueprint ✓
**line 7:** `## .the test` ✓
**lines 9-12:** exact text from blueprint ✓
**line 14:** `## .practical heuristic` ✓
**lines 16-18:** exact text from blueprint (split into 2 lines) ✓
**line 30:** `## .note` ✓
**lines 32-34:** exact text from blueprint (split into 2 paragraphs) ✓
**line 36:** `## .enforcement` ✓
**line 38:** exact text from blueprint ✓

### additions beyond blueprint

**lines 20-28:** `.examples of decode-friction` table
- string parse, date extract, aggregate, pipeline, boolean examples

**question:** is this acceptable?

**answer:** yes. the examples table comes from vision "examples table" section. blueprint outline was a summary; vision had more detail.

**line 40-45:** `.see also` section

**question:** is this acceptable?

**answer:** yes. cross-references expected.

**verdict:** adherance correct. examples table follows vision, not deviation.

---

## rule.prefer.wet-over-dry.md update

### blueprint outline (lines 173-191)

```markdown
## .exception: readability abstraction

wet-over-dry applies to *reuse* abstraction — wait for 3+ usages before extract.

but *readability* abstraction triggers immediately:
- if you have to decode it to understand it, extract it now
- even single-use transforms warrant extraction if they improve readability
- see: rule.forbid.decode-friction-in-orchestrators

| type | trigger | when |
|------|---------|------|
| readability abstraction | decode-cost | immediate |
| reuse abstraction | duplication | wait for 3+ |
```

### implementation (lines 120-137 of actual file)

**line 120:** `#### .exception: readability abstraction` ✓
**line 122:** exact text from blueprint ✓
**lines 124-127:** exact bullets from blueprint ✓
**lines 129-132:** exact table from blueprint ✓

### additions beyond blueprint

**lines 134-137:** extended `.see also` section
- added `rule.forbid.inline-decode-friction` to references

**question:** is this acceptable?

**answer:** yes. the mechanic-level brief is a natural cross-reference to add.

**verdict:** adherance correct. no spec drift.

---

## summary: adherance check complete

each file examined line-by-line against blueprint outlines.

| file | blueprint sections present | additions acceptable? |
|------|---------------------------|---------------------|
| define.domain-operation-grains.md | all | yes — expanded .why, added .see also |
| rule.forbid.decode-friction-in-orchestrators.md | all | yes — examples from vision |
| rule.prefer.wet-over-dry.md | all | yes — extended cross-references |

no spec deviations found.
no misinterpretations detected.
all additions trace to vision or brief conventions.
