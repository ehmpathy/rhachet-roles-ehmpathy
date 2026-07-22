# rule.require.domain-discovery-for-term-proposals

## .what

whenever you intend to **propose a new term to a domain distillate** — a new domain-object or domain-operation added to the domain's shared vocabulary — you must back the proposal with **domain discovery**. do not propose a term you have not discovered.

## .why

- a term proposed without discovery drifts, overloads, or duplicates an extant concept
- discovery surfaces the object's true attributes, states, and relationships before they harden in the distillate
- terms that come from the domain compose; terms invented at the keyboard do not
- a distillate is shared vocabulary — a bad term there costs every reader and every reference downstream

## .when it applies

| applies | does not apply |
|---------|----------------|
| you propose a new dobj to the distillate (a noun the domain has not named) | you reuse or extend an extant, already-discovered term |
| you propose a new dop to the distillate (a verb the domain has not performed) | a pure rename of an already-discovered term |
| a new bounded concept enters the domain's vocabulary | incidental non-domain code (local vars, glue) |

## .what it requires

before a term proposal enters the distillate:

1. run at least one discovery move (`howto.domain-discovery`) to back the term — the two premier tactics are **dimensional decomposition** and **scenario timeline narration**
2. confirm the term against the ubiqlang rules — no synonym, no ambiguous overload
3. record the attributes, states, and refs you discovered, and any forbidden combinations as invariants

the discovery is the *evidence* behind the proposal. a term without it is a guess, not a distillate entry.

## .the caveat

discovery is proportionate. a single obvious dobj that a domain expert would name without thought needs only a quick vet, not a full matrix. the mandate is: **do not propose a domain term in a vacuum** — anchor it in the domain first.

## .enforcement

- a term proposed to the distillate with no discovery, that turns out to be a synonym or overload of an extant term = **blocker**
- a proposed dobj entered with no account of its attributes / states / refs = **nitpick**
- a proposed dobj/dop that spans variants, entered with no dimensional walk of its space = **nitpick** (see `rule.require.dimensional-decomposition`)

## .see also

- `howto.domain-discovery.md` — what it is and how to do it
- `howto.dimensional-decomposition.md` — a premier discovery tactic
- `rule.require.dimensional-decomposition.md` — required when the proposed term spans a variant space
- `rule.require.persist-domain-term-evidence` — persist the discovery evidence for the term long-term
- `rule.require.ubiqlang` — vet the proposed term
