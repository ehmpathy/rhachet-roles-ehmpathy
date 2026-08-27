# rule.prefer.wickup-touched-prose

## .what

wick-up the prose you touch. when a change lands you in a comment, brief, or doc that rambles,
condense it to wick-dense on your way through. fix forward — you do not fault the past author,
you leave the prose better than you found it.

this is `scouts-honor` applied to prose: the prose-specific face of leave-it-better.

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit bodies, pr descriptions

exempt: verbatim quotes, code blocks, human-chat tone. also: prose you did not touch — this rule
fires only on prose within the reach of your change.

## .why

- **ye-olden prose predates the overlay** — folks rambled before wick-dense. we do not rewrite the whole repo; we fix forward on contact.
- **contact is the cheap moment** — you already grasp the passage to edit it. the wick-up costs little now, more on a cold read later.
- **the overlay spreads by touch** — a repo converges to wick-dense one edited file at a time, no big-bang rewrite.

## .the bound — on contact, in scope

- **on contact** — you wick-up prose your change already touches, not prose you merely pass near.
- **in scope** — the wick-up rides your diff; it does not balloon into a doc-wide rewrite.
- **large ramble** → flag it or open a follow-up; do not smuggle a full rewrite into an unrelated change (`rule.require.review-test-changes`).

## .the test

did your change touch a passage that rambles? then wick it up before you leave. if a ramble sat
in the lines you edited and you left it padded, you skipped the fix-forward.

## .examples

### 👎 bad — edited the passage, left the ramble

```ts
// this function, which as we all know is pretty central, basically takes care of, more or
// less, the reshape of the record before, of course, we go ahead and persist it
// (edited the persist call below, left the comment as-is)
```

### 👍 good — wicked-up on contact

```ts
// reshape record. persist record.
```

## .enforcement

- a ramble left padded inside prose your change touched = **nitpick**
- a doc-wide prose rewrite smuggled into an unrelated change = **blocker** (breaks `rule.require.review-test-changes`)

## .see also

- `work.flow/rule.prefer.scouts-honor` — the general trait this rule instances
- `define.wick-dense` — the terse target a wicked-up ramble reaches
- `rule.forbid.rambles` — the smell this rule fixes forward
- `rule.require.brevity` — the cut a wick-up applies
