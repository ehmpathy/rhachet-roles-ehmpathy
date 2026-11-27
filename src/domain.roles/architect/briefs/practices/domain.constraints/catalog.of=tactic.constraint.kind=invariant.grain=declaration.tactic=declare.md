# catalog.of=tactic.constraint.kind=invariant.grain=declaration.tactic=declare

a member of `catalog.of=tactic.constraint._`. kind `invariant`: a constraint we keep, inside. grain `declaration`: what must be true, in the entry. the peer of `tactic=refuse`.

## .the move

before the operation that could break it, name the invariant in one line, on the object it governs, in domain words. add its baseline and its boundary cases. never name its enforcement.

## .why

> no loop should be written down "without stating the relation whose invariance will not be destroyed by the execution of the repeatable statement" — dijkstra 1972, *the humble programmer*, EWD 340 ✅

the invariant picks the break paths, the enforcements, and the tests. an enforcement chosen first enforces whatever its author happened to imagine.

## .in our tools

- `[i001] reserved boards ≤ boards in stock, per slot` — one entry in `inventory.of=invariant`
- baseline: a slot with 4 boards accepts 4 reservations. boundary cases: the 5th is refused; two surfers race for the last board; a refund frees a board
- no type, table, or dao in the entry, so it outlives each rewrite

## .the failure it prevents

an invariant no entry declares. `if (slot.reserved >= slot.stock) throw` in one operation is the only place the rule lives. the voucher path never learns it, and no test names the rule it guards.

## .relations

- `rule.forbid.implicit-invariants`, `rule.require.invariant-before-operation` — the rules a reviewer loads for this tactic
- `tactic=refuse` — the other grain of `invariant`: declare says what must hold; refuse keeps it true
- `tactic=itemize` — the `_` declaration: the entry this invariant is written into
- `define.constraint.kind=invariant` · `define.constraint.grain=declaration` — the terms
- `philosophy.invariants-are-the-source` — why the declaration is the source
