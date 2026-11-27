# ref.2011.fowler-lmax

grade: ✅ — the author's own page
cite: Martin Fowler (12 July 2011). "The LMAX Architecture." martinfowler.com. https://martinfowler.com/articles/lmax.html
seen: `.raw/page.fowler-lmax.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-tag-event-architectures.json`

## .quotes

> "The system is built on the JVM platform and centers on a Business Logic Processor that can handle 6 million orders per second on a single thread. The Business Logic Processor runs entirely in-memory using event sourcing."

> "There is a considerable overlap here with the growing interest in CQRS. An event sourced, in-memory processor is a natural choice for the command-side of a CQRS system. (Although the LMAX team does not currently use CQRS.)"

## .supports

- `pattern=replay-on-read` (forbid) — the case where it earns its cost: one in-memory processor, one thread, a trade volume a database could not serve. a leaf case, far from our repo mix
