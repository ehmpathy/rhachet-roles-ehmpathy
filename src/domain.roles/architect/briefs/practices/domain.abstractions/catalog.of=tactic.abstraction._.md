# catalog.of=tactic.abstraction._

the tactics that make an abstraction pay: a name for **what** over a hidden **how**, so the caller reasons at the new level and never looks below (`define.abstraction._`, `philosophy.abstraction-creates-precision`).

an abstraction serves three ends: change stays local, the reader carries less, and a constraint gets one home (`define.constraint.grain=enforcement`, rung 2).

```
catalog.of=tactic.abstraction._.md                                   # this root
catalog.of=tactic.abstraction.kind=$kind.verb=$verb.tactic=$tactic.md  # one member per tactic
rule.require.$move.md                                                # the move, as a rule a reviewer loads
rule.forbid.$failure.md                                              # the failure it prevents, as a rule
```

a reviewer loads only `rule.*` files, so each tactic's move and failure each have a rule, here or in the role that already owns it.

## .the dimensions — kind × verb

- **kind** — which abstraction the tactic shapes: `contract` (`define.abstraction.kind=contract`), `construct` (`define.abstraction.kind=construct`), or `_`, a tactic that shapes either
- **verb** — what the tactic does with it: `set` shapes one, new or extant; `use` calls through one

| kind \ verb | set (shape one) | use (call through one) |
|---|---|---|
| `_` | `separate` · `gather` | `barrier` |
| `contract` | `absorb` · `expose` · `narrow` · `decorate` · `idempotent` | via `_` (`barrier`) |
| `construct` | `precise` | `standardize` |

a `_` tactic applies to both kinds, so the `_` line fills each cell beneath it. `contract × use` has no tactic of its own: `barrier` covers it.

the dimensions pass three tests:

- **disjoint** — each tactic sits in one cell; a `_` tactic is never repeated under a specific kind
- **exhaustive** — every kind has a tactic for each verb, direct or via `_`
- **independent** — either kind can be made or used, so neither axis limits the other

## .the root claim

> "Gather together the things that change for the same reasons. Separate those things that change for different reasons." — martin 2014, *the single responsibility principle*, the clean code blog ✅

martin ties the principle to "Parnas' formulation" (parnas 1972, `tactic=separate`).

the two generic `set` tactics are its two halves: `separate` and `gather`. every other member applies them to one kind.

## .the members

| kind | verb | tactic | the move, in one line | the failure it prevents | source |
|---|---|---|---|---|---|
| `_` | `set` | `separate` | give each decision likely to change one home; cut by decision, not by step order | shotgun edits; temporal decomposition | parnas 1972 |
| `_` | `set` | `gather` | what must change together sits under one root | an invariant with no home | evans 2003, via fowler |
| `_` | `use` | `barrier` | call through the abstraction, never past it | callers reach into fields or around the write path | sicp 1985, §2.1.2; liskov & zilles 1974 |
| `contract` | `set` | `absorb` | absorb a decision inside; a small promise over a large capability | knobs a caller cannot set well; shallow contracts; pass-through layers | ousterhout 2018, pp. 23, 46, 55 |
| `contract` | `set` | `expose` | no escape by default; expose a primitive only when justified, and only a safe and stable one | leaky or inverted abstractions | spolsky 2002 |
| `contract` | `set` | `narrow` | expose only what you will keep | implicit contracts | hyrum's law |
| `contract` | `set` | `decorate` | one concern per operation; add each cross-cut concern from outside, never woven in | complected operations | hickey 2011 |
| `contract` | `set` | `idempotent` | a benign case is a defined result; a break is refused loud | try/catch at every caller; a real error defined away | ousterhout 2018, p. 79 |
| `construct` | `set` | `precise` | an illegal value cannot be built, for a stable fact | combinations checked everywhere | minsky 2011 |
| `construct` | `use` | `standardize` | raw input becomes the precise construct once, where it enters | scattered parse | king 2019 |

## .the rules each member applies

a member names the move as an abstraction tactic; a rule enforces each pole, and each cites the other. a pole an extant rule already owns stays with its owner:

