# rule.forbid.multiplicative-composition

## .what

never let a part reach past another part's declared promise. a caller that reads a callee's internals, or leans on behavior the callee never declared, binds its cases to the callee's cases: the two multiply.

> "the number of cases between which we have to distinguish … combine additively, rather than multiplicatively" — dijkstra 1970, EWD 288 ✅

## .the smell

a part reaches past the promise of the part below it:

```ts
// 👎 in getLessonInvoice — reads the reservations table that setLessonReservation owns
const reservations = await context.daoLessonReservation.findAll({ lessonUuid });
const paid = reservations.filter((reservation) => reservation.status === 'CONFIRMED' && reservation.chargeExid);
```

the invoice now depends on how reservations persist, which statuses exist, and when `chargeExid` gets set. a change to any of those breaks it, and no reservation test will say so.

the tells:

- a caller reads another part's storage, private fields, or dao around the operation that owns them
- a caller leans on behavior the callee never declared: a sort order, an error message text, a default, a side effect
- a reader must open two parts at once to know what one of them does
- a seam between two parts that no test crosses

## .the cure

compose additively — each part keeps its invariant local, and each caller trusts only the declared promise:

| move | holds because |
|---|---|
| one home per invariant — the part that owns the data owns the rule | a reader holds one part's cases, not two |
| a small declared promise (`getAllPaidLessonReservations({ lessonUuid })`) | the caller's cases bind to the promise, not to the body |
| trust the promise, never the body | a change behind the promise cannot reach the caller |
| one test per seam — order, units, the empty case, the error shape | the caller's assumption meets the callee's guarantee, at test time |

## .enforcement

a **seam** is a call across an owner or module boundary: an operation → its dao, one domain → another, a call through a contract. a call between two functions inside one part is no seam.

- a caller that reads another part's internals (its storage, private fields, or dao around its operation) = **blocker**
- a seam between two parts with no test that crosses it = **blocker**
- a caller that leans on a callee's undeclared behavior = **nitpick**

## .see also

- `catalog.of=tactic.constraint.kind=_.grain=enforcement.tactic=compose` — the member, in full
- `rule.require.compose-additively` — the require twin: one home per invariant, small promises, a test per seam
- `rule.forbid.scattered-invariant-guards` — the same reach, for many writers of one rule
- `catalog.of=tactic.abstraction._` — the tactics that keep a promise small
