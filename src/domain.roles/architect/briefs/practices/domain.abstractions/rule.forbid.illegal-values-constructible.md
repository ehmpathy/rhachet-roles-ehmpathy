# rule.forbid.illegal-values-constructible

## .what

never shape a stable domain fact so an illegal value can be built. a record of optional fields plus a status enum admits combinations that must never occur, and every reader must check for them.

> "Make illegal states unrepresentable" — minsky 2011 ✅

## .the smell

```ts
// 👎 a canceled lesson with no reason, a confirmed one with no time: both compile
interface SurfLesson {
  status: 'QUEUED' | 'CONFIRMED' | 'CANCELED';
  confirmedAt?: string;
  canceledAt?: string;
  reason?: string;
}
// so each reader checks: if (lesson.status === 'CANCELED' && !lesson.reason) throw ...
```

the tells:

- optional fields whose presence depends on a status field
- the same combination check in two or more readers
- a bare `number` or `string` for a price, a time, an id

## .the cure

make the illegal value unbuildable (`rule.require.precise-constructs`):

| move | holds because |
|---|---|
| a discriminated union per status (`{ status: 'CANCELED'; canceledAt; reason }`) | the illegal combination does not compile |
| a glossary type in place of a bare primitive (`IsoPrice`, `IsoTimeStamp`) | a malformed value cannot reach the domain |
| `never` exhaustiveness over the union | a new case forgotten in a branch does not compile |

the bound holds here too: a derived or time-varied fact (a surfer's age) stays a computed read, never a type per value.

## .enforcement

- a stable fact shaped so an illegal combination compiles, with a runtime check that guards it = **blocker** (harm: the path that skips the check builds the illegal record, and it ships)
- optional fields that could be a union, with no illegal combination reachable today = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=construct.verb=set.tactic=precise` — the full tactic, with the sources
- `rule.require.precise-constructs` — the require twin
- `rule.forbid.scattered-invariant-guards` — the check this cure removes, when it sits in one caller
- `rule.forbid.any-price`, `rule.forbid.any-time` (mechanic) — the glossary types
