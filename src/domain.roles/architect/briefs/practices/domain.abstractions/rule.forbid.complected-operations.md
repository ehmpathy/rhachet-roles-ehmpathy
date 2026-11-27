# rule.forbid.complected-operations

## .what

never weave a cross-cut concern — a log trail, a retry, a lock, a cache — into an operation's body. a complected operation makes each change read concerns that never needed to meet.

> "'Complect' means to interleave, to entwine, to braid. Complect results in bad software." — hickey 2011 ✅

## .the smell

```ts
// 👎 the retry, the lock, and the log trail braided through the core job
export const setLessonReservation = async (input: { reservation: LessonReservation }, context: Context) => {
  context.log.info('setLessonReservation.input', input);
  for (let attempt = 0; attempt < 3; attempt++) {
    const lock = await context.lock.acquire(`lesson:${input.reservation.lessonUuid}`);
    try {
      const result = await context.daoLessonReservation.set(input, context);
      context.log.info('setLessonReservation.output', result);
      return result;
    } finally {
      await lock.release();
    }
  }
};
```

the tells:

- a loop, a lock, or a log call that wraps the core job inside the body
- the same cross-cut concern hand-written in two or more operations
- a change to the retry policy edits a domain operation

## .the cure

one concern per operation; each cross-cut concern from outside:

| move | holds because |
|---|---|
| a decorator per concern (`withLogTrail`, `withMutexLock`, `withRetry`) | each concern reads as its one job, and changes in one place |
| the core declared bare, then wrapped at export (`rule.require.hook-wrapper-pattern`, mechanic) | the core reads as its one job |
| tools arrive via context, never built inside (`rule.require.dependency-injection`, mechanic) | the core never knows which lock or log it runs under |

## .enforcement

- a cross-cut concern woven into an operation's body where a decorator exists or would serve = **blocker** (harm: a hand-woven retry or lock diverges from its siblings — one retries a non-idempotent write, one never releases — and the defect ships in that operation alone)
- a single log line inline, with no retry, lock, or cache woven in = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=decorate` — the full tactic, with the sources
- `rule.require.single-responsibility` (mechanic) — the require twin: one concern per operation
- `rule.require.hook-wrapper-pattern` (mechanic) — the decorator shape in our code
- `rule.forbid.temporal-decomposition` — the peer at the grain of a module
