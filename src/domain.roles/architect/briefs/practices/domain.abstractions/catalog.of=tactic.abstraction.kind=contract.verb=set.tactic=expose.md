# catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=expose

a member of `catalog.of=tactic.abstraction._`. kind `contract`: it shapes what a caller may reach past.

## .the move

the default is no escape. each escape adds rope a caller can hang itself with, and a contract the team must keep. ship one only when it is justified, and only for a true primitive.

**justified** — a real caller the composite cannot serve, who would otherwise rebuild a low primitive from a high one (abstraction inversion). an escape for a caller who might someday want one is not justified.

**a true primitive** — both safe and stable:

- **safe** — it keeps its own invariants alone: a write still converges on retry, still takes the one write path. the composite stays the easy, default path (`tactic=absorb`), so the pit of success holds
- **stable** — you would keep it as its own declared contract. every exposed primitive gets depended on (`tactic=narrow`), so an unstable part exposed is an internal frozen in place

a part that fails either test stays hidden, justified or not.

when an escape is justified, the best one is decomposition: the composite is built from named primitives, and a caller it does not fit composes its own from the same pieces, rather than rebuild them (`philosophy.domain-as-a-garden`: decompose for recomposition).

## .why

> "All non-trivial abstractions, to some degree, are leaky." — spolsky 2002, *the law of leaky abstractions* ✅

abstraction inversion: callers "re-implement the required functions in terms of the interface, which in its turn uses the internal implementation of the same functions" (wikipedia, *abstraction inversion* 🟡). no primary source fixes the term's origin; the article traces it to critiques of the ada rendezvous.

## .in our tools

- `syncCustomerFromStripe` composes `sdkStripe.getCustomer`, `asCustomer`, and `daoCustomer.upsert`; each is its own operation, so a caller who needs only the cast calls `asCustomer`
- declastruct exposes `get*`, `set*`, and `as*` apart; each is idempotent alone, so the pieces stay as safe as the whole
- the raw client, only as a last resort, for the rare case no primitive covers
- a communicator documents what of the vendor's behavior it does not hide (rate limits, eventual reads)

## .the failure it prevents

- a leaky abstraction: the caller must know the layer below to use it right
- an inverted one: callers re-implement a lower primitive on top of a higher one, because no way past the surface exists

## .the failure it risks

- rope: an escape shipped with no justification, which callers reach for in place of the safe composite
- a frozen internal: an unstable part exposed, now depended on and no longer free to change

## .relations

- `rule.require.safe-escape-primitives`, `rule.forbid.leaky-abstractions` — the rules a reviewer loads for this tactic
- `tactic=narrow` — the tension: each exposed primitive gets depended on (hyrum's law), so it is a contract to keep, never a free window into the internals. a part you would not keep as its own declared contract stays hidden
- `tactic=absorb` — the composite this escape bounds: it stays the default path