| tactic | require rule | forbid rule |
|---|---|---|
| `separate` | `rule.require.decision-decomposition` | `rule.forbid.temporal-decomposition` |
| `gather` | `rule.require.aggregate-roots` | `rule.forbid.scattered-invariant-guards` (domain.constraints) |
| `barrier` | `rule.require.compose-additively` (domain.constraints) | `rule.forbid.multiplicative-composition` (domain.constraints) |
| `absorb` | `rule.require.deep-contracts` | `rule.forbid.shallow-contracts` |
| `expose` | `rule.require.safe-escape-primitives` | `rule.forbid.leaky-abstractions` |
| `narrow` | `rule.require.narrow-contracts` | `rule.forbid.implicit-contracts` |
| `decorate` | `rule.require.single-responsibility`, `rule.require.hook-wrapper-pattern` (mechanic) | `rule.forbid.complected-operations` |
| `idempotent` | `rule.require.idempotent-operations`, `rule.require.fewer-paths-via-idempotency` (domain.operations); `rule.require.failfast` (mechanic) | `rule.forbid.nonidempotent-mutations`, `rule.forbid.failhide` (mechanic) |
| `precise` | `rule.require.precise-constructs` | `rule.forbid.illegal-values-constructible` |
| `standardize` | `rule.require.parse-at-the-boundary` | `rule.forbid.scattered-parse` |

one claim stays out: *declare what holds before, after, and always* is a constraint, not an abstraction tactic. `define.constraint._` and its kinds own it.

## .by smell

the same set, indexed by what a reviewer sees first:

| the smell | reach for |
|---|---|
| one change edits many files | `separate` |
| many writers each guard one rule | `gather` |
| a caller reads a field or writes around the one write path | `barrier` |
| the surface is as large as what it hides; a layer forwards and adds no word | `absorb` |
| callers lean on an undeclared order, latency, or field | `narrow` |
| a caller must know the layer below, or rebuilds it | `expose` |
| one body holds a log trail, a retry, and the real work | `decorate` |
| every caller wraps a call in try/catch for a case that means "already done" | `idempotent` |
| the same check repeats deep in the stack | `standardize`, `precise` |
| callers fight it with flags and special cases | the abstraction is wrong: inline it into each caller, cut, re-derive (`rule.prefer.wet-over-dry`, mechanic) |

## .the tools we already hold

each ehmpathy abstraction practices several tactics at once:

| ours | tactics |
|---|---|
| domain objects (`DomainEntity`, `DomainLiteral`, `DomainEvent`) | `barrier` · `gather` |
| refs (`RefByUnique`, `RefByPrimary`) | `barrier` · `narrow` |
| the grains: transformer · communicator · orchestrator | `separate` · `absorb` |
| iso glossaries (`iso-price`, `iso-time`) | `barrier` · `precise` · `standardize` |
| declastruct | `separate` · `absorb` · `expose` · `idempotent` |
| layers: `access` → `domain.*` → `contract` | `separate` · `absorb` |
| daos (`getOne`, `findsert`, `upsert`) | `separate` · `barrier` · `standardize` · `idempotent` |
| `with*` decorators (`withLogTrail`, `withMutexLock`) | `decorate` |

## .the tensions across the set

- **dry vs wet** — collapse duplicate knowledge at once; wait for three uses before you collapse duplicate text (`rule.prefer.wet-over-dry`, mechanic)
- **small functions vs deep contracts** — a unit reads top-down at one level (`rule.require.orchestrators-as-narrative`); a contract still hides a large capability. small units compose into deep contracts
- **absorb vs expose** — `absorb` hides the decision from the common caller; `expose` exposes a primitive only for a caller who justifies it. the composite stays the default path
- **narrow vs expose** — `narrow` exposes only what you will keep; `expose` exposes more, and every exposed primitive gets depended on (hyrum's law). each escape is a new contract to keep, never a free window into the internals. so `narrow` wins by default: no escape. an escape ships only when justified (a real caller the composite cannot serve), and only for a true primitive, both safe (it holds its invariants alone) and stable (you would keep it as its own declared contract)

## .see also

- `define.abstraction._` — the kinds this catalog sorts by
- `philosophy.abstraction-creates-precision` — what an abstraction is, and why precision
- `define.constraint.grain=enforcement` — abstraction as rung 2 of the ladder
- `catalog.of=pattern.transaction._` — the aggregate as the transaction boundary
