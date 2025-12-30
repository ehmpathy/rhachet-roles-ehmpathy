### .define = domain-operation-core-variants

#### .what
domain.operations contains two fundamental variants of leaf operations:
- **compute*** = deterministic computed work (pure functions, no external dependencies)
- **imagine*** = probabilistic creative work via `context.brain.repl.imagine({ role })`

#### .when
- most projects only have deterministic operations — no `brain.repl` invocations
- in these cases, the `compute*` prefix is **not required** (no ambiguity exists)
- enforcement becomes **mandatory** when a project contains both variants
- once `imagine*` operations exist in a codebase, `compute*` prefixes become required for clarity

#### .scope
- the `compute*`/`imagine*` prefix applies only to **leaf operations**
- leaf operations = the ones that actually perform the computation or imagination
- **composer operations** that orchestrate leaf operations use normal names (e.g., `getInvoice`, `setCustomerPhone`, `syncUserFromProvider`)
- the prefix signals *what kind of work is done*, not *what kind of work is called*

#### .why
when both variants exist in a codebase, the prefix:
- clarifies the nature of each leaf operation at a glance
- sets expectations for testability (deterministic vs probabilistic)
- signals dependency requirements (pure vs requires brain context)
- enables appropriate error strategies for each type
- guides code review focus (logic correctness vs prompt quality)

#### .how

##### compute* leaf operations
- prefix with `compute` (e.g., `computeInvoiceTotal`, `computeHashFromContent`)
- must be **pure functions** — same input always produces same output
- **no external dependencies** — no network, no database, no randomness
- trivially testable with simple input/output assertions
- can be safely memoized or cached

##### imagine* leaf operations
- prefix with `imagine` (e.g., `imagineChapterOutline`, `imagineCodeReview`)
- invoke `context.brain.repl.imagine({ role })` for LLM-powered generation
- **probabilistic** — same input may produce different valid outputs
- require snapshot tests or semantic assertions
- depend on `context.brain` provision

##### composer operations
- use normal verb prefixes (e.g., `get*`, `set*`, `sync*`, ...)
- orchestrate one or more leaf operations
- no special prefix required — their behavior is defined by what they compose

#### .examples

**✅ good — leaf operations with proper prefixes**
```ts
// computeInvoiceTotal.ts — leaf, deterministic
export const computeInvoiceTotal = (input: { lineItems: LineItem[] }) => {
  return input.lineItems.reduce((sum, item) => sum + item.amount, 0);
};

// imagineChapterSummary.ts — leaf, probabilistic
export const imagineChapterSummary = async (
  input: { chapter: string },
  context: { brain: Brain },
) => {
  return context.brain.repl.imagine({
    role: 'summarizer',
    prompt: `summarize this chapter: ${input.chapter}`,
  });
};
```

**✅ good — composer operation with normal name**
```ts
// getInvoiceWithSummary.ts — composes both variants
export const getInvoiceWithSummary = async (
  input: { invoiceId: string },
  context: { brain: Brain; invoiceDao: InvoiceDao },
) => {
  const invoice = await context.invoiceDao.findById(input.invoiceId);
  const total = computeInvoiceTotal({ lineItems: invoice.lineItems });
  const summary = await imagineChapterSummary({ chapter: invoice.notes }, context);
  return { ...invoice, total, summary };
};
```

**⛔ bad — prefix misleads**
```ts
// computeResponse.ts — "compute" but actually calls LLM
export const computeResponse = async (input, context) => {
  return context.brain.repl.imagine({ ... }); // ⛔ prefix misleads
};
```

**⛔ bad — ambiguous leaf name (only when both variants exist)**
```ts
// generateTotal.ts — unclear if deterministic or probabilistic
export const generateTotal = (...) => { ... }

// processChapter.ts — verb doesn't signal operation type
export const processChapter = (...) => { ... }
```

#### .enforcement
- leaf operations that call `context.brain` must use `imagine*` prefix
- leaf operations prefixed with `compute*` must be pure and deterministic
- prefix mismatch vs implementation = **BLOCKER**
- ambiguous leaf names in a codebase with both variants = **BLOCKER**

---

#### .appendix: brain terminology

##### brain.atom
- the atomic unit of LLM interaction
- a single LLM api call (e.g., one completion request)
- stateless, no memory of prior calls
- e.g., **Claude api** = one `messages.create()` call

##### brain.repl
- **r**ead, **e**xecute, **p**rint, **l**oop
- orchestrates `brain.atom` calls within a tooluse loop
- enables multi-turn reason with tool execution between steps
- `brain.repl.imagine({ role })` = invoke the repl to imagine/generate via the specified role
- e.g., **Claude Code** = agentic loop that reads files, executes tools, prints results, loops until done
