# catalog.of=tactic.constraint.kind=invariant.grain=enforcement.tactic=refuse

a member of `catalog.of=tactic.constraint._`. kind `invariant`: a constraint we keep, inside. grain `enforcement`: what keeps it true, in code. the peer of `tactic=declare`.

## .the move

enforce the invariant where every path must pass, at the earliest rung the break allows: a type, a domain object that refuses construction, one write path, a storage constraint, an optimistic lock. walk each break path — a race, a retry, a second write path, a bad input — and give each one an enforcement. prove each break case with a test, red without its enforcement.

## .why

> "Make illegal states unrepresentable" — minsky 2011 ✅

a refusal in the shape binds every caller, the next one too. a guard in one caller binds only its own path.

## .in our tools

- `LessonReservation` with no matched consent throws a `ConstraintError` that names the fix
- `setLessonReservation` is the one write path; the dao is never called around it
- a unique key on `(slotUuid, surferUuid)`; a version on the slot record

## .the failure it prevents

a guard in one caller, or a read, a check, then a write. two surfers in the same 300ms both read 1 board left, both pass `if (slot.boardsReserved >= slot.boardsInStock)`, and both reserve: 5 boards promised from a rack of 4.

## .relations

- `rule.forbid.scattered-invariant-guards`, `rule.forbid.check-then-write` (domain.transactions), `rule.require.invariant-before-operation` — the rules a reviewer loads for this tactic
- `tactic=declare` — the other grain of `invariant`: refuse keeps true what declare names
- `tactic=compose` — the `_` enforcement: each invariant refused inside one part
- `define.constraint.grain=enforcement` — the ladder, earliest rung first
- `catalog.of=tactic.abstraction._` — the abstraction rung, by the tools we already have
- `catalog.of=pattern.transaction._` — the enforcements the storage runs inside the commit
