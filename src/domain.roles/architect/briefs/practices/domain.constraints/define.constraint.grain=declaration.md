# define.constraint.grain=declaration

## .what

a **declaration** = the statement of a constraint: what must be true, with its baseline and boundary cases, in domain words. one of the two grains of every constraint (`define.constraint._`); its peer is the enforcement (`define.constraint.grain=enforcement`).

| grain | says | who owns it | where it lives | changes when |
|---|---|---|---|---|
| **declaration** | what must always be true, with its baseline and boundary cases | the architect declares it | the inventory entry, in domain words | the domain changes |
| **enforcement** | what holds it true | the implementer, trusted to enforce it | the code | the implementation changes |

a declaration never names its enforcement. the declaration is stable across rewrites; the enforcement is the code of the day. a declaration that names its enforcement goes stale on the next rewrite.

a declaration holds no review status either. whether its cases were checked, and by whom, is a fact of the route that authored it, in that route's fulcrums. a status line in the entry goes stale once the fulcrum is ruled.

per kind, the declaration says:

| kind | the declaration says |
|---|---|
| invariant | the claim, its baseline, its boundary cases (`define.constraint.kind=invariant`) |
| assumption | the claim, its evidence, the required response on a break (`define.constraint.kind=assumption`) |
| guarantee | the promise, the exclusions, the acceptance test that proves it (`define.constraint.kind=guarantee`) |

usage: *"where is this declared?"* · *"the declaration names a type; strip it to the domain claim"* · *"a declaration with no enforcement is a wish"*.

## .see also

- `define.constraint._` — the generic, and the kind × grain dimensions
- `define.constraint.grain=enforcement` — the peer grain
- `howto.itemize-constraints._` — where each declaration is written
- `define.constraint.grain=declaration.evidence` — the term's etymology, precedent, and rejected alternatives
