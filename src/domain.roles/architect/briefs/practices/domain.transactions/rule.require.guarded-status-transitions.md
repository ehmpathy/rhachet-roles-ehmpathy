# rule.require.guarded-status-transitions

## .what

declare the legal edges of every status. a write moves the status only along one, and only from the status it read. a late or repeated message cannot move a status backward or twice, and no move skips a legal edge.

## .the smell

```ts
// 👎 a blind set: a late PaymentAuthorizedEvent moves a canceled reservation back to TENTATIVE
await daoLessonReservation.set({ reservation: { ...reservation, status: 'TENTATIVE' } }, context);
```

the tells:

- a status write with no check of the from-status it read, or no expected-version guard
- a status that more than one path can write
- an edge the domain forbids (`CANCELED → TENTATIVE`) that no write refuses

## .the cure

```ts
// 👍 check the from-status of the version read, then write under an expected-version guard
const reservationRead = await daoLessonReservation.getOne({ by: { unique: { uuid } } }, context);
if (reservationRead.status !== from) return { moved: false }; // a late message finds the status past its from: skip it
await daoLessonReservation.upsert(
  { reservation: { ...reservationRead, status: into }, expect: { versionHash: asVersionHash({ of: reservationRead }) } },
  context,
); // a racer that moved it first changed the version: the guard refuses; re-read, retry
```

- the edges are an inventory (`howto.itemize-constraints._`); each forbidden edge holds its invariant
- the guarded write is the one path that changes the status
- an async task's own lifecycle is the same pattern (`QUEUED → ATTEMPTED → FULFILLED · FAILED · CANCELED`, `rule.require.async-tasks`)

the write is an optimistic lock (`rule.require.optimistic-locks`): the from-status check reads the edge, and the database's expected-version guard refuses a racer. the version hash above is one example shape — the hash of the version's values, computed at read and again at write.

## .enforcement

- a status write with no guard on the status it moves from = **blocker**. harm: a late or repeated message moves a canceled reservation back to `TENTATIVE`, confirms a lesson twice, or refunds an uncharged order
- a status with no declared edges, where every write guards its from-status = **nitpick**. the harm grades elsewhere: an unguarded write (above), and a guard with no entry to cite (`rule.forbid.implicit-invariants`), each a blocker

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=consistency.pattern=guarded-status-transitions` — the member, in full
- `rule.forbid.order-dependent-consumers` — the antipattern this cures, for a consumer
- `rule.require.optimistic-locks` — the mechanism, and its source
