# howto.itemize-constraints.template=invariant

the template for one invariant entry. root: `howto.itemize-constraints._.md`.

file: `inventory.of=invariant.case=i$nnn-$slug.md` — the slug says the invariant in a few words.

declarative only. the entry says what must be true, never how the system keeps it true. the implementer is trusted to enforce it; each route's review checks that they did (`define.constraint.kind=invariant`, `.the two grains`).

## .template

```md
# i001 — reserved boards within stock

## .statement

for every lesson slot: reserved boards ≤ boards in stock.
each surfer reserves at most one board per slot.

## .cases

| case | what holds |
|---|---|
| baseline | a slot with boards free takes a reservation |
| boundary | the last board: reserved = stock, the next ask is refused |
| boundary | zero stock, as when a lesson is cancelled: no reservation holds |
| boundary | two surfers race for the last board: one reservation stands |
| boundary | one surfer asks twice for the same slot: one reservation stands |

## .why

a reservation past stock sends a surfer to the beach with no board; the instructor turns them away.

## .governs

- `LessonSlot`
- `LessonReservation`

## .relies on

- `a002-stripe-delivers-at-least-once` — a paid reservation counts against stock only once its payment lands

## .backs

- `g001-reservation-id-stable` — a consumer's reservation stays within stock for as long as it exists
```

## .the fields

| field | holds | rule |
|---|---|---|
| statement | what holds in every observable scenario, in domain words | no mechanism: no table, key, lock, dao, operation, or test |
| cases | the core baseline and the boundary cases, as domain outcomes | never every scenario: the rest is induced from these. a case names what holds, never what stops the break |
| why | who suffers, and how, when it breaks | the domain reason; it outlives every rewrite |
| governs | the domain objects whose data it constrains | it lives on these (`define.constraint.kind=invariant`) |
| relies on | assumption ids whose break would break it | the assume → guarantee link, internal side |
| backs | guarantee ids that rest on it | the link out, to a release boundary |

## .the test of the entry

swap the implementation — a new storage engine, a new orm, a rewrite of every operation. does a word of the entry change? if so, that word names a mechanism. cut it.

## .the review lives in the route

the entry holds no review status: no `verified`, no `skepticized`, no fulcrum pointer. the route that authors the entry best-guesses each case, skepticizes it, and itemizes each unconfident one as a fulcrum in its own `.fulcrums/`. the route's record dates; the entry does not.
