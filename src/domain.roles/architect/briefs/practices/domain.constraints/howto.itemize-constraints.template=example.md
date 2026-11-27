# howto.itemize-constraints.template=example

the template for a scenario zoom-in on one entry. root: `howto.itemize-constraints._.md`.

file: `inventory.of=$peer.case=$id-$slug.example=$slug.md`, where `$peer` is `invariant`, `assumption`, or `guarantee`.

one per subtle or costly case; most entries need none. the entry's `.cases` names every core case in one line; an example narrates one of them in depth and cites it by name. a case first seen in an example belongs in `.cases` too. declarative like its entry: it tells what happens in the domain, never which mechanism stops it — that belongs in the code.

## .template

```md
# i001 — example: double-click at slot open

entry: `inventory.of=invariant.case=i001-reserved-boards-within-stock.md`

## .narrative

the dawn patrol slot opens at 6:00 with one foamboard left. kai taps "reserve" twice in 200ms. a moment later, lani taps "reserve" on the same slot.

## .timeline

given('[i001] a slot with 1 board left')
  when('[t0] the same surfer submits two reservations at once')
    then('one reservation stands')
    then('the other is refused')
    then('reserved = stock')
  when('[t1] two surfers race for the last board')
    then('one reservation stands')
    then('the other surfer is told the slot is full')

## .what sets it apart

two races look alike from outside, and the invariant must hold through both: one surfer twice, and two surfers once each.
```
