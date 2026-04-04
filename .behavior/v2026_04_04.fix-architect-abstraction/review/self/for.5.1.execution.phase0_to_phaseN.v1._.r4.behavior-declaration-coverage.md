# self-review r4: behavior-declaration-coverage

review for coverage of the behavior declaration.

---

## blueprint deliverables checklist

### deliverable 1: architect briefs (4 files)

| file | blueprint spec | status |
|------|----------------|--------|
| define.domain-operation-grains.md | defines: transforms (compute) vs orchestrators (compose) | present |
| philosophy.transform-orchestrator-separation.[philosophy].md | book metaphor, compiler metaphor, "c-a-t" example | present |
| rule.require.orchestrators-as-narrative.md | orchestrators must read as narrative | present |
| rule.forbid.decode-friction-in-orchestrators.md | no logic that requires mental simulation | present |

**verification:** all 4 architect briefs exist at `src/domain.roles/architect/briefs/practices/`

### deliverable 2: mechanic briefs (2 new files)

| file | blueprint spec | status |
|------|----------------|--------|
| rule.require.named-transforms.md | heuristic, practical heuristic, defer to get-set-gen-verbs | present |
| rule.forbid.inline-decode-friction.md | forbid decode-friction inline | present |

**verification:** both files exist at `src/domain.roles/mechanic/briefs/practices/code.prod/readable.narrative/`

### deliverable 3: update extant briefs

| file | blueprint spec | status |
|------|----------------|--------|
| rule.prefer.wet-over-dry.md | add exception: readability abstraction triggers immediately | present |

**verification:** lines 120-137 contain `.exception: readability abstraction` section with:
- explanation of readability vs reuse abstraction
- table with type/trigger/when columns
- cross-reference to `rule.forbid.decode-friction-in-orchestrators`

### deliverable 4: handoff brief

| file | blueprint spec | status |
|------|----------------|--------|
| handoff.bhuild-readability-review-rule.md | request: add review rule to detect decode-friction | present |

**verification:** file exists at `.agent/repo=.this/role=any/briefs/` with:
- `.what`: request for bhuild repo
- `.context`: architect and mechanic level briefs
- `.request`: 3-point list (detect, flag, suggest)
- `.detection patterns`: 6 pattern categories
- `.scope`: include/exclude paths
- `.source`: cross-reference to behavior route

### deliverable 5: boot.yml updates

| file | blueprint spec | status |
|------|----------------|--------|
| architect/boot.yml | add to say: all 4 new briefs | present |
| mechanic/boot.yml | add to say: 2 new briefs in readable.narrative section | present |

**verification:**
- architect/boot.yml lines 6, 13-15: all 4 briefs in say section
- mechanic/boot.yml lines 137-138: both briefs in say section

---

## vision requirements checklist

### the two grains

vision requirement: define transforms (compute) vs orchestrators (compose)

**coverage:** `define.domain-operation-grains.md` defines:
- transform = compute, contains decode-friction logic
- orchestrator = compose, contains named operation calls only

covered.

### the book metaphor

vision requirement: vocabulary vs sentences, "c-a-t sat on the m-a-t" example

**coverage:** `philosophy.transform-orchestrator-separation.[philosophy].md` contains:
- transforms = vocabulary, orchestrators = sentences
- "nobody wants to read 'the c-a-t sat on the m-a-t'" example

covered.

### the compiler metaphor

vision requirement: instruction set vs high-level code

**coverage:** `philosophy.transform-orchestrator-separation.[philosophy].md` contains:
- transforms = instruction set, orchestrators = high-level code
- inline assembly analogy

covered.

### the heuristic

vision requirement: "do i have to decode this to understand what it produces?"

**coverage:** both architect and mechanic briefs contain this heuristic:
- `rule.forbid.decode-friction-in-orchestrators.md` line: ".the test"
- `rule.require.named-transforms.md` line: ".the heuristic"

covered.

### the practical heuristic

vision requirement: if not from this repo or ehmpathy package, wrap it

**coverage:** both architect and mechanic briefs contain this:
- `rule.forbid.decode-friction-in-orchestrators.md` line: ".practical heuristic"
- `rule.require.named-transforms.md` line: ".practical heuristic"

covered.

### examples table

vision requirement: string parse, date extract, aggregate, pipeline, boolean examples

**coverage:** `rule.forbid.decode-friction-in-orchestrators.md` contains table with:
- string parse: `slug.split('.')[0]!` → `asKeyrackKeyOrg({ slug })`
- date extract: `new Date(ts).toJSON().split('T')[0]` → `asIsoDate({ from: date })`
- aggregate: `items.reduce(...)` → `computeTotal({ items })`
- pipeline: `.filter(...).map(...).sort()` → `getActiveUserEmails({ users })`
- boolean: `a && b || c && !d` → `isEligibleForDiscount({ order })`

covered.

### reconciliation with wet-over-dry

vision requirement: readability abstraction (immediate) vs reuse abstraction (wait for 3+)

**coverage:** `rule.prefer.wet-over-dry.md` exception section contains:
- explicit distinction between types
- table with when column (immediate vs wait for 3+)
- cross-reference to decode-friction rule

covered.

### defer to extant name patterns

vision requirement: defer to rule.require.get-set-gen-verbs for name patterns

**coverage:** `rule.require.named-transforms.md` section ".name patterns" states:
> defer to `rule.require.get-set-gen-verbs` for name conventions

covered.

---

## gaps found

none.

all blueprint deliverables present.
all vision requirements covered.

no action needed.
