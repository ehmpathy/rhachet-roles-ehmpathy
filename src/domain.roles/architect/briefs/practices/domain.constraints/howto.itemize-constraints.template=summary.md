# howto.itemize-constraints.template=summary

the templates for the three `._` summaries of one subdomain. root: `howto.itemize-constraints._.md`.

a summary is an index: axes, census, one line per entry. no statement, no enforcement status — the statement lives in the entry; enforcement lives in the code, checked by route reviews.

## .template — inventory.of=invariant._.md

```md
# inventory.of=invariant — subdomain=reservations

## .axes

- `case` = `i$nnn-$slug` — each invariant of this subdomain

## .census

3 invariants

## .index

| case | governs |
|---|---|
| i001-reserved-boards-within-stock | LessonSlot, LessonReservation |
| i002-reservation-carries-consent | LessonReservation |
| i007-one-payment-per-charge | Payment |
```

## .template — inventory.of=assumption._.md

```md
# inventory.of=assumption — subdomain=reservations

## .axes

- `case` = `a$nnn-$slug` — each assumption this subdomain's correctness rests on

## .census

2 assumptions · 0 past review

## .index

| case | about | review by |
|---|---|---|
| a001-birth-date-is-true | the surfer | 2027-05-01 |
| a002-stripe-delivers-at-least-once | stripe | 2027-05-01 |
```

## .template — inventory.of=guarantee._.md

```md
# inventory.of=guarantee — subdomain=reservations

## .axes

- `case` = `g$nnn-$slug` — each promise this subdomain makes at a release boundary

## .census

1 guarantee

## .index

| case | surface | since |
|---|---|---|
| g001-reservation-id-stable | getLessonReservation | v2.0.0 |
```

## .the rules

- a line carries an address and stable reference columns only; a statement, claim, or promise belongs in the entry
- no enforcement column: it would churn with the code
- census counts derive from the entries; a mismatch is a stale summary
- a new axis, found when two entries are compared, goes under `.axes`, and the space is re-walked
