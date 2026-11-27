# rule.require.retry-with-backoff

## .what

retry a transient fault across a contract until done, bounded. wait longer before each attempt, with random jitter, so a crowd of callers spreads out. cap the attempts; on the cap, fail loud.

## .the smell

```ts
// 👎 one blip at stripe fails the reservation for good
const charge = await sdkStripe.chargeCard({ surfer, price });

// 👎 or every caller retries at once, at a fixed interval, and keeps the blip alive
for (const attempt of [1, 2, 3, 4, 5]) {
  const charge = await sdkStripe.chargeCard({ surfer, price }).catch(() => null);
  if (charge) return charge;
  await sleep(1000);
}
```

the tells:

- an external call with no retry
- a retry with a fixed wait and no jitter, or no cap
- a retry of a call that is not idempotent
- a retry that swallows the last failure

## .the cure

- retry only what is safe to retry — an idempotent call (`rule.require.idempotency-keys`, `rule.require.idempotent-consumers`)
- wait longer before each attempt, with random jitter
- cap the attempts; on the cap, fail loud and leave the task `FAILED` for a later retrigger (`rule.require.async-tasks`); never swallow it
- the queue's redelivery and the task's retrigger carry most retries; an in-process retry wraps only the external call, never the whole operation
- a wait is an `IsoDuration`, never a bare ms count (`rule.forbid.any-time`, mechanic); a retry never assumes the fault clears in a fixed time (`rule.forbid.time-assumptions`, mechanic)

> "The problem also stands out: there are still clusters of calls." … "The solution isn't to remove backoff. It's to add jitter." — brooker 2015, "exponential backoff and jitter", aws architecture blog ✅

## .enforcement

- an external call across a contract with no bounded retry, in-process or by redelivery = **blocker**. harm: a transient blip fails a reservation for good
- a retry with no jitter or no cap, or a retry of a call that is not idempotent = **blocker**. harm: a retry storm that keeps the outage alive, or a second charge
- a retry that swallows its last failure = **blocker** (`rule.forbid.failhide`, mechanic)

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=retry-with-backoff` — the member, in full
- `rule.require.idempotency-keys` — what makes a retried call safe
