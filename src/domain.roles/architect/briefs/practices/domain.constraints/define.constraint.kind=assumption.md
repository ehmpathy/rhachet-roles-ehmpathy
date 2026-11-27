# define.constraint.kind=assumption

## .what

an **assumption** = a constraint the world keeps, beyond our enforcement: a fact about a system we do not own that our invariants lean on. one of three constraints (`define.constraint._`).

an assumption entry holds three parts:

| part | says | example |
|---|---|---|
| the claim | what we take as true, in domain words | the payment provider's webhook arrives at least once per charge |
| the evidence | why we believe it: a doc, a published guarantee, a measurement | the provider's docs, with a fetched citation; or an upstream `g001` |
| the required response | what we do when it breaks | assert at the edge; fail fast on the break; page the owner |

we cannot make an assumption true. so we enforce it by **assertion**: detect the break at the edge, and refuse to proceed on a false premise (`define.constraint.grain=enforcement`, the assumption line).

usage: *"which assumption does this invariant lean on?"* · *"what is the evidence for this assumption?"* · *"an upstream guarantee is our assumption"*.

## .see also

- `define.constraint._` — the generic over the three peers
- `define.constraint.kind=guarantee` — the upstream half of the chain
- `rule.forbid.implicit-assumptions` · `rule.require.assumptions-with-evidence` — the rule pair
- `define.constraint.kind=assumption.evidence` — the term's etymology, precedent, and rejected alternatives
