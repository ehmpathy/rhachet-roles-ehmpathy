# define.abstraction.kind=construct

## .what

a **construct** = an abstraction over a value: what a value can be — its shape, its legal values, its operations — over a hidden representation. one of two kinds (`define.abstraction._`).

| where we hold constructs | example |
|---|---|
| a domain object | `DomainEntity`, `DomainLiteral`, `DomainEvent` — built via the constructor, changed via `.clone()` |
| an iso glossary type | `IsoPrice`, `IsoTimeStamp`, with their `price*` and time ops |
| a ref | `RefByUnique`, `RefByPrimary` |
| a precise type | a closed union, a branded type |

a caller uses a construct through its operations and never through its representation (`catalog.of=tactic.abstraction.kind=_.verb=use.tactic=barrier`). a construct can make an illegal value unbuildable (`catalog.of=tactic.abstraction.kind=construct.verb=set.tactic=precise`).

usage: *"which construct holds this value?"* · *"the caller read the string inside `IsoPrice`"*.

## .collisions, settled

- **a language construct** (a loop, an `if`). a syntax element, not a value's abstraction. these briefs never use the word in that sense
- **a constructor**. the operation that builds a construct; part of it, not the construct

## .evidence

| precedent | the sense | citation |
|---|---|---|
| data abstraction | a type known by its operations, not its shape | liskov & zilles 1974 |
| the abstraction barrier | how data is used, kept apart from how it is represented | abelson & sussman 1985, 2.1 |

## .see also

- `define.abstraction._` — the generic
- `define.abstraction.kind=contract` — the peer kind
- `ref.package.domain-objects` (mechanic) — our main construct holders
- `rule.forbid.any-price` · `rule.forbid.any-time` (mechanic) — iso constructs over raw values
