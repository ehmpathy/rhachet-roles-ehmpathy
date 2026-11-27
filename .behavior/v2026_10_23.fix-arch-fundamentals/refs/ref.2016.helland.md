# ref.2016.helland

grade: ✅ — metadata from crossref; quotes from the publisher page (acm queue, full text html)
cite: Pat Helland (2016). "Life Beyond Distributed Transactions: An apostate's opinion." *Queue* 14(5), 69–98. doi:10.1145/3012426.3025012. (a revision of the 2007 cidr paper; the article says "10 years after this paper was first written")
seen: `.raw/helland2016.crossref.json` · `.raw/page.helland2016-life-beyond.json` (final url `queue.acm.org/doi/10.1145/3012426.3025012`) — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "To ensure idempotence (i.e., guarantee that the processing of retried messages is harmless), the recipient entity is typically designed to remember that the message has been processed."

> "Each entity has a unique identifier or key … Somehow, it must uniquely identify exactly one entity and the data it contains."

> "Guarantees of transactional atomicity come only within an entity identified by a unique key."

## .supports

- `catalog.of=pattern.transaction`: idempotent-consumer · supplied-exid · operation-per-transaction (the entity as the transaction scope) · two-phase-commit (converge: atomicity holds only within one entity)
