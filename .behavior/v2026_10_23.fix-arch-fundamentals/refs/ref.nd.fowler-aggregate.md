# ref.nd.fowler-aggregate

grade: ✅ — the author's own page (bliki, undated in the capture)
cite: Martin Fowler. "DDD_Aggregate" (bliki). martinfowler.com/bliki/DDD_Aggregate.html.
seen: `.raw/page.fowler-ddd-aggregate.json` — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Any references from outside the aggregate should only go to the aggregate root. The root can thus ensure the integrity of the aggregate as a whole. Aggregates are the basic element of transfer of data storage - you request to load or save whole aggregates. Transactions should not cross aggregate boundaries."

## .supports

- `catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=operation-per-transaction`
- the aggregate as named by evans 2003 (`ref.2003.evans`, 🟡) — this page is the fetched source the member cites in its place
