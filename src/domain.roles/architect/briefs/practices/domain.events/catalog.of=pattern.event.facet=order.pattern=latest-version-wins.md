# catalog.of=pattern.event.facet=order.pattern=latest-version-wins

a member of `catalog.of=pattern.event._` · facet `order` · verdict `require` · tier `root` · rule `rule.require.latest-version-wins`.

## .keeps

a consumer's records come out the same for every order the facts arrive in. it applies each fact by unique key and version, keeps the newest, and skips the older.

## .require when

every consumer. delivery is at least once and in no promised order: a retry, a second partition, a replay, or a peer that publishes late each reorders the stream.

## .the move

1. **key on the fact, version on `observedAt`.** the unique key names which fact; `observedAt` names which version of the report — when the system learned it (`pattern=corrected-version`)
2. **apply only a newer version.** an upsert guarded on `observedAt`: a newer version overwrites; an older or equal one is a no-op (`pattern=idempotent-consumer`, `pattern=optimistic-lock`)
3. **a status moves only by a guarded edge.** a late `LessonConfirmedEvent` after `LessonCanceledEvent` cannot move the lesson back (`pattern=guarded-status-transitions`)
4. **a fact that needs one not yet seen waits.** an async task re-checks for it (`pattern=async-task`), or the fact carries what its reaction needs (`pattern=self-contained-fact`). never throw it away, never assume the other came first
5. **prove it.** a test delivers one set of facts shuffled, reversed, and repeated, and asserts the same records each time

## .the failure it prevents

a lesson un-canceled by a late confirm; a corrected amount overwritten by the older report that arrived second; a consumer that drops a fact because its predecessor was late.

## .source

### converge — the case

> "An out-of-order event is one that's received late, sufficiently late that you've already processed events that should have been processed after the out-of-order event was received." — fowler, "retroactive event", 2005 ✅

### contrast — the cure

> "For out-of-order events we insert and process the retroactive event at the branch point." — same ✅

fowler puts the late fact back in its place and replays what followed (`pattern=retroactive-replay`, forbid). ours makes the place irrelevant: the consumer reads no order into arrival, so a late fact needs no rewind.
