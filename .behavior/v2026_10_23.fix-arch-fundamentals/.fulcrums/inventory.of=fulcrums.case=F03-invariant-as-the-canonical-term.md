# F03 — "invariant" as the canonical term; "enforcer" for what holds one

- **the fork**: name the concept `invariant`, `relation`, `property`, or `constraint`; name what holds one `mechanism`, `keeper`, `guard`, or `enforcer`.
- **taken**: `invariant` = a statement about the domain that holds in every state a reader can observe. `relation` survives only as dijkstra's word in a quote. `property` is reserved for property-based tests; `constraint` is reserved for the store's constraints (T02, T03) and for `ConstraintError`. `enforcer` names what stops a violation: structural or proof.
- **why at the time**: "invariant" already carries weight in 12 briefs (`howto.dimensional-decomposition`, `rule.require.bounded-contexts`, `rule.require.failfast`, `rule.require.clear-contracts` …) and in the bhrain driver's `define.invariant.review.peer.*`. the wisher used the word (t04, t07, t21). one word per concept (`rule.require.ubiqlang`). the first draft took `mechanism`; the wisher ruled it too ambiguous, rejected `keeper`, and picked `enforcer` (seeds: `seeds/inventory.of=seeds.for=term-enforcer.md`).
- **rework**: clean now; dirty once the briefs ship and consumers cite them.
- **owed at execution**: `.agent/repo=.this/role=any/briefs/domain.terms/enforcement.md` — written, with etymology, a dimensional walk, precedent, and rejected names (enforcer and guardian among them). `invariant` itself is defined by `define.invariant` (I01).
- **confidence**: — (the term half ruled)
- **where**: I01, I02, I04
- **verdict**: **enforcer — ruled by the wisher (chat, 2026-10-25); superseded by guardian (F17), then by enforcement (F20, 2026-11-23)**. the reserve on `constraint` is reversed too: it is the generic over invariant, assumption, and guarantee (F18). "invariant" as the concept term stands, open
