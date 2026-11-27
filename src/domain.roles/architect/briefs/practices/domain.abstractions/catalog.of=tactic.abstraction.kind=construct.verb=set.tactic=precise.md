# catalog.of=tactic.abstraction.kind=construct.verb=set.tactic=precise

a member of `catalog.of=tactic.abstraction._`. kind `construct`: it shapes what a value can be.

## .the move

choose types so an illegal value cannot be built. whole classes of check vanish; the compiler holds the invariant. the cheapest enforcement there is (`define.constraint.grain=enforcement`, rung 1).

the bound: only for a **stable** fact the type owns. never a type per value of a derived or time-varied fact.

## .why

> "Make illegal states unrepresentable" — minsky 2011 ✅

## .in our tools

- `IsoPrice`, `IsoTimeStamp` vs a bare number or string
- discriminated unions, branded types, `never` exhaustiveness

## .the failure it prevents

a record of optional fields plus a status enum, with combinations that must never occur and code that checks for them everywhere.

## .relations

- `rule.require.precise-constructs`, `rule.forbid.illegal-values-constructible` — the rules a reviewer loads for this tactic
- `tactic=standardize` — its use-half: the precise type is built once, where raw input enters
