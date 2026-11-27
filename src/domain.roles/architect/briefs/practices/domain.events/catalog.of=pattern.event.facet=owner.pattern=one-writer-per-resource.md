# catalog.of=pattern.event.facet=owner.pattern=one-writer-per-resource

a member of `catalog.of=pattern.event._` · facet `owner` · verdict `require` · tier `root` · rule `rule.require.one-writer-per-resource` · forbid twin `rule.forbid.multiple-writers-per-resource`.

## .keeps

one owner writes each resource; every peer that keeps a copy keeps it read-only, fed only by the owner's facts.

## .require when

two parts of the domain both need a resource: the invoice service and the lesson service both read the surfer's consent; only one may change it.

## .the move

1. **name the owner.** each resource has one writer — the bound whose storage holds it. the invariants of the resource live there (`define.constraint.kind=invariant`)
2. **copies are read-only.** a peer may keep the fields it acts on, but never writes them. its copy changes only when the owner's fact arrives (`pattern=idempotent-consumer`, `pattern=guarded-status-transitions`)
3. **the owner writes by its own decision.** a peer never asks the owner to change the resource; it publishes its own fact, and the owner's policy decides (`pattern=consumer-decides`, `rule.forbid.command-messages`)

## .the failure it prevents

two writers that each believe their copy; an invariant split across two services that neither can keep; a copy that drifts from its source because a peer wrote it.

## .source

### converge

> "You can still control changes to the data to ensure there's only one source for each bit of data. However instead of doing this by saying only one component stores data, you do it by allowing one component to post update events about that bit of data." — fowler, "event collaboration", 2006 ✅

> "It doesn't update its own data directly, instead it waits for the appropriate event to come through the stream from the source application. This ensures that multiple posters show the same data" — fowler, "event poster", 2005 ✅

the same law as step 6 of the saga cure (`rule.forbid.sagas`): one owner per resource.
