# rule.require.safe-escape-primitives

## .what

a contract ships no escape past itself by default. when an escape is justified, it exposes a true primitive: safe and stable. each escape is rope a caller can hang itself with, and a contract the team must keep.

> "All non-trivial abstractions, to some degree, are leaky." — spolsky 2002, *the law of leaky abstractions* ✅

## .how

ship an escape only when all three hold:

1. **justified** — a real caller the composite cannot serve, who would otherwise rebuild a low primitive from a high one. a caller who might someday want one is not a justification
2. **safe** — the primitive keeps its own invariants alone: a write still converges on retry and still takes the one write path. the composite stays the default path
3. **stable** — you would keep it as its own declared contract. every exposed primitive gets depended on

the best escape is decomposition: the composite is built from named primitives, and a caller it does not fit composes its own from the same pieces.

```ts
// 👍 the composite and its primitives, each its own idempotent operation
await syncCustomerFromStripe({ customerExid }, context); // the default path
const customer = asCustomer({ stripe: raw });            // the escape: one safe, stable primitive
```

## .enforcement

- an escape that exposes a part which breaks an invariant alone (a write that skips the one write path, a step that duplicates on retry) = **blocker** (harm: a caller takes the escape and ships a duplicate charge or an illegal record)
- an escape with no real caller to justify it, or an unstable internal exposed = **nitpick** (the cost is rope and a frozen internal, not yet a shipped defect)

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=expose` — the full tactic, with the sources
- `rule.forbid.leaky-abstractions` — the forbid twin: the leak and the inversion an escape prevents
- `rule.require.deep-contracts` — the composite this escape bounds
- `rule.require.narrow-contracts` — the tension: each exposed primitive becomes a contract to keep
- `philosophy.domain-as-a-garden` — decompose for recomposition
