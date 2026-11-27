# rule.require.latest-version-wins

## .what

every consumer applies each fact by its unique key and `observedAt`, keeps the newest, and skips the older. its records come out the same for every order the facts arrive in.

## .the smell

```ts
// 👎 last write by arrival — an older report that lands second wins
await context.daoLessonCopy.upsert({ lesson: fact.lesson, status: fact.status, price: fact.price });
```

delivery is at least once and in no promised order: a retry, a second partition, a replay, or a late publisher reorders the stream. this consumer is correct only on a quiet day.

the tells:

- an upsert from a fact with no version guard
- a status copied from the fact with no guarded edge
- a handler that drops a fact, or throws, when the fact it expects first is absent

## .the cure

1. **key on the fact, version on `observedAt`** — the unique key names which fact; `observedAt` names which version of the report (`rule.require.two-time-points`)
2. **apply only a newer version** — an upsert guarded on `observedAt`: a newer version overwrites; an older or equal one is a no-op (`pattern=idempotent-consumer`, `pattern=optimistic-lock`)
3. **move a status only by a guarded edge** — a late `LessonConfirmedEvent` after `LessonCanceledEvent` cannot move the lesson back (`pattern=guarded-status-transitions`)
4. **let a fact that needs another wait** — an async task re-checks for it (`pattern=async-task`), or the fact carries what its reaction needs (`rule.require.self-contained-facts`). never drop it, never assume the other came first
5. **prove it** — a test delivers one set of facts shuffled, reversed, and repeated, and asserts the same records each time

> "An out-of-order event is one that's received late, sufficiently late that you've already processed events that should have been processed after the out-of-order event was received." — fowler, "retroactive event", 2005 ✅

where we part: fowler puts the late fact back in its place and replays what followed (`rule.forbid.retroactive-replay`). ours makes the place irrelevant: the consumer reads no order into arrival, so a late fact needs no rewind.

## .enforcement

- a consumer that copies or overwrites a value from a fact with no version guard = **blocker** — a late or older report overwrites a newer one, with no error. a guarded status edge (cure 3) or a keyed append (`pattern=idempotent-consumer`) satisfies it as well as a version guard: each makes the result the same for every arrival order
- a consumer with no test that delivers its facts out of order = **nitpick**

a consumer that copies no value from the fact — it only reacts (sends an email once per fact key, enqueues a task) — owes no version guard; it owes an idempotent effect instead (`rule.require.idempotent-consumers`).

## .see also

- `catalog.of=pattern.event.facet=order.pattern=latest-version-wins` — the full member, with its sources
- `rule.forbid.order-dependent-consumers` — the forbid twin
- `rule.require.two-time-points` — the `observedAt` this rule versions by
- `rule.require.corrected-versions` — the newer version a consumer keeps
