# rule.require.read-your-writes

## .what

a caller sees its own write, never an older copy. after a write, route that caller's reads to the primary for a window, or return the written record from the write itself so the caller need not re-read.

## .when

a leaf rule: it binds a repo whose reads go to a replica or to an eventually consistent index. a repo that reads and writes one primary meets it for free, and owes naught.

## .the smell

```ts
// 👎 the write lands on the primary; the next read asks a replica that lags
await daoLessonReservation.set({ reservation }, context);
const reservations = await daoLessonReservation.getAll({ by: { surferUuid } }, contextReplica);
```

the tells:

- a write, then a read of the same record through a replica or a search index
- a reload that shows the record absent for a moment after its create
- a sleep before a read "so the replica catches up"

## .the cure

- return the written record from the write, and use it
- or route the caller's reads to the primary for a window after its write
- across a contract, wait for the fact to land; never trust a copy kept across a contract (`rule.require.async-tasks`)

> "Read your writes … requires that if a process performs a write w, and that same process performs a subsequent read r, then r must observe w's effects." — jepsen, "read your writes" ✅

## .enforcement

- in a repo that reads from a replica or an index: a caller that re-reads its own write from it = **blocker**. harm: a surfer reserves a lesson, reloads, and sees no reservation — then reserves again
- in a repo that reads one primary: not applicable

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=read-your-writes` — the member, in full
- `rule.forbid.time-assumptions` (mechanic) — why a sleep is no cure
