# ref.nd.jepsen-monotonic-writes

grade: ✅ — the publisher's own page (jepsen, llc)
cite: Jepsen. "Monotonic Writes" (consistency guarantees). jepsen.io/consistency/models/monotonic-writes. the page cites viotti & vukolić for the formal definition.
seen: `.raw/page.jepsen-monotonic-writes.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Monotonic writes ensures that if a process performs write w1, then w2, then all processes observe w1 before w2. Monotonic writes does not apply to operations performed by different processes, only writes by the same process."

## .supports

- `catalog.of=pattern.transaction._` — the `consistency` trait at the `contract` bound: order holds only within one process; messages from different senders carry no order, so a status needs its own forward-only guard
- `catalog.of=pattern.transaction.bound=contract.trait=consistency.pattern=guarded-status-transitions` — why the guard is owed: no delivery order spans two senders
