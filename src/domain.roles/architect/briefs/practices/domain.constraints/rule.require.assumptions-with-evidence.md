# rule.require.assumptions-with-evidence

## .what

every condition a system's correctness rests on is one of two kinds:

| kind | who makes it true | what we hold | how we enforce it |
|---|---|---|---|
| **invariant** | us — we own the data | the declaration | keep it true: refuse the break (`define.constraint.kind=invariant`) |
| **assumption** | the world, a third party, a clock, an upstream | the declaration, plus **evidence** for it | assert we are not mistaken: detect the break and fail fast |

a **precondition** sits between: an assumption made a contract term, with the caller as its owner.

name each assumption, and hold for it:

1. **the claim** — one line: what we take the world to keep true
2. **about** — whom it rests on
3. **evidence**, and its strength, weakest first: belief · their contract (docs, sla, schema) · an upstream guarantee (another repo's `g$nnn`, across a release boundary) · a test against the real dependency · runtime monitor · a real-world check (an id at the counter, a parent's signature)
4. **blast radius** — what breaks, for whom, if it fails
5. **on break** — each way the claim could break, and its required response: **absorbed** (no effect, by a named invariant) or **surfaced** (within a bound, fail fast)
6. **review by** — an `IsoDateStamp`; evidence ages, and the claim may stop to hold

## .the enforcement of an assumption

we cannot make the world keep an assumption. we enforce it by assertion: we refuse to proceed on a false premise. each break gets a required response: a second delivery has no effect; an absent one surfaces within a day; a malformed response is refused. the entry declares that response as a requirement — declarative, stable across rewrites. the enforcement that meets it (a dedupe, a reconcile, a parse) is code: the route review checks it, and an optional `.enforcement=$slug` zoom-in may cite it (`howto.itemize-constraints._`).

## .the moves, best first

1. **convert** — parse at the boundary; inside, the shape is an invariant we enforce ("parse, don't validate", king 2019)
2. **cap** — where it cannot convert, build so a break is benign: an idempotent consumer makes "at least once" safe; a reconcile job makes "eventually" safe
3. **assert** — build a reactive enforcement (runtime or monitor) for each break that remains; a break no one sees is a silent defect
4. **evidence** — what remains is kept as a stated assumption with its evidence

## .example

| id | claim | about | evidence | blast radius | on break |
|---|---|---|---|---|---|
| a001 | a surfer's stated birth date is true | the surfer | belief + a parent's signature at the counter | a minor paddles out with no waiver | a mismatch at check-in is surfaced before the surfer paddles out |
| a002 | stripe delivers each webhook at least once | stripe | their docs; a test against stripe test mode | a missed or doubled charge record | a doubled event is absorbed (one payment per charge); a missed event is surfaced within a day |

## .precedent

rely/guarantee (jones, 1983) and assume/guarantee (misra & chandy, 1981): a component declares what it **relies on** from its environment and what it **guarantees** back. our assumptions are the rely half. the guarantee half is our invariants inside a release, and our itemized guarantees at each release boundary — which a consumer, in turn, cites as its own assumptions (`ref.invariant.history`).

## .enforcement

- an assumption with no evidence or no blast radius stated = **blocker**
- a break with no required response, and no stated reason it cannot be seen = **blocker**
- an entry that names its mechanism (a job, a table, a dao) in place of a required response = **nitpick**
- an assumption that a parse at the boundary could convert, left unconverted = **nitpick**
- an assumption past its review-by date = **nitpick**

## .see also

- `catalog.of=tactic.constraint.kind=assumption.grain=declaration.tactic=attest` · `catalog.of=tactic.constraint.kind=assumption.grain=enforcement.tactic=assert` — the members, in full: the entry, then the check at the edge
- `rule.forbid.implicit-assumptions` — the forbid twin, booted as say
- `howto.itemize-constraints._` — where they live; `.template=assumption` — the entry form
- `rule.forbid.time-assumptions` (mechanic) — one class of assumption, on clocks
- `rule.require.trust-but-verify` (mechanic) — the same discipline, for inherited claims
