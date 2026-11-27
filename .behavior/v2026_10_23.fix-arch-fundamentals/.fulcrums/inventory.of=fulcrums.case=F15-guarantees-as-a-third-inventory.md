# F15 — guarantees as a third inventory, beside invariants and assumptions

- **the fork**: (a) itemize invariants and assumptions only, with guarantees as a field inside each entry · (b) itemize all three — invariants, guarantees, assumptions — each disjoint by one test · (c) one `inventory.of=guarantees` with `kind=invariant|transition|liveness`, which replaces `inventory.of=invariants`
- **taken**: (b), proposed. the sort test:
  - holds in every state a reader can observe → **invariant**
  - describes what an operation or boundary does, or eventually does, given its assumptions → **guarantee** (a transition: idempotency, a one-way status edge; a liveness promise: every queued task eventually runs; an implementation contract that a lower layer offers to the layer above)
  - kept by the world, beyond our enforcement → **assumption**
- **why at the time**:
  - some promises are not state predicates. idempotency, at-least-once delivery, and "eventually runs" never fit "holds in every state" (lamport 1977 and alpern & schneider 1985 separate safety from liveness — `ref.invariant.history`)
  - the wisher's own derivation step names guarantees as an input: deduce a new invariant from "the extant invariants and guarantees and assumptions"
  - the assume → guarantee chain (abadi & lamport 1993/1995; benveniste 2018) composes by guarantees: one component's guarantees discharge the next one's assumptions (I05)
  - the implementation contracts the wisher named (code that a chosen implementation requires, below the domain invariants) are guarantees of that implementation; their tests prove them
- **rework**: clean — no consumer cites the inventory layout yet. (c) would rename every `inventory.of=invariants` path in four templates and the howto
- **confidence**: 70% — (b) adds an inventory and a sort test a writer can misapply; (a) is smaller but leaves transition and liveness promises with no home
- **where**: I25 (`howto.inventory-constraints._` and its templates), I27, I05
- **verdict**: **ruled by the wisher (chat, 2026-11-23)** — three peers, named in the singular: `inventory.of=invariant`, `inventory.of=assumption`, `inventory.of=guarantee`. no `kind=` dimension. guarantees are itemized **only at external contracts**: internal contracts are mutable, so they carry no backcompat promise. an external guarantee is what a consumer cites as an assumption in its own invariant chain. external = a release boundary. each entry is declarative and independent of the implementation; an enforcement lives in code, and is cited, where at all, in a suffix zoom-in (`.enforcement=$slug`; renamed from `.enforcer=` and `.guardian=`, F20). seeds: `seeds/inventory.of=seeds.for=inventory-layout.md`
