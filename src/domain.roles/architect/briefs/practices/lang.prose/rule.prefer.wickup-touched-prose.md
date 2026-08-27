# rule.prefer.wickup-touched-prose

## .what

wick-up the prose you touch. when a change lands you in a brief, plan, domain doc, or decision
record that rambles, condense it to wick-dense on your way through. fix forward — you do not
fault the past author, you leave the prose better than you found it.

this is the boy-scout rule applied to prose: leave it better than you found it.

## .scope

all technical prose the architect writes: briefs, plans, domain docs, decision records.

exempt: verbatim quotes, code blocks. also: prose you did not touch — this rule fires only on
prose within the reach of your change.

## .why

- **ye-olden prose predates the overlay** — folks rambled before wick-dense. we do not rewrite the whole corpus; we fix forward on contact.
- **contact is the cheap moment** — you already grasp the passage to edit it. the wick-up costs little now, more on a cold read later.
- **the overlay spreads by touch** — a corpus converges to wick-dense one edited doc at a time, no big-bang rewrite.

## .the bound — on contact, in scope

- **on contact** — you wick-up prose your change already touches, not prose you merely pass near.
- **in scope** — the wick-up rides your diff; it does not balloon into a corpus-wide rewrite.
- **large ramble** → flag it or open a follow-up; do not smuggle a full rewrite into an unrelated change.

## .the test

did your change touch a passage that rambles? then wick it up before you leave. if a ramble sat
in the lines you edited and you left it padded, you skipped the fix-forward.

## .examples

### 👎 bad — edited the section, left the ramble

> the bounded context, as we have discussed at some length, is essentially a way to more or
> less draw a line around a set of concepts that, generally, belong together.

### 👍 good — wicked-up on contact

> a bounded context draws a line around concepts that belong together.

## .enforcement

- a ramble left padded inside prose your change touched = **nitpick**
- a corpus-wide prose rewrite smuggled into an unrelated change = **blocker**

## .see also

- `define.wick-dense` — the terse target a wicked-up ramble reaches
- `rule.forbid.rambles` — the smell this rule fixes forward
- `rule.require.brevity` — the cut a wick-up applies
