# rule.forbid.multiple-writers-per-resource

## .what

never let two services write one resource. a resource has one owner; every other copy is read-only, fed by the owner's facts.

## .the smell

```ts
// 👎 in the lesson service — reserves a board on the board service's table
await context.daoBoardReservation.upsert({ board, lesson, status: 'RESERVED' });

// 👎 in the board service — releases the same record on its own repair flow
await context.daoBoardReservation.upsert({ board, lesson: null, status: 'RELEASED' });
```

the board's invariant — one lesson per board per slot — now lives in two services, and neither holds it. a race between the two writes lands with no error.

the tells:

- daos in two services that write one table
- one database shared across bounds for writes
- a sync job that writes back into the source it copies from
- a copy patched by hand when it drifts from the owner

## .the cure

1. **name one owner** — the bound whose storage holds the resource; its invariants live there (`rule.require.one-writer-per-resource`)
2. **a peer publishes, the owner decides** — the lesson service publishes `LessonBookedEvent`; the board service's policy reserves a board and publishes `BoardReservedEvent` (`rule.require.consumer-decides`)
3. **copies are read-only** — fed only by the owner's facts, applied by unique key and `observedAt` (`rule.require.latest-version-wins`)
4. **move the shared table behind the owner's contract** — peers read through it, and no peer dao can write it

## .enforcement

- a resource written by two services = **blocker** — each trusts its own write, and the invariant that spans both is kept by neither
- a peer copy written by aught other than the owner's facts = **blocker** — the copy drifts from its source with no error

## .see also

- `rule.require.one-writer-per-resource` — the require twin
- `catalog.of=pattern.event.facet=owner.pattern=one-writer-per-resource` — the full member, with its sources
- `rule.forbid.command-messages` — the order a second writer often sends in place of a write
- `rule.forbid.multiplicative-composition` — the same reach past an owner, inside one service
