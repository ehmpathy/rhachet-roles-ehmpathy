# catalog.of=tactic.abstraction.kind=_.verb=use.tactic=barrier

a member of `catalog.of=tactic.abstraction._`. kind `_`: a caller uses a contract and a construct the same way. the use-half of `tactic=separate`: separate makes the barrier; this keeps callers on its far side.

## .the move

call through the abstraction, never past it. a caller touches a construct's constructor and operations, never its representation; a caller leans on a contract's promise, never its body. the hidden side can then change with no caller edit, and the operations stay the one place an invariant is kept.

## .why

> "The horizontal lines represent abstraction barriers that isolate different 'levels' of the system. At each level, the barrier separates the programs (above) that use the data abstraction from the programs (below) that implement the data abstraction." — abelson & sussman 1985, *structure and interpretation of computer programs* §2.1.2 ✅

liskov & zilles 1974 define a type by its operations, not its shape ("programming with abstract data types", *acm sigplan notices* 9(4); verbatim fetch open).

## .in our tools

- `priceSum`, `priceMultiply` — never `a.amount + b.amount`
- domain objects: built via their constructor, changed via `.clone()`
- refs: callers hold a `RefByUnique`, never the record
- a caller calls `setLessonReservation`, never `daoLessonReservation.set` around it

## .the failure it prevents

callers reach into fields or around the write path, so a representation change ripples, and each caller re-implements the invariant the operation would have kept.

## .relations

- `rule.require.compose-additively`, `rule.forbid.multiplicative-composition` (domain.constraints) — the rules a reviewer loads for this tactic
- `tactic=separate` — separate makes the barrier; this keeps callers on its far side
