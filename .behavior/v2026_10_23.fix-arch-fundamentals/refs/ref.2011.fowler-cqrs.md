# ref.2011.fowler-cqrs

grade: ✅ — the author's own page
cite: Martin Fowler (14 July 2011). "CQRS" (bliki). martinfowler.com. https://martinfowler.com/bliki/CQRS.html
seen: `.raw/page.fowler-cqrs.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-tag-event-architectures.json`

## .quotes

> "At its heart is the notion that you can use a different model to update information than the model you use to read information. For some situations, this separation can be valuable, but beware that for most systems CQRS adds risky complexity."

> "In particular CQRS should only be used on specific portions of a system (a BoundedContext in DDD lingo) and not the system as a whole."

> "Using CQRS on a domain that doesn't match it will add complexity, thus reducing productivity and increasing risk."

> "If your domain isn't suited to CQRS, but you have demanding queries that add complexity or performance problems, remember that you can still use a ReportingDatabase."

> "Having separate models raises questions about how hard to keep those models consistent, which raises the likelihood of using eventual consistency."

## .supports

- `pattern=cqrs` (forbid) — "for most systems CQRS adds risky complexity"; the cure he names is ours: one schema for live writes and reads, an analytical copy for the heavy reads (`rule.forbid.analytical-scans-on-live-storage`)
