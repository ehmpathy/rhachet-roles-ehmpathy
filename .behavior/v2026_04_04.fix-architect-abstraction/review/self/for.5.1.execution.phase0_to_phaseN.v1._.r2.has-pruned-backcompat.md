# self-review r2: has-pruned-backcompat

deeper review for backwards compatibility concerns.

---

## the file in question

wet-over-dry.md is the only file with potential backcompat risk. let me examine it line by line.

### original rule (lines 25-33)

```markdown
#### .the rule of three

wait for **3+ usages across different contexts** before you extract an abstraction:

| usages | action |
|--------|--------|
| 1 | write it inline |
| 2 | copy-paste is fine — note the duplication |
| 3+ | now consider abstraction — the pattern is real |
```

this rule is about **reuse abstraction** — avoid duplication.

### new exception (lines 120-132)

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

this exception is about **readability abstraction** — avoid decode-friction.

---

## the compatibility question

### could the original rule and the exception conflict?

scenario: developer sees `items.reduce((s, i) => s + i.amount, 0)` once in an orchestrator.

- **original rule says**: 1 usage = write inline
- **exception says**: decode-friction = extract immediately

**answer**: the exception takes precedence. the table is explicit:

| type | trigger | when |
|------|---------|------|
| readability abstraction | decode-cost | immediate |
| reuse abstraction | duplication | wait for 3+ |

the decode-friction triggers readability abstraction. the developer should extract.

### is this a contradiction?

no. the original rule never considered decode-friction. it assumed "simple" code that just happens to be duplicated. the examples in lines 44-72 show:

```ts
context.log.info('send invoice', { invoiceId: input.invoice.id });
await context.emailService.send({ ... });
```

these are named function calls, not decode-friction. the original rule was about this kind of code.

the exception addresses a different case: code that is hard to decode.

---

## what if we had NOT added the exception?

developers would face a contradiction:
- wet-over-dry says wait for 3+
- readability rule says extract immediately

the exception resolves this by clarifying: wet-over-dry is about reuse, not readability.

---

## backwards compat verdict

the exception is **required** for coherence:
- without it, wet-over-dry and readability rules would conflict
- with it, they complement each other

this is not "assumed safety" — this is explicit reconciliation requested by the wisher.

---

## why it holds

the update:
1. does not modify any extant section (lines 1-119 unchanged)
2. does not invalidate extant guidance (reuse abstraction still waits for 3+)
3. clarifies rather than contradicts

no backwards compat concerns. no action needed.
