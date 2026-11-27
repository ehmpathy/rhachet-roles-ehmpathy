# catalog.of=tactic.constraint._

the tactics that keep a constraint true: each one declares a constraint or enforces it, and each names the rule a reviewer loads to check it. the terms live in `define.constraint._`; this root holds the moves.

```
catalog.of=tactic.constraint._.md                                         # this root
catalog.of=tactic.constraint.kind=$kind.grain=$grain.tactic=$tactic.md    # one member per tactic
rule.require.$tactic.md                                                   # the move
rule.forbid.$failure.md                                                   # the failure it prevents
```

a reviewer loads only `rule.*` files, so each cell names its rule pair. each member holds its move in full: the move, its source, our tools, the failure it prevents. its rule holds the grade.

## .the dimensions — kind × grain

the same two axes as `define.constraint._`:

- **kind** — which constraint: `invariant` (we keep it, inside), `assumption` (the world keeps it), `guarantee` (we keep it, for consumers), or `_`, a tactic for every kind
- **grain** — what the tactic shapes: `declaration` (what must be true, in an inventory entry) or `enforcement` (what holds it true, in code)

| kind \ grain | declaration | enforcement |
|---|---|---|
| `_` | `itemize` | `compose` |
| `invariant` | `declare` | `refuse` |
| `assumption` | `attest` | `assert` |
| `guarantee` | `promise` | `prove` |

the dimensions pass three tests:

- **disjoint** — each tactic sits in one cell; a `_` tactic is never repeated under a specific kind
- **exhaustive** — every kind has a tactic for each grain, direct or via `_`
- **independent** — every kind has both grains, so the product has no dead cell

## .the tactics

| kind | grain | tactic | the move, in one line | the failure it prevents | forbid · require |
|---|---|---|---|---|---|
| `_` | declaration | `itemize` | one inventory entry per constraint, with an id, cited at each enforcement and test | a constraint declared in a comment, a test name, a pr description | `rule.avoid.unitemized-constraints` · `rule.prefer.itemized-constraints` |
| `_` | enforcement | `compose` | each invariant stays local to one part; each caller trusts only the declared promise; each seam gets a test | cases that multiply across parts | `rule.forbid.multiplicative-composition` · `rule.require.compose-additively` |
| `invariant` | declaration | `declare` | name the invariant, its baseline, its boundary cases, in domain words, before the operation that could break it | an invariant no entry declares | `rule.forbid.implicit-invariants` · `rule.require.invariant-before-operation` |
| `invariant` | enforcement | `refuse` | enforce where every path must pass: a type, a domain object that refuses construction, one write path, a storage constraint | a guard in one caller; a read, a check, then a write | `rule.forbid.scattered-invariant-guards`, `rule.forbid.check-then-write` · `rule.require.invariant-before-operation` |
| `assumption` | declaration | `attest` | declare the condition the world keeps, with its evidence, its strength, and the response on a break | correctness that rests on a condition no one wrote down | `rule.forbid.implicit-assumptions` · `rule.require.assumptions-with-evidence` |
| `assumption` | enforcement | `assert` | detect each break at the edge, and fail fast | a break that lands silent | `rule.forbid.implicit-assumptions` · `rule.require.assumptions-with-evidence` |
| `guarantee` | declaration | `promise` | declare what consumers may rely on, and what they may not, at a release boundary | a promise consumers infer from behavior | `rule.forbid.implicit-contracts` (domain.abstractions) · `rule.require.narrow-contracts` (domain.abstractions) |
| `guarantee` | enforcement | `prove` | prove each guarantee before each release, with a blackbox acceptance test | a guarantee broken by an edit to its own test | `rule.forbid.test-edit-without-named-proof` (mechanic) · `rule.require.acceptance.blackbox` (mechanic) |

## .by smell

| the smell | reach for |
|---|---|
| "invariant:" in a comment, with no id | `itemize` |
| a guard copied into a second operation | `refuse` |
| a `get`, an `if`, then a `set` on one invariant | `refuse` (`rule.forbid.check-then-write`) |
| "that never happens" in a review | `attest` |
| a third-party response used with no parse | `assert` |
| a caller that reads another part's records | `compose` |
| an assertion weakened to turn a red acceptance test green | `prove` |

## .the order

declare before you enforce: the declaration says what must be true; the enforcement asserts it is not broken. reach for the earliest enforcement that fits — structural, then test time, then runtime, then monitor (`define.constraint.grain=enforcement`).

## .see also

- `define.constraint._` — the terms: the three kinds and the two grains
- `define.constraint.grain=enforcement` — the ladder each enforcement sits on
- `howto.itemize-constraints._` — the inventory each declaration lands in
- `philosophy.constraints-shrink-the-space` — why constraints matter
- `catalog.of=tactic.abstraction._` — the tactics that give a constraint one home
