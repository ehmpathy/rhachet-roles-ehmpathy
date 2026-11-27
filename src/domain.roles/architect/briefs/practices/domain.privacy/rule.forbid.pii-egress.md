# rule.forbid.pii-egress

## .what

pii flows one way: in. a surfer's birth date, address, name, email, phone, or gov id may enter our system and land in the storage that must keep it. it never flows back out raw — not into the domain, a log, an event, an error, a snapshot, a response, or a third party.

the one exception: a **quarantined, authorized path with a named business need** (`rule.require.pii-quarantine`).

## .the smell

```ts
// 👎 raw pii egresses the storage: into the domain, then into a log
const surfer = await daoSurfer.getOne({ by: { unique: { email } } });
if (getAge(surfer.birthDate) < 18) ...
log.info('reservation.set', { surfer });
```

the tells:
- a pii field on a domain object
- pii in a log, error, event, snapshot, or api response
- an operation that computes age or zone from a raw fact it should never have seen
- a dao read that returns raw pii to any caller who asks

## .the cure

1. **out as a concept** — the dao answers the concept the rule needs, never the raw fact: `daoSurfer.getConsentRequired({ surfer, on })` → `SELF` · `PARENT`
2. **out raw only through the quarantine** — where the business truly needs the raw value (email the parent the waiver link), one quarantined path reads it, checks authorization, logs the access without the value, and hands it straight to its one destination

## .enforcement

- raw pii on a domain object, event, error, or api response = **blocker**
- raw pii in a log or test snapshot = **blocker**
- a raw pii read outside the quarantine, or with no named business need = **blocker**

## .see also

- `rule.require.pii-quarantine` — the require twin: how the quarantine works
- `rule.forbid.real-identities-in-fixtures` (mechanic) — the same concern, for test data
