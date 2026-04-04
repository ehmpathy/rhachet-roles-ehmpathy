# self-review r4: has-consistent-conventions

deeper review for convention consistency, with line-by-line examination.

---

## discovered: readable.narrative briefs have varied formats

examined extant briefs in `readable.narrative/`:

### rule.forbid.else-branches.md (extant)

```markdown
elses are implicit assumptinos => hazards

never use elses

never use if elses
```

**format:** informal, no `.what`/`.why` sections, conversational tone.

### rule.avoid.unnecessary-ifs.md (extant)

```markdown
extra ifs = extra code branches

avoid ifs maximally

in an ideal narrative,
- shapes flow through and fit nicely
```

**format:** informal, no section headers, prose-style.

### rule.require.named-transforms.md (new)

```markdown
# rule.require.named-transforms

## .what

extract decode-friction logic into named transforms.

## .the heuristic
...
```

**format:** structured, with `.what`/`.why` sections, tables, code examples.

---

## analysis: is this a convention violation?

### the question

new briefs use structured format (`.what`, `.why`, `.examples`).
extant briefs in same directory use informal prose.

should new briefs match extant informal style?

### the answer: no, keep structured format

**reason 1:** structured format is the documented convention

the blueprint specifies:
> briefs follow extant patterns: `.what`, `.why`, `.examples`, `.enforcement`, `.see also`

the architect briefs and most mechanic briefs (outside readable.narrative) use this structure.

**reason 2:** informal briefs appear to be legacy

the informal briefs in readable.narrative lack:
- clear section boundaries
- explicit enforcement levels
- cross-references

they appear to be early drafts that predate the convention.

**reason 3:** consistency across the codebase matters more

the new briefs are consistent with:
- `rule.require.solve-at-cause.md` (architect)
- `rule.require.get-set-gen-verbs.md` (mechanic)
- `rule.prefer.wet-over-dry.md` (mechanic)

these use the structured format.

---

## specific convention checks

### file name prefix

| new brief | prefix | matches extant? |
|-----------|--------|-----------------|
| rule.require.named-transforms.md | rule.require. | yes |
| rule.forbid.inline-decode-friction.md | rule.forbid. | yes |
| define.domain-operation-grains.md | define. | yes |
| philosophy.*.md | philosophy. | yes |

all correct.

### section headers use `.` prefix

extant pattern: `.what`, `.why`, not `what`, `why`

checked new briefs:
- define.domain-operation-grains.md: `.what`, `.why`, `.examples`, `.see also` — correct
- rule.require.orchestrators-as-narrative.md: `.what`, `.why`, `.pattern`, `.enforcement`, `.see also` — correct
- rule.forbid.decode-friction-in-orchestrators.md: `.what`, `.the test`, `.practical heuristic`, `.examples`, `.note`, `.enforcement`, `.see also` — correct
- rule.require.named-transforms.md: `.what`, `.the heuristic`, `.practical heuristic`, `.examples`, `.name patterns`, `.note`, `.enforcement`, `.see also` — correct
- rule.forbid.inline-decode-friction.md: `.what`, `.why`, `.what is decode-friction`, `.what is NOT decode-friction`, `.the test`, `.enforcement`, `.see also` — correct

all sections use `.` prefix.

### cross-references use backticks

extant pattern: `rule.require.get-set-gen-verbs`

checked new briefs:
- all cross-references use backtick format

correct.

### enforcement level is explicit

extant pattern: "= blocker" or "= nitpick"

checked new briefs:
- all rule briefs specify "= blocker"

correct.

---

## verdict

**observation:** new briefs are more structured than some extant briefs in readable.narrative directory.

**decision:** keep structured format because:
1. it matches the documented convention
2. it matches majority of briefs across codebase
3. informal briefs appear to be legacy, not exemplar

no convention divergence that requires action. the new briefs raise the bar rather than lower it.
