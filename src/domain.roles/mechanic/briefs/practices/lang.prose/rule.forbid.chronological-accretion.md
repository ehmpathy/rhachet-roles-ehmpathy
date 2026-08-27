# rule.forbid.chronological-accretion

## .what

no chronological accretion. prose states current truth, not the time-order of how it got there.
do not append a log of iterations, attempts, or "then we" steps to a doc. revise it to state
what IS, and let git history hold the how.

`the guard rejects invalid input.`, not `first we tried X, then we switched to Y, and now the
guard rejects invalid input.`

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes, yield/verification artifacts
- comms: commit bodies, pr descriptions

exempt: verbatim quotes, code blocks, human-chat tone. also exempt: a changelog or an audit log
whose declared purpose IS the time-order (a dated release list, an incident timeline). the ban
targets prose that accretes a history where a statement of current truth would serve.

## .why

- **the reader wants the state, not the journey** — a doc that logs i002…i010 buries the one truth under nine dead ones.
- **each accreted layer is decode tax** — the reader must diff the layers to find what holds now.
- **git already holds the how** — the commit trail is the authored, searchable history. a prose log duplicates it, then drifts from it.
- **accretion rots** — "now", "recently", "we then" lose sense once the moment passes (pairs with `rule.require.timeless-comments`).

## .the smells

| smell | example | fix |
|-------|---------|-----|
| iteration log | "i002 fixed X. i003 fixed Y. i004 …" | state the final design once |
| attempt trail | "we tried A, then B, then landed on C" | state C and why |
| step-time narration | "now the function also …", "we then added …" | "the function …" |
| append-over-revise | a new section stacked below a stale one | revise the stale section in place |

## .the test

strip every time-word ("now", "then", "we tried", "iN", "recently"). does the prose still state
the current truth in full? if the sense collapses, the doc leaned on its own history — rewrite
it to stand on the state alone.

## .examples

### 👎 bad — accreted log

```md
## the fix
first we classified the tests as unit. review flagged the fs boundary. then we renamed to
integration. a later review flagged the readme regex. now it is tightened back.
```

### 👍 good — current truth

```md
## the tests
boot tests are integration tests — they read the filesystem (a remote boundary forbidden in
unit tests). the readme exemption matches `.readme.md` only.
```

## .enforcement

- a time-ordered log of iterations/attempts where a statement of current truth would serve = **blocker**
- a new section appended below a stale one, instead of an in-place revision = **blocker**
- a changelog/incident-timeline whose purpose IS the chronology = **false positive** (exempt)

## .see also

- `define.wick-dense` — wick states what is; he does not recount the path
- `rule.require.brevity` — accretion is the bulk this rule cuts
- `rule.forbid.rambles` — the sentence-level peer of this doc-level smell
- `readable.comments/rule.require.timeless-comments` — the code-comment twin (no reactive/temporal notes)
