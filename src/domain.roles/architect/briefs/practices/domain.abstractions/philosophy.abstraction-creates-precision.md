# philosophy.abstraction-creates-precision

## .what

an abstraction is a name for **what** a concept means, over a hidden **how**, so the caller reasons at the new level and need not look below.

> the purpose of abstracting is _not_ to be vague, but to create a new semantic level in which one can be absolutely precise.
> — dijkstra, *the humble programmer* (EWD 340, 1972) ✅

the sources converge on it:

- access without the detail that would make access harder (wikipedia, *abstraction (computer science)*) ✅
- a named unit, used with no knowledge of its implementation (abelson & sussman, *sicp* 1.1) ✅
- a barrier between how data is used and how it is represented (*sicp* 2.1.2) ✅
- a type known by its behavior, not its shape (liskov & zilles, 1974) ✅
- a part that hides one design decision from all others (parnas, 1972) ✅

## .why precision, not vagueness

a vague name hides what it promises: `processData` could do any of a dozen acts, so the caller must read its body. a precise abstraction declares its promise: `asIsoPrice` returns exact money or fails. the caller reasons on the promise and never looks below. that is what lets a large system stay understandable: each new level is checked once, then trusted.

## .an abstraction is where an invariant lives

each precise abstraction carries an invariant, and enforces it on every caller:

| abstraction | invariant it enforces |
|---|---|
| `IsoPrice` + `price*` ops | money is exact; never a float, never raw `+` |
| a `DomainEntity` | it is known by its unique key |
| a dao | writes converge on retry; the storage shape does not cross into the domain |
| `LessonReservation` | every lesson reservation carries the consent its surfer requires |

name the abstraction and you name the enforcement. leak through it — reach into its fields, bypass its one write path — and the invariant has none.

## .the test

can the caller use it correctly from its name and its contract alone? yes → a precise abstraction. no → it is vague, or it leaks.

## .see also

- `define.constraint.kind=invariant` — what an abstraction enforces
- `catalog.of=tactic.abstraction._` — the tactics, ours first
- `rule.prefer.wet-over-dry` (mechanic) — when to abstract at all
