# define.constraint.kind=invariant

## .what

an **invariant** = a statement about the domain that holds in every scenario a reader can observe.

- reserved boards ≤ boards in stock, per lesson slot
- a lesson bill = the sum of its lines
- every lesson reservation carries the consent its surfer requires on the lesson date

the claim covers every scenario, but no one lists them. declare the core baseline and the boundary cases, in domain words; every other scenario is induced from them.

| case | reserved boards ≤ stock |
|---|---|
| baseline | a slot with boards free takes a reservation |
| boundary | the last board: reserved = stock, the next ask is refused |
| boundary | zero stock, as when a lesson is cancelled: no reservation holds |
| boundary | two surfers race for the last board: one reservation stands |
| induced | the 3rd of 10 boards acts like its class; it needs no case |

best-guess each case, then skepticize it: what would make it wrong? record every case. itemize only the unconfident ones as fulcrums; a human checks those, never the rest. never halt to ask.

### why the baseline and the boundaries suffice

physics never lists the interior. a law, a start, and the edges fix it:

| principle | the claim | for an entry |
|---|---|---|
| determinism (laplace 1814) | a law plus one start fixes every later scenario | the baseline, plus the rule that steps from it: induction |
| well-posedness (hadamard 1902) | initial and boundary values fix one solution; the inside moves continuously with them | declare the edges; the interior follows |
| maximum principle (hopf 1927) | extremes sit on the boundary | a bound that holds at the last board holds at the third |
| boundary layer (prandtl 1904) | the action concentrates in a thin layer at the edge | so do defects: the race, the last board, zero stock |

software found the same: one case per equivalence class, and both sides of each class edge, since faults cluster there (myers 1979). citations: `ref.invariant.history` (architect), `.physics — why the start and the edges carry the claim`.

the bound: induction covers the interior only where it is uniform. an edge hidden inside a class — a price tier at the 10th board — is a boundary. find it; declare it.

## .why

the invariant is the definition of correct.

- without it, no one can say what a defect is. a defect is found only when production breaks it
- with it, every design choice has a test: does this keep the invariant, or break it?
- types, storage constraints, transactions, tests — each is one way to enforce an invariant, never the goal itself

an invariant is one of three **constraints** we add onto a system for how it must behave: an invariant (we keep it, inside), an assumption (the world keeps it), a guarantee (we keep it, for consumers at a release boundary). `howto.itemize-constraints._` (architect) holds all three.

## .two grains: declaration and enforcement

| grain | says | who owns it | where it lives | changes when |
|---|---|---|---|---|
| **declaration** | what must always be true, with its baseline and boundary cases | the architect declares it | the inventory entry, in domain words | the domain changes |
| **enforcement** | what holds it true — the implementer's choice | the implementer, trusted to enforce it | the code | the implementation changes |

reviews close the gap: each route's review checks that every declared constraint has an enforcement (`howto.itemize-constraints._`, architect). never mix the grains in one statement — an invariant that names its enforcement goes stale on the next rewrite.

## .every constraint has an enforcement

an **enforcement** = the mechanism that asserts a constraint is not broken. two kinds:

| kind | asserts | examples |
|---|---|---|
| **structural** | on every path, by construction. two forms: **compilation** — the program with the break does not compile · **abstraction** — the shape leaves no path to the break at run time | compilation: a type (`IsoPrice`), a closed enum, an exhaustive switch · abstraction: a domain object that refuses construction, a parse at the boundary, one write path, a guarded status edge, a unique or check constraint or an optimistic lock that refuses the commit |
| **operational** | on the cases a check covers: it catches the break. three flavors: **proactive, devtime** — a deliberate run, a test or a play, against test, prep, or prod · **reactive, runtime** — live, in the path: the act that would break it fails fast · **reactive, monitor** — live, out of band, after the fact | devtime: a clamp test, a property test, an acceptance test, a play; universal: induction, a solver · runtime: a runtime assertion, a `ConstraintError` on bad input · monitor: a reconcile job, a drift alert |

prefer the earliest enforcement the break allows: structural → devtime → runtime → monitor. a check needs no exhaustive sweep: check the baseline and each boundary case, and induction carries the claim to every other scenario. a guard in one caller is neither kind: the next path skips it.

the five rungs in full, how to pick one, and how to enforce each constraint — an invariant, an assumption, a guarantee — live in `define.constraint.grain=enforcement` (architect).

the invariant never names its enforcement. the declaration is stable across rewrites; the enforcement is the code of the day, checked in each route's review.

## .where an invariant lives

on the object it governs, in the domain's own words.

- the consent rule governs a lesson reservation, not a surfer. so the `LessonReservation` domain object enforces it, and every path that writes a reservation passes through `setLessonReservation`
- an abstraction is where an invariant lives (`philosophy.abstraction-creates-precision`, architect): name the abstraction and you name its enforcement

## .the question

of every change, ask: **which constraint, and how is it enforced?**

## .see also

- `define.constraint.kind=invariant.evidence` (architect) — the term's etymology, precedent, and rejected alternatives
- `define.constraint.grain=enforcement` (architect) — the ladder and the per-constraint table, in full
- `rule.require.invariant-before-operation` (architect) — invariant → break paths → enforcement per path → proof
- `rule.forbid.scattered-invariant-guards` · `rule.forbid.check-then-write` (architect) — the two antipatterns that skip an enforcement
- `define.software-domain-taxonomy` (architect) — which kind of system keeps this invariant
- `philosophy.abstraction-creates-precision` (architect) — why the abstraction is the invariant's home
- `rule.require.clamp-edge-cases` (mechanic) — the case proof of a break case
