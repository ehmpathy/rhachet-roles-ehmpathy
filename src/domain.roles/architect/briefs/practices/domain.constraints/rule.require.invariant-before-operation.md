# rule.require.invariant-before-operation

## .what

before you design or write an operation that writes, work in this order:

1. **invariant** — declare it in one line, on the object it governs (`define.constraint.kind=invariant`)
2. **break paths** — name each way it could break: a race, a retry, a second write path, a bad input, a partial failure
3. **enforcement per path** — name the enforcement that stops each, structural first. one enforcement may stop several
4. **proof** — a test per break case, red without its enforcement (`rule.require.clamp-edge-cases`)

then write the operation.

step 1 cites an inventory entry, or adds one; the entry stays declarative. steps 2–4 belong to this change: they live in the route's review, never in the entry (`howto.itemize-constraints._`).

## .why

- the invariant picks the enforcements, the tests, and the code. without it, "add some locks and tests" has no end and no test of done
- the break paths become a checklist. a reviewer reads one line and asks one question: *which invariant, and what enforces it?*
- an enforcement chosen before its invariant enforces whatever the author happened to imagine

## .example

`setLessonReservation`. the invariant, first:

> reserved boards ≤ boards in stock, per slot; each surfer reserves at most one board per slot.

| break path | enforcement | kind |
|---|---|---|
| two reservations race for the last board | a version on the slot record; the second write fails and retries | structural |
| one surfer double-clicks, or a client retries | a unique constraint on `(slotUuid, surferUuid)` | structural |
| a reservation moves `RESERVED → REFUNDED` | declared status edges: `RESERVED → PAID → ATTENDED`, or `RESERVED → CANCELLED` | structural |
| a voucher path writes a reservation through the dao | `setLessonReservation` is the one write path | structural |
| each of the above | a test per break case, red without its enforcement | proof (case) |

## .when no invariant fits the whole

decompose until each part owns an invariant it can declare, then test the seams. never write a vague whole-system invariant ("the plan is valid") that no test can clamp.

## .enforcement

- an operation that writes, with no declared invariant = **blocker**
- a named break path with no enforcement = **blocker**
- an enforcement with no proof of its break case = **blocker**

## .see also

- `catalog.of=tactic.constraint.kind=invariant.grain=declaration.tactic=declare` · `catalog.of=tactic.constraint.kind=invariant.grain=enforcement.tactic=refuse` — the members, in full: step 1, then steps 2–4
- `rule.forbid.implicit-invariants` — the forbid twin: the invariant no entry declares
- `rule.forbid.scattered-invariant-guards` — the forbid twin: the guard in one caller
- `rule.forbid.check-then-write` — the forbid twin: the race
- `define.constraint.kind=invariant` — what an invariant and an enforcement are
- `rule.require.clamp-edge-cases` (mechanic) — the case proof
