# howto.itemize-constraints.template=enforcement

the template for an enforcement zoom-in. root: `howto.itemize-constraints._.md`.

an **enforcement** is code: what asserts that an invariant, assumption, or guarantee is not broken (`define.constraint.kind=invariant`). an enforcement zoom-in is a doc about one enforcement — a pointer, never the enforcement itself.

file: `inventory.of=$peer.case=$id-$slug.enforcement=$slug.md`, where `$peer` is `invariant`, `assumption`, or `guarantee`.

a citation, not an exhaustive list. cite the main enforcements of each entry, and every non-obvious one — an enforcement a reader would not find from the entry alone (a reconcile job, an optimistic lock deep in a dao, a constraint in a migration). an obvious one (a type on the field the entry names) may go uncited. each route's review still checks every entry has an enforcement, cited or not.

a suffix zoom-in on its entry, like `.example=`. the entry never names it and never changes for its sake: when the implementation changes, replace or delete the zoom-in.

## .template

```md
# i001 — enforcement: slot optimistic lock

entry: `inventory.of=invariant.case=i001-reserved-boards-within-stock.md`

## .kind

structural

## .asserts

a reservation commits only if the slot is unchanged since it was read.

## .covers

- two surfers race for the last board
- one surfer asks twice for the same slot

## .code

`src/access/daos/daoLessonSlot.ts`

## .proof

`given('[i001] two surfers race for the last board', …)` — `setLessonReservation.integration.test.ts`
```

## .examples, one per peer

| zoom-in | kind | asserts |
|---|---|---|
| `inventory.of=invariant.case=i001-reserved-boards-within-stock.enforcement=slot-optimistic-lock.md` | structural | a reservation commits only on an unchanged slot |
| `inventory.of=assumption.case=a002-stripe-delivers-at-least-once.enforcement=charge-event-reconcile.md` | operational | a daily match of stripe's charges against recorded payments; a gap pages the on-call |
| `inventory.of=guarantee.case=g001-reservation-id-stable.enforcement=acceptance-get-reservation.md` | operational | a blackbox acceptance test reads a reservation twice through the published sdk export |

## .the fields

| field | holds | rule |
|---|---|---|
| kind | **structural** — by compilation (a type, a closed enum: the break does not compile) or by abstraction (a domain object, a parse at the boundary, one write path, a storage constraint: the shape leaves no path to the break) · **operational** — a check catches the break: proactive at devtime (a test, or a play against prep or prod), reactive at runtime (an assertion in the path), or reactive by monitor (out of band, after the fact) | `define.constraint.kind=invariant` |
| asserts | what the enforcement checks, in one line | point, never restate the code |
| covers | the entry's cases this enforcement covers | a case not named here is not claimed |
| code | a path | it moves; update or delete the zoom-in when it does |
| proof | the test that cites the entry id, red without the enforcement | `rule.require.clamp-edge-cases` (mechanic) |
