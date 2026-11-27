# define.constraint.grain=declaration.evidence

the term evidence behind `define.constraint.grain=declaration`: where the word comes from, why it beat its rivals, and the precedent that backs it. a zoom of that brief; the definition itself lives there.

## .etymology

latin *declarare*, "to make clear" (*de-* + *clarare*, from *clarus*, "clear"). a declaration makes a claim plain for every reader, without a word on how it is met. the law pairs the two grains: a statute declares; its enforcement holds people to it.

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| grain | declaration · enforcement |
| what it names | the domain claim · the mechanism |
| who reads it | domain expert and implementer · implementer |
| changes with | the domain · the implementation |

forbidden cell: a declaration that names its mechanism. it has crossed into the enforcement grain, and the next rewrite makes it false.

### precedent

| precedent | the split it names | citation |
|---|---|---|
| hoare's assertions | a program is checked against assertions written apart from it | hoare 1969 |
| parnas's hidden decision | what a part promises, apart from the decision it hides | parnas 1972 |
| meyer's design by contract | the contract declares; the routine body discharges it | meyer 1992 |

each citation, with its doi: `ref.invariant.history`.

## .rejected alternatives

| term | why rejected |
|---|---|
| definition | collides with every `define.*` brief |
| specification | names a whole document, not one claim; reads as a product spec |
| requirement | collides with product requirements and behavior criteria |
| assertion | names the check that enforces an assumption — the other grain |
| statement | too general: any sentence is a statement |
| contract | the container that holds many declarations |

## .invariants of the term

- every constraint has exactly one declaration, in an inventory entry
- a declaration speaks in domain words, and never names its enforcement
- a declaration holds no review status; its route's fulcrums do
- a declaration with no enforcement is a wish; each route's review checks one exists

## .see also

- `define.constraint.grain=declaration` — the definition this zoom backs
- `define.constraint._` — the generic, and the kind × grain dimensions
- `ref.invariant.history` — every citation above, in full
