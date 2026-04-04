# self-review r5: behavior-declaration-coverage

deeper review for coverage, with line-by-line cross-reference to vision.

---

## vision section: "the book metaphor"

### vision text (from system context)

> transforms are **vocabulary** — words with precise definitions
> orchestrators are **sentences** — composed of vocabulary to tell a story
> machine code in orchestrators is like **spell out words letter by letter** mid-sentence
>
> nobody wants to read "the c-a-t sat on the m-a-t" when they could read "the cat sat on the mat."

### implementation: philosophy.transform-orchestrator-separation.[philosophy].md

**line 9:** `transforms are **vocabulary** — words with precise definitions.`
**line 11:** `orchestrators are **sentences** — composed of vocabulary to tell a story.`
**line 13-15:** `decode-friction in orchestrators is like **spell out words letter by letter** mid-sentence:`
`> nobody wants to read "the c-a-t sat on the m-a-t" when they could read "the cat sat on the mat."`

**verification:** exact content from vision present. covered.

---

## vision section: "the compiler metaphor"

### vision text

> transforms are the **instruction set** — atomic, well-defined
> orchestrators are **high-level code** — expressive, readable
> machine code in orchestrators is like **inline assembly** — breaks the abstraction

### implementation: philosophy.transform-orchestrator-separation.[philosophy].md

**line 28:** `transforms are the **instruction set** — atomic, well-defined operations.`
**line 30:** `orchestrators are **high-level code** — expressive, readable composition.`
**line 32:** `decode-friction in orchestrators is like **inline assembly** — it breaks the abstraction level`

**verification:** exact content from vision present. covered.

---

## vision section: "the insight"

### vision text

> "oh — abstraction isn't just about reuse. it's about make code readable at the *call site*."

### implementation: philosophy.transform-orchestrator-separation.[philosophy].md

**line 36:** `> abstraction isn't just about reuse. it's about make code readable at the *call site*.`

**verification:** exact quote present. covered.

---

## vision section: "the pattern" (good vs bad code)

### vision text

> orchestrators should read like prose:
> [code example with getActiveUserEmails, isEligibleForPremiumFeatures]
>
> not like machine code:
> [code example with inline filter/map/sort, complex boolean]

### implementation: rule.require.orchestrators-as-narrative.md

**lines 16-27:** good example with `getActiveUserEmails({ users: input.users })` and `isEligibleForPremiumFeatures({ user: input.user })`

**lines 29-43:** bad example with:
- inline `.filter(u => u.status === 'active' && u.emailVerified).map(u => u.email.toLowerCase()).sort()`
- inline `input.user.age >= 18 && input.user.verified && !input.user.suspended && input.user.subscription !== 'free'`

**verification:** both good and bad examples from vision present. covered.

---

## vision section: "examples table"

### vision text

| category | before | after |
|----------|--------|-------|
| string parse | `slug.split('.')[0]!` | `asKeyrackKeyOrg({ slug })` |
| date extract | `new Date(ts).toJSON().split('T')[0]` | `asIsoDate({ from: date })` |
| aggregate | `items.reduce((s, i) => s + i.amount, 0)` | `computeTotal({ items })` |
| pipeline | `.filter(...).map(...).sort()` | `getActiveUserEmails({ users })` |
| boolean | `a && b \|\| c && !d` | `isEligibleForDiscount({ order })` |

### implementation: rule.forbid.decode-friction-in-orchestrators.md

**lines in ".examples of decode-friction" section:**

| category | decode-friction | named transform |
|----------|----------------|-----------------|
| string parse | `slug.split('.')[0]!` | `asKeyrackKeyOrg({ slug })` |
| date extract | `new Date(ts).toJSON().split('T')[0]` | `asIsoDate({ from: date })` |
| aggregate | `items.reduce((s, i) => s + i.amount, 0)` | `computeTotal({ items })` |
| pipeline | `.filter(...).map(...).sort()` | `getActiveUserEmails({ users })` |
| boolean | `a && b \|\| c && !d` | `isEligibleForDiscount({ order })` |

**verification:** all 5 examples from vision present in table. covered.

---

## vision section: "reconciliation with wet-over-dry"

### vision text

> readability abstraction is a *different category* than reuse abstraction
>
> | type | trigger | when |
> |------|---------|------|
> | readability abstraction | decode-cost | immediate |
> | reuse abstraction | duplication | wait for 3+ |

### implementation: rule.prefer.wet-over-dry.md exception section

**lines 120-132:** contains:
- clarification: "wet-over-dry applies to *reuse* abstraction"
- bullets that state readability triggers immediately
- exact table from vision

**verification:** reconciliation table and clarification present. covered.

---

## vision section: "defer to extant name patterns"

### vision text

> for name patterns: defer to `rule.require.get-set-gen-verbs`

### implementation: rule.require.named-transforms.md

**lines 29-36:** `.name patterns` section states:
> defer to `rule.require.get-set-gen-verbs` for name conventions

**verification:** deference to extant rule present. covered.

---

## what was NOT in the vision but was added?

examined all briefs for content not in vision:

1. **rule.require.orchestrators-as-narrative.md line 12:** "readability abstraction pays dividends on every read"
   - not verbatim in vision, but implied by vision's "aha moment" section
   - acceptable: captures the insight, doesn't add new requirement

2. **rule.forbid.decode-friction-in-orchestrators.md `.note` section:** "this is not about specific categories"
   - not verbatim in vision, but vision says "examples are illustrative, not prescriptive"
   - acceptable: clarification, not new requirement

no unexpected additions. all content traces to vision.

---

## gaps found

none.

all vision requirements covered line-by-line.
no features omitted.
no requirements skipped.
