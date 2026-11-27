# define.constraint._

the root of the constraint terms: the generic, its two axes, and a zoom per value.

```
define.constraint._.md                  # this root
define.constraint.kind=$kind.md         # invariant · assumption · guarantee
define.constraint.grain=$grain.md       # declaration · enforcement
```

## .the dimensions — kind × grain

| kind \ grain | declaration (what must be true) | enforcement (what holds it true) |
|---|---|---|
| **invariant** | the claim, its baseline, its boundary cases | keep it true: refuse the write that would break it |
| **assumption** | the claim, its evidence, the response on a break | assert it at the edge: detect the break, fail fast |
| **guarantee** | the promise, the exclusions, its proof | prove it before each release: a blackbox acceptance test |

the dimensions pass three tests:

- **disjoint** — each constraint is one kind; each artifact of it is one grain
- **exhaustive** — no constraint falls outside the three kinds; no artifact of one falls outside the two grains
- **independent** — every kind has both grains, so the product has no dead cell. the kind sorts the whole constraint, so it shapes both grains; neither axis nests under the other

## .what

a **constraint** = a rule we add onto a system for how it must behave. the generic over three peers:

| constraint | who keeps it | where it holds |
|---|---|---|
| **invariant** | we do, inside | every scenario a reader can observe (`define.constraint.kind=invariant`) |
| **assumption** | the world does; we hold evidence and assert it | the edge where our system meets one we do not own (`define.constraint.kind=assumption`) |
| **guarantee** | we do, for consumers | a release boundary: a published contract (`define.constraint.kind=guarantee`) |

each has two grains: a **declaration** (what must be true, in domain words, in an inventory entry; `define.constraint.grain=declaration`) and an **enforcement** (what holds it true, in code; `define.constraint.grain=enforcement`). the declaration never names its enforcement.

usage: *"which constraint, and how is it enforced?"* · *"this change adds a constraint; which inventory holds it?"* · *"a constraint shrinks the space of scenarios the system can reach"* (`philosophy.constraints-shrink-the-space`).

## .see also

- `catalog.of=tactic.constraint._` — the moves: each cell of this grid, its tactic, and its rule pair
- `define.constraint.kind=invariant` · `define.constraint.kind=assumption` · `define.constraint.kind=guarantee` — the three peers
- `define.constraint.grain=declaration` · `define.constraint.grain=enforcement` — the two grains
- `howto.itemize-constraints._` — where each is declared
- `philosophy.constraints-shrink-the-space` — why constraints matter
- `define.constraint._.evidence` — the term's etymology, precedent, and rejected alternatives
