# catalog.of=tactic.abstraction.kind=_.verb=set.tactic=gather

a member of `catalog.of=tactic.abstraction._`. kind `_`: it makes contracts and constructs alike. the peer of `tactic=separate`.

## .the move

wrap what must change together under one root. outside refs go to the root only. the root enforces the invariant that spans the cluster, and one transaction changes one root (`catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=operation-per-transaction`).

## .why

> "Any references from outside the aggregate should only go to the aggregate root." — fowler, after evans 2003 ✅

## .in our tools

- `LessonReservation` holds the consent rule; `setLessonReservation` is its one write path
- a `DomainEntity` with `static unique` — the root's identity

## .the failure it prevents

an invariant that spans objects and has no home, so many writers touch inner parts and each one checks, or forgets, the rule (`rule.forbid.scattered-invariant-guards`).

## .relations

- `rule.require.aggregate-roots`, `rule.forbid.scattered-invariant-guards` (domain.constraints) — the rules a reviewer loads for this tactic
- `rule.require.single-responsibility` (mechanic) — one reason to change per unit; this gathers the parts that share that reason
- `tactic=separate` — the other half
