# rule.forbid.chronological-accretion

## .what

no chronological accretion. prose states current truth, not the time-order of how it got there.
do not append a log of iterations, attempts, or "then we" steps to a doc. revise it to state
what IS, and let git history hold the how.

`the aggregate enforces the invariant.`, not `first we put it in the service, then we moved it,
and now the aggregate enforces the invariant.`

## .scope

all technical prose the architect writes: briefs, plans, domain docs, decision records.

exempt: verbatim quotes, code blocks. also exempt: a decision record or changelog whose declared
purpose IS the chronology (a dated adr log, a migration timeline). the ban targets prose that
accretes a history where a statement of current truth would serve.

## .why

- **the reader wants the state, not the journey** — a doc that logs each revision buries the one truth under the dead ones.
- **each accreted layer is decode tax** — the reader must diff the layers to find what holds now.
- **git already holds the how** — the commit trail is the authored, searchable history. a prose log duplicates it, then drifts from it.
- **accretion rots** — "now", "recently", "we then" lose sense once the moment passes.

## .the smells

| smell | example | fix |
|-------|---------|-----|
| iteration log | "v1 did X. v2 did Y. v3 …" | state the final design once |
| attempt trail | "we tried A, then B, then landed on C" | state C and why |
| step-time narration | "now the context also owns …", "we then split …" | "the context owns …" |
| append-over-revise | a new section stacked below a stale one | revise the stale section in place |

## .the test

strip every time-word ("now", "then", "we tried", "recently"). does the prose still state the
current truth in full? if the sense collapses, the doc leaned on its own history — rewrite it to
stand on the state alone.

## .examples

### 👎 bad — accreted log

> the invoice model started as a bag of fields. we then extracted line items. after the tax
> rework we split the total. now it is an aggregate with a computed total.

### 👍 good — current truth

> the invoice is an aggregate. it owns its line items and computes its total from them.

## .enforcement

- a time-ordered log of iterations/attempts where a statement of current truth would serve = **blocker**
- a new section appended below a stale one, instead of an in-place revision = **blocker**
- a decision record / changelog whose purpose IS the chronology = **false positive** (exempt)

## .see also

- `define.wick-dense` — wick states what is; he does not recount the path
- `rule.require.brevity` — accretion is the bulk this rule cuts
- `rule.forbid.rambles` — the sentence-level peer of this doc-level smell
