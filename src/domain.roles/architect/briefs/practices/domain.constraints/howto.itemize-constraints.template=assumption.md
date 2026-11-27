# howto.itemize-constraints.template=assumption

the template for one assumption entry. root: `howto.itemize-constraints._.md`.

file: `inventory.of=assumption.case=a$nnn-$slug.md` — the slug says the claim in a few words.

the world keeps an assumption, not us. the entry declares what we assume, our evidence for it, and what a break must cause — absorbed or surfaced. it never declares where or how a break is caught: that is the implementer's choice, enforced in the code and checked by each route's review (`rule.require.assumptions-with-evidence`).

## .template

```md
# a002 — stripe delivers each webhook at least once

## .claim

stripe delivers every `charge.succeeded` event to us at least once.

## .about

stripe — a third party

## .why not converted

no parse can make a delivery happen; only the shape of a delivered event can be checked.

## .evidence

| evidence | strength | source |
|---|---|---|
| stripe documents at-least-once delivery | their contract | stripe webhook docs (url) |
| a test receives a real event from stripe test mode | a test against the real dependency | the test that cites `[a002]` |

## .blast radius

a missed event: a paid reservation stays unpaid; the surfer is turned away at check-in.
a doubled event: two payments recorded for one charge.

## .on break

| break | required response |
|---|---|
| an event arrives twice | absorbed: a second delivery has no effect (`i007-one-payment-per-charge`) |
| an event never arrives | surfaced within one day; payouts for that charge paused until it is recovered |

## .feeds

- `i007-one-payment-per-charge`
- `i001-reserved-boards-within-stock` — the paid path

## .review by

2027-05-01
```

## .the fields

| field | holds | rule |
|---|---|---|
| claim | one line: what we take the world to keep true | a claim, not a hope — falsifiable |
| about | whom it rests on: a third party, an upstream, a clock, a human | names who to ask when it breaks |
| why not converted | why a parse at the boundary cannot make it an invariant | absent reason → convert it instead |
| evidence + strength | each piece, weakest first: belief · their contract · **an upstream guarantee** (`$org/$repo g$nnn`) · a test against the real dependency · a runtime monitor · a real-world check | belief alone is not evidence |
| blast radius | what breaks, for whom | sized, so the response can be judged |
| on break | each break and its required response: **absorbed** (no effect, by a named invariant) or **surfaced** (within a bound, fail fast) | declarative: what must happen, never which job does it. every break entry needs a response, or a stated reason it cannot be seen |
| feeds | invariant and guarantee ids whose proof assumes this claim | the assume → guarantee link, from the other side |
| review by | an `IsoDateStamp` | evidence ages; the claim may stop to hold |

## .the upstream guarantee tier

when the party is one of ours — another repo across a release boundary — cite its guarantee by id. its acceptance tests prove it, and a break of it needs a major version, so it outranks a vendor's prose and ranks below a test of our own against the real dependency.
