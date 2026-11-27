# catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=decorate

a member of `catalog.of=tactic.abstraction._`. kind `contract`: it adds a concern to an operation from outside.

## .the move

give each operation one concern. add each cross-cut concern — a log trail, a retry, a lock, a cache — as a decorator around the operation, never woven into its body. the core reads as its one job; each decorator reads as its one concern.

## .why

> "'Complect' means to interleave, to entwine, to braid. Complect results in bad software." — hickey 2011 ✅

the decorator pattern attaches a responsibility to an operation from outside, so neither the operation nor the concern knows the other's body (gamma et al. 1994 🟡).

## .in our tools

- `with*` decorators (`withLogTrail`, `withMutexLock`): the concern wraps the procedure, never weaves into it (`rule.require.hook-wrapper-pattern`, mechanic)
- dependency injection: logic never builds its own tools (`rule.require.dependency-injection`, mechanic)
- the grains: compute, i/o, and composition, each in its own unit

## .the failure it prevents

a complected operation: one change needs a read of three concerns that never needed to meet.

## .relations

- `rule.forbid.complected-operations` — the forbid rule a reviewer loads for this tactic; the require pole stays with the two mechanic rules below
- `rule.require.single-responsibility` (mechanic) — owns the one-concern rule this applies
- `rule.require.hook-wrapper-pattern` (mechanic) — owns the decorator shape in our code
- `tactic=separate` — its peer at the grain of a module: separate cuts parts by decision; decorate keeps a cross-cut concern out of each part
