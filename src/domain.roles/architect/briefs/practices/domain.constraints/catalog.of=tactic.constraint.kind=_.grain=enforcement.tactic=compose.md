# catalog.of=tactic.constraint.kind=_.grain=enforcement.tactic=compose

a member of `catalog.of=tactic.constraint._`. kind `_`: it arranges the enforcement of every kind. grain `enforcement`: it shapes the code, never the entry. the peer of `tactic=itemize`.

## .the move

decompose so each invariant stays local to one part. each caller trusts only the declared promise of the part below, never its body. then test each seam: parts that each keep their promise do not prove the whole.

## .why

> "the number of cases between which we have to distinguish … combine additively, rather than multiplicatively" — dijkstra 1970, EWD 288 ✅

three parts with ten cases each is thirty cases to check, or a thousand. a sum stays reviewable as the system grows; a product does not.

## .in our tools

- `setLessonReservation` owns the reservation rules; `getAllPaidLessonReservations({ lessonUuid })` is the promise the invoice leans on
- one integration test per seam: the order, the units, the empty case, the error shape (`rule.require.test-coverage-by-grain`, mechanic)

## .the failure it prevents

cases that multiply across parts. `getLessonInvoice` reads reservation records straight from `daoLessonReservation`, so it binds to every status and to the moment `chargeExid` gets set. a change to reservations breaks invoices, and no reservation test says so.

## .relations

- `rule.forbid.multiplicative-composition`, `rule.require.compose-additively` — the rules a reviewer loads for this tactic
- `tactic=itemize` — the other grain of `_`: the entry names what each part keeps
- `tactic=refuse` · `tactic=assert` · `tactic=prove` — the per-kind enforcements compose arranges; a seam is where one part's guarantee meets the next one's assumption
- `define.constraint.grain=enforcement` — the ladder each part's enforcement sits on
- `philosophy.constraints-shrink-the-space` — comprehension as the first benefit of a smaller space
- `catalog.of=tactic.abstraction.kind=_.verb=set.tactic=gather` — one home per invariant
