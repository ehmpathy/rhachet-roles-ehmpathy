# define.constraint._.evidence

the term evidence behind `define.constraint._`: where the word comes from, why it beat its rivals, and the precedent that backs it. a zoom of that brief; the definition itself lives there.

## .etymology

latin *constringere*, "to bind together, to draw tight". a constraint narrows what may happen; it does not describe what does. the word already carries that sense in two prior uses:

- a **storage constraint** (unique, check, foreign key) — one structural enforcement of one constraint
- **`ConstraintError`** (helpful-errors) — what a runtime enforcement throws when the caller breaks one

so the generic converges with both prior uses rather than overload them: each names a part of the same whole.

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| kept by | us · the world |
| place | internal (inside one release) · release boundary |
| grain | declaration · enforcement |

| kept by \ place | internal | release boundary |
|---|---|---|
| us | invariant | invariant, and the guarantee that cites it for consumers |
| the world | assumption | assumption (a consumer's view of an upstream guarantee) |

forbidden cell: a guarantee at an internal place. internal contracts change freely, so they carry no backcompat promise.

### precedent

| precedent | the generic it names | citation |
|---|---|---|
| hoare's pre- and postcondition, and the loop invariant | assertions that bound what a program may do | hoare 1969 |
| codd's keys and constraints | rules a relation must satisfy | codd 1970 |
| jones's rely and guarantee | what a component takes from its environment, and what it gives back | jones 1981/83 |
| abadi and lamport's assume-guarantee specs | each component's guarantee discharges another's assumption | abadi & lamport 1993, 1995 |
| meyer's design by contract | precondition, postcondition, class invariant: three clauses of one contract | meyer 1992 |
| benveniste et al.'s contract-based design | assumptions and guarantees as one meta-theory for system design | benveniste et al. 2018 |

each citation, with its doi: `ref.invariant.history`, `.the assume → guarantee chain`.

## .rejected alternatives

| term | why rejected |
|---|---|
| declaration | names one grain of a constraint (the inventory entry), not the constraint |
| contract | overloaded: an api contract, a contract test, a legal contract. a contract holds several constraints, so it is a container, not the generic |
| rule | overloaded with every brief (`rule.forbid.*`, `rule.require.*`) |
| property | the formal-methods word (alpern & schneider: safety and liveness), but it reads as an object field in code |
| promise | names only the guarantee half, and collides with a js `Promise` |
| none (name all three each time) | costs three words per mention and hides the shared shape |

## .invariants of the term

- every constraint is exactly one of invariant, assumption, or guarantee; the sort test in `howto.itemize-constraints._` decides which
- every constraint has a declaration and at least one enforcement; the declaration never names the enforcement
- a guarantee sits only at a release boundary

## .see also

- `define.constraint._` — the definition this zoom backs
- `ref.invariant.history` — every citation above, in full
