# rule.forbid.order-dependent-consumers

## .what

never let a consumer's result depend on the order its facts arrive in. always expect facts out of order, late, and twice. a consumer applies each fact by unique key and version, keeps the newest, and moves each status only by a guarded edge.

## .why

- **no order is promised** — a retry, a second partition, a replay, or a late publisher reorders the stream. a first-in-first-out queue orders one channel, never the facts of two services
- **it is correct only by luck** — the defect waits for the first busy day, then corrupts records with no error
- **it forces a rewind** — a consumer that needs order can only be cured by a replay that puts late facts back in place (`rule.forbid.retroactive-replay`)

## .the smell

- last write wins by arrival: an upsert with no version guard
- a status copied from the fact (`lesson.status = fact.status`) with no guarded edge
- a handler that throws, or drops the fact, when the fact it expects first is absent
- correctness that rests on a first-in-first-out queue, a single partition, or a sequence number across streams

## .the cure

1. **key on the fact, version on `observedAt`** — apply only a newer version; an older or equal one is a no-op (`pattern=latest-version-wins`, `pattern=idempotent-consumer`)
2. **move each status by a guarded edge** — a late `LessonConfirmedEvent` cannot un-cancel a lesson (`pattern=guarded-status-transitions`)
3. **let a fact that needs another wait for it** — an async task re-checks (`pattern=async-task`), or the fact carries what it needs (`pattern=self-contained-fact`)
4. **prove it** — a test delivers one set of facts shuffled, reversed, and repeated, and asserts the same records each time

## .enforcement

- a consumer whose records differ by the order of arrival = **blocker**
- an upsert from a fact with no version guard = **blocker**
- a consumer with no test that delivers its facts out of order = **nitpick**

## .see also

- `rule.require.latest-version-wins` — the require twin
- `catalog.of=pattern.event._` — `pattern=order-dependent-consumer` (forbid), `pattern=latest-version-wins` (the cure)
- `catalog.of=pattern.transaction._` — `pattern=guarded-status-transitions`, `pattern=idempotent-consumer`
