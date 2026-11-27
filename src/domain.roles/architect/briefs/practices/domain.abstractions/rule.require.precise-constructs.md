# rule.require.precise-constructs

## .what

choose types so an illegal value cannot be built. whole classes of check vanish; the compiler holds the invariant. the cheapest enforcement there is (`define.constraint.grain=enforcement`, rung 1).

> "Make illegal states unrepresentable" — minsky 2011 ✅

the bound: only for a **stable** fact the type owns. never a type per value of a derived or time-varied fact.

## .how

1. name the combinations that must never occur
2. give each legal case its own shape: a discriminated union, a branded type, a closed enum
3. let `never` exhaustiveness catch a case a new branch forgot
4. stop at stable facts: a lesson's status set is stable; a surfer's age is derived, and stays a computed read

```ts
// 👍 each legal case is its own shape; a canceled lesson with no reason cannot be built
type SurfLessonStatus =
  | { status: 'QUEUED' }
  | { status: 'CONFIRMED'; confirmedAt: IsoTimeStamp }
  | { status: 'CANCELED'; canceledAt: IsoTimeStamp; reason: string };
```

## .in our tools

- `IsoPrice`, `IsoTimeStamp` in place of a bare number or string
- discriminated unions, branded types, `never` exhaustiveness

## .enforcement

- a domain fact whose illegal combinations a closed type could exclude, left as optional fields plus a status, with a check that guards it in code = **blocker** (harm: the one path that skips the check builds the illegal record, and it ships)
- a precise type that fits a stable fact but is absent, where no illegal combination is reachable today = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=construct.verb=set.tactic=precise` — the full tactic, with the sources
- `rule.forbid.illegal-values-constructible` — the forbid twin
- `rule.require.parse-at-the-boundary` — the use-half: the precise type is built once, where raw input enters
- `rule.forbid.any-price`, `rule.forbid.any-time` (mechanic) — two precise types the glossaries already own
