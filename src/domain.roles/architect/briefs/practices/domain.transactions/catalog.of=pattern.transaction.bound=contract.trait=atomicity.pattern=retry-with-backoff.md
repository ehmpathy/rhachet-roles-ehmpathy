# catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=retry-with-backoff

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `atomicity` · verdict `require` · tier `root`.

## .keeps

a transient fault across a contract retries until done, bounded; it never storms.

## .the move

retry only what is safe to retry — an idempotent call (`pattern=idempotency-key`, `pattern=idempotent-consumer`). wait longer before each attempt, with random jitter, so a crowd of callers spreads out. cap the attempts; on the cap, fail loud and leave the task `FAILED` for a later retrigger (`pattern=async-task`), never swallow it.

## .in our tools

the queue's redelivery and the task's retrigger carry most retries; an in-process retry wraps only the external call, never the whole operation. a wait is a duration (`IsoDuration`), never a bare ms count (`rule.forbid.any-time`, mechanic); a retry never assumes the fault clears in a fixed time (`rule.forbid.time-assumptions`, mechanic).

## .the failure it prevents

a blip at stripe fails a reservation for good; or every caller retries at once and keeps the blip alive.

## .source

> "The problem also stands out: there are still clusters of calls." … "The solution isn't to remove backoff. It's to add jitter." — brooker 2015, "exponential backoff and jitter", aws architecture blog, https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ ✅

## .see also

- `rule.require.retry-with-backoff` — the rule that enforces this member
