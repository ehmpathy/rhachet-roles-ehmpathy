# rule.avoid.passive-voice

## .what

no passive voice. name the actor, then the act. `the context owns the operation.`, not
`the operation is owned by the context.` no be-verb + past-participle that hides or trails the actor.

## .why

- **passive hides the actor** — "the operation is owned" drops *who* owns it. active names it.
- **passive adds words** — "is owned by" costs three words; "owns" costs one.
- **active reads direct** — actor → act → object maps to how the reader models the domain.

## .scope

all technical prose the architect writes: briefs, plans, domain docs, decision records.

exempt: verbatim quotes, code blocks.

## .how

- find `is`/`are`/`was`/`were` + a past participle (`owned`, `handled`, `composed`).
- name the actor. put it first. `X owns Y.`
- no known actor? recast to an imperative: `own Y in the context.` — still active.

## .examples

### 👎 bad — passive

> the invariant is enforced by the aggregate, and the event is emitted by the domain operation.

### 👍 good — active

> the aggregate enforces the invariant. the domain operation emits the event.

## .enforcement

a hidden actor in a domain brief breeds ambiguity over who holds a responsibility.

- passive voice (be-verb + past participle) where active would serve = **nitpick**
- an act whose actor stays hidden or trails behind "by" = **nitpick**

## .see also

- `rule.require.brevity` — passive adds the words this rule cuts
- `rule.prefer.short-sentences` — the length pair for direct prose
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
