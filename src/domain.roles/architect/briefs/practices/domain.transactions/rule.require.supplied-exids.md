# rule.require.supplied-exids

## .what

when a create crosses a contract, the caller supplies the exid — the id the entity carries in the world outside this storage — before it calls. the create becomes a findsert by that exid, so a retry lands on one record.

## .the smell

```ts
// 👎 the receiver mints the id: a timeout after a successful create, a retry, two records
const lesson = await svcLessons.createLesson({ surferUuid, slotUuid });
```

the tells:

- a create across a contract that returns the id it minted, with no id supplied
- a domain object with an `exid` but no `static unique = ['exid']`
- a dedupe step after a create

## .the cure

```ts
// 👍 the caller supplies the exid; the retry finds the first record
const lesson = await svcLessons.genLesson({ exid: reservation.exid, surferUuid, slotUuid });
```

- the exid is a unique key on the domain object (`static unique = ['exid']`), so the dao's findsert dedupes on it (`rule.require.unique-constraints-on-natural-keys`)
- where no natural exid exists, the caller mints one and keeps it across retries: then it is an idempotency key (`rule.require.idempotency-keys`)

> "Each entity has a unique identifier or key … Somehow, it must uniquely identify exactly one entity and the data it contains." — helland 2016, "life beyond distributed transactions", acm queue 14(5), doi:10.1145/3012426.3025012 ✅

## .enforcement

- a create across a contract with no caller-supplied exid or idempotency key = **blocker**. harm: a timeout after a successful create, then a retry, then two records for one lesson

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=idempotency.pattern=supplied-exid` — the member, in full
- `rule.require.idempotency-keys` — the move where no natural exid exists
- `rule.forbid.nonidempotent-mutations` (mechanic) — the verbs a create must avoid
