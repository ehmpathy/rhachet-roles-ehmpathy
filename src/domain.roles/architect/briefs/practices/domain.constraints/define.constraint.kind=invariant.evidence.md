# define.constraint.kind=invariant.evidence

the term evidence behind `define.constraint.kind=invariant`: where the word comes from, why it beat its rivals, and the precedent that backs it. a zoom of that brief; the definition itself lives there.

## .etymology

latin *in-* ("not") + *variare* ("to change"): that which does not change. mathematics took the word first. sylvester coined it in 1851 for quantities of an algebraic form unchanged under a transformation: "as I propose henceforth to call them, the two Invariants" (*philosophical magazine*, 4th ser., 2, 391–410; quoted via miller, *earliest known uses of some of the words of mathematics* 🟡).

computer science took the same sense and pointed it at a program: a relation that the execution of a step does not destroy. dijkstra asked that no loop be written "without stating the relation whose invariance will not be destroyed by the execution of the repeatable statement" (*the humble programmer*, EWD 340, 1972 ✅).

our sense widens the step from one loop body to every operation the system admits: a statement about the domain that no write may break.

## .evidence

### the sort test

one question sorts each constraint into its kind (`define.constraint._`):

| who keeps it | where it holds | kind |
|---|---|---|
| we do | every scenario a reader can observe | **invariant** |
| the world does | the edge with a system we do not own | assumption |
| we do, for consumers | a release boundary | guarantee |

### precedent

| precedent | the sense it fixes | citation |
|---|---|---|
| floyd's assertions on flowcharts | a claim attached to a program point, true each time control passes it | floyd 1967 |
| hoare's loop invariant | true before and after each run of the loop body | hoare 1969 |
| dijkstra's relation whose invariance survives the step | the loop invariant as a duty of the author | dijkstra 1972 |
| meyer's class invariant | true of every object of a class between calls | meyer 1992 |
| codd's keys and constraints | rules every relation must satisfy | codd 1970 |

each citation, with its doi: `ref.invariant.history`.

## .rejected alternatives

| term | why rejected |
|---|---|
| constraint | the generic over all three kinds; an invariant is one of them |
| rule | overloaded with every brief (`rule.forbid.*`, `rule.require.*`) |
| business rule | spans all three kinds, and carries the `rule` overload |
| requirement | collides with product requirements and behavior criteria |
| property | the formal-methods word, but it reads as an object field in code |
| axiom | names a claim taken without proof — closer to an assumption |
| predicate | the logical form of the claim, not the commitment to keep it |
| guard · validation | each names one enforcement, not the claim it enforces |

## .invariants of the term

- an invariant names a domain fact, in domain words; it never names its enforcement
- it holds in every scenario a reader can observe; a claim that holds "usually" is not an invariant
- we keep it, inside our system; a claim the world keeps is an assumption

## .see also

- `define.constraint.kind=invariant` — the definition this zoom backs
- `define.constraint._` — the generic, and the kind × grain dimensions
- `ref.invariant.history` — every citation above, in full
