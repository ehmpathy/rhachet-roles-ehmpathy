# define.constraint.grain=enforcement

## .what

an **enforcement** = the mechanism that asserts a constraint is not broken. every constraint has two grains (`define.constraint.kind=invariant`):

- **declaration** — what must be true, with its baseline and boundary cases, in domain words. the architect declares it in the inventory
- **enforcement** — what holds it true. the implementer's choice, in code. each route's review checks one exists

the declaration never names its enforcement. the declaration is stable across rewrites; the enforcement is the code of the day.

## .per constraint

| constraint | to enforce it | leans on |
|---|---|---|
| invariant | keep it true: refuse the write that would break it | structural first |
| assumption | assert we are not mistaken: the world keeps it, so we cannot make it hold, but we refuse to proceed on a false premise. detect the break and fail fast | runtime and monitor |
| guarantee | prove it to consumers before each release: a blackbox acceptance test through the published contract | devtime |

## .the ladder, earliest first

| rung | kind | asserts | examples |
|---|---|---|---|
| 1 | structural · **compilation** | the program with the break does not compile | a type (`IsoPrice`), a closed enum, an exhaustive switch |
| 2 | structural · **abstraction** | the shape leaves no path to the break at run time | a domain object that refuses construction, a parse at the boundary, one write path, a guarded status edge, a unique or check constraint, an optimistic lock that refuses the commit |
| 3 | operational · **proactive, devtime** | a deliberate run — a test or a play — against test, prep, or prod | a case test (a clamp), a property test, an acceptance test, a play against prep or prod; universal: induction, a solver |
| 4 | operational · **reactive, runtime** | live, in the path: the act that would break it fails fast | a runtime assertion, a `ConstraintError` on bad input |
| 5 | operational · **reactive, monitor** | live, out of band, after the fact | a reconcile job, a drift alert |

the three operational rungs are peers by when the check runs: **devtime** (a run we start on purpose) · **runtime** (in the path of a real act) · **monitor** (beside the live system, after the fact). devtime is not bound to one environment: a test runs against test, a play against prep or prod.

each rung later lets more escape: rungs 1–2 ship no break; rung 3 ships only the cases it misses; rung 4 fails one act loud; rung 5 lets harm land within its window.

## .how to pick

1. **reach for the earliest rung the break allows.** a stable fact the type owns → rung 1. a rule that spans fields or objects → rung 2, on the aggregate that owns it
2. **the world forces the late rungs.** a break visible only after the fact (a webhook that never arrives) needs a monitor
3. **match breadth to the cost of failure.** a check at rung 3 names its breadth — one case · a property over generated cases · every case (induction, a solver). a pacemaker earns a proof; a lesson reservation earns a clamp per boundary
4. **test the structural rungs too.** a test of the break case shows the structure holds
5. **one enforcement per break path.** walk every writer; each way to break the invariant gets one enforcement (`rule.require.invariant-before-operation`)

## .what is not an enforcement

- **a guard in one caller.** it stops the break only on the path that runs it; the next path skips it (`rule.forbid.scattered-invariant-guards`)
- **a check, then a separate write.** the world changes between the two (`rule.forbid.check-then-write`)
- **a comment or a doc.** a declaration with no enforcement is a wish

## .cite the main ones

an inventory entry may carry an optional `.enforcement=$slug` zoom-in that cites its main and non-obvious enforcements. the zoom-in cites; it is never the enforcement, and never exhaustive (`howto.itemize-constraints._`).

## .see also

- `define.constraint._` — the generic over what an enforcement holds
- `define.constraint.kind=invariant` — the declaration grain, and the summary of this ladder
- `catalog.of=tactic.abstraction._` — rung 2, by the tools we already hold
- `catalog.of=pattern.transaction._` — rungs 2 and 4 across concurrency and failure
- `rule.require.assumptions-with-evidence` — the assumption line in full
- `rule.require.acceptance.blackbox` (mechanic) — the guarantee line
- `rule.require.clamp-edge-cases` (mechanic) — the case test at rung 3
- `ref.invariant.history` — precedent per rung: minsky 2011, king 2019, codd 1970, meyer 1992, claessen & hughes 2000, dijkstra 1975
- `define.constraint.grain=enforcement.evidence` — the term's etymology, precedent, and rejected alternatives
