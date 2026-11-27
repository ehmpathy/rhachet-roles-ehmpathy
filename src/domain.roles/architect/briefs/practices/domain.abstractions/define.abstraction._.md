# define.abstraction._

the root of the abstraction terms: the generic, its kinds, and a zoom per kind.

```
define.abstraction._.md               # this root
define.abstraction.kind=$kind.md      # contract · construct
```

## .what

an **abstraction** = a name for **what** a concept means, over a hidden **how**, so the caller reasons at the new level and need not look below (`philosophy.abstraction-creates-precision`).

two kinds, by what the name stands for:

| kind | stands for | the caller leans on | our main instance |
|---|---|---|---|
| **contract** | a behavior | what a call promises: its inputs, its result, its errors | a domain operation's signature (`define.abstraction.kind=contract`) |
| **construct** | a value | what a value can be: its shape, its legal values, its operations | a domain object, an iso type (`define.abstraction.kind=construct`) |

the two kinds are **disjoint** — each abstraction stands for a behavior or a value, never both — and **exhaustive**: a name that stands for neither hides no how, and is no abstraction. they compose without overlap: a contract takes and returns constructs; a construct's operations are contracts of their own (`IsoPrice` is a construct; `priceSum` is a contract over it).

usage: *"is this a contract or a construct?"* · *"which decision does this abstraction hide?"* · *"the caller reached past the contract"*.

## .the tactics

how to make one, and how to use one, per kind: `catalog.of=tactic.abstraction._`.

## .evidence

### precedent

| precedent | the split it names | citation |
|---|---|---|
| sicp's first two chapters | "Building Abstractions with Procedures" · "Building Abstractions with Data" | abelson & sussman 1985 ✅ |
| liskov and guttag | procedural abstraction · data abstraction | liskov & guttag 1986 🟡 |

✅ = chapter titles read from the publisher's full text. 🟡 = the terms as recalled; the book's contents wait on a fetch.

## .rejected alternatives

| term | why rejected |
|---|---|
| module | the canon's word, but no unit in our code bears it: we hold operations, daos, communicators, domain objects |
| interface | collides with the typescript `interface` |
| component | overloaded with ui components |

## .invariants of the term

- every abstraction is exactly one kind: a contract or a construct
- an abstraction hides at least one decision; one that hides naught is a pass-through, and adds no level

## .see also

- `philosophy.abstraction-creates-precision` — why an abstraction pays
- `define.abstraction.kind=contract` · `define.abstraction.kind=construct` — the two kinds
- `catalog.of=tactic.abstraction._` — the tactics
- `define.constraint.grain=enforcement` — an abstraction as rung 2 of the ladder
