# rule.require.idempotency-keys

## .what

every retried external call that charges, sends, or emits carries an idempotency key. mint the key for the act before the first attempt, persist it with the intent, and send the same key on every retry. the key names the act, so it is stable.

## .the smell

```ts
// 👎 no key: a timeout after the charge succeeds, a retry, a second charge
const charge = await sdkStripe.charges.create({ amount, customer });

// 👎 a fresh key per attempt: the retry looks like a new charge
const charge = await sdkStripe.charges.create({ amount, customer }, { idempotencyKey: uuid() });
```

the tells:

- an external create, charge, or send with no idempotency key
- a key minted inside the retry loop
- a key that is not persisted with the intent, so a retrigger cannot reuse it

## .the cure

- the key is a hash of the desired shape, or the async task's own unique key (`rule.require.async-tasks`)
- persist it with the intent, before the first attempt; send it on every retry
- where the receiver owns a natural key, supply the exid instead (`rule.require.supplied-exids`)

> "If the above Stripe request fails due to a network connection error, you can safely retry it with the same idempotency key, and the customer is charged only once." — stripe, "designing robust and predictable apis with idempotency" ✅

## .enforcement

- a retried external call that charges, sends, or emits, with no stable idempotency key = **blocker**. harm: a timeout after a charge succeeds, then a retry, then a second charge — monetary

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=idempotency.pattern=idempotency-key` — the member, in full
- `rule.require.idempotent-operations` — the contract this serves
- `rule.prefer.declastruct` (mechanic) — a hash of the desired shape as the key
- `rule.require.retry-with-backoff` — the retry this makes safe
