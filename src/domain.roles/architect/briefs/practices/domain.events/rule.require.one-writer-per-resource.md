# rule.require.one-writer-per-resource

## .what

one owner writes each resource. every peer that keeps a copy keeps it read-only, fed only by the owner's facts.

## .the smell

```ts
// 👎 in the invoice service — writes the surfer consent that the waiver service owns
await context.daoSurferConsent.upsert({ surfer, consent: 'PARENT' });
```

the tells:

- a dao in one service that writes a table another service owns
- a peer copy changed by aught other than the owner's facts
- a peer that "fixes" its copy by hand when it drifts

## .the cure

1. **name the owner** — each resource has one writer: the bound whose storage holds it. the invariants of the resource live there (`define.constraint.kind=invariant`)
2. **copies are read-only** — a peer may keep the fields it acts on, but never writes them. its copy changes only when the owner's fact arrives (`rule.require.latest-version-wins`, `pattern=idempotent-consumer`, `pattern=guarded-status-transitions`)
3. **the owner writes by its own decision** — a peer never asks the owner to change the resource; it publishes its own fact, and the owner's policy decides (`rule.require.consumer-decides`)

> "You can still control changes to the data to ensure there's only one source for each bit of data. However instead of doing this by saying only one component stores data, you do it by allowing one component to post update events about that bit of data." — fowler, "event collaboration", 2006 ✅

## .enforcement

- a resource with no single named writer = **blocker** — two writers each trust their own copy, and the invariant splits across services that neither can keep
- a peer copy written by aught other than the owner's facts = **blocker** — the copy drifts from its source with no error

## .see also

- `catalog.of=pattern.event.facet=owner.pattern=one-writer-per-resource` — the full member, with its sources
- `rule.forbid.multiple-writers-per-resource` — the forbid twin: two services that write one resource
- `rule.require.consumer-decides` — a peer publishes; the owner decides
- `rule.forbid.sagas` — one owner per resource, step 6 of the saga cure
