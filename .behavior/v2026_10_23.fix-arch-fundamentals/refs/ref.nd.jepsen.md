# ref.nd.jepsen

grade: ✅ — the publisher's own page (jepsen, llc)
cite: Jepsen. "Read Your Writes" (consistency models). jepsen.io/consistency/models/read-your-writes. the page cites viotti & vukolić for the formal definition.
seen: `.raw/page.jepsen-read-your-writes.json` — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Read your writes (also known as read my writes) requires that if a process performs a write w, and that same process performs a subsequent read r, then r must observe w's effects. Note that read your writes does not apply to operations performed by different processes."

## .supports

- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=read-your-writes`
