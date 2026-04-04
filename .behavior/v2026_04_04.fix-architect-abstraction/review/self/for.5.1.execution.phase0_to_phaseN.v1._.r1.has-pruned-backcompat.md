# self-review r1: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## what could have backwards compat concerns

this change:
1. adds new briefs (additive — no backcompat concern)
2. updates boot.yml (additive — no backcompat concern)
3. updates rule.prefer.wet-over-dry.md (potential backcompat concern)

---

## wet-over-dry update review

### what changed

added lines 120-137:
```markdown
#### .exception: readability abstraction

wet-over-dry applies to *reuse* abstraction — wait for 3+ usages before extract.

but *readability* abstraction triggers immediately:
- if you have to decode it to understand it, extract it now
- even single-use transforms warrant extraction if they improve readability
- see: `rule.forbid.decode-friction-in-orchestrators`

| type | trigger | when |
|------|---------|------|
| readability abstraction | decode-cost | immediate |
| reuse abstraction | duplication | wait for 3+ |
```

### is this backwards compatible?

yes. the update:
- adds an exception, does not modify the core rule
- the rule of three (wait for 3+) remains intact
- the mantra remains intact
- all extant guidance remains valid

### did the wisher explicitly request this?

yes. from the wish:
> the issue here isfor "readability" abstraction; this machine code is not self explanatory
> someone has to use multiple cycles of thought to understand what that means

the vision explicitly reconciles the tension:
> this explicitly contradicts `rule.prefer.wet-over-dry` which says wait for 3+ usages. reconciliation: readability abstraction is a *different category* than reuse abstraction

### did we assume backwards compat "to be safe"?

no. we did not:
- add migration guidance (not needed — additive change)
- deprecate extant rules (not needed — exception adds nuance)
- add fallback behavior (not needed — rule still applies as before)

---

## why it holds

the only file with backcompat risk is wet-over-dry.md. the change is additive:
- adds .exception section at end of brief
- does not modify core rule ("wait for 3+")
- does not contradict extant guidance
- explicitly requested by wisher

no backwards compat concerns. no action needed.
