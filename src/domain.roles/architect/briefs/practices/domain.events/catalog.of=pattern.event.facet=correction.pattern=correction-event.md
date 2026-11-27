# catalog.of=pattern.event.facet=correction.pattern=correction-event

a member of `catalog.of=pattern.event._` · facet `correction` · verdict `require` · tier `root` · rule `rule.require.correction-events`.

## .keeps

when the world moves on past a fact, a new fact answers it — an apology, never an edit. each peer reacts to it on its own guarded edge.

## .require when

the fact was true, and the world changed after it: a charge later refunded, a confirmed lesson rebooked, a reserved board found broken. when our report was wrong and the world did not change, publish a corrected version instead (`pattern=corrected-version`).

## .the move

1. **publish the answer as its own fact.** `PaymentRefundedEvent` answers `PaymentCapturedEvent`; `LessonRebookedEvent` answers `LessonConfirmedEvent`. it names the fact it answers, by ref
2. **never touch the original.** the stream keeps both; the history reads true
3. **each peer reacts forward.** the reservation moves `CONFIRMED → CANCELED` by its own guarded edge (`pattern=guarded-status-transitions`); the receipt service sends a refund receipt. no stored value is rolled back
4. **an answer no software can make is a task for a human.** the fact enqueues the work; the human's act publishes its own fact

## .the failure it prevents

a peer that acted on a fact which later vanished; a history that disagrees with the receipts already sent; a "fix" that rewrites the past and breaks every reader of it.

## .source

### converge

> "However the whole point of the event log is that we never delete an event. So what we can do is insert a rejection event to the log" — fowler, "retroactive event", 2005 ✅

> "Although the source data can never change, it may be that the system needs to handle a change - typically because the original event was incorrect. You can handle this by receiving this change as a separate Retroactive Event." — fowler, "domain event", 2005 ✅

### contrast

fowler's retroactive event rewinds the log to rebuild what should have been, and merges the difference (`pattern=retroactive-replay`, forbid). ours is the apology of helland & campbell 2009 and step 5 of the saga cure (`rule.forbid.sagas`): a forward business act, with no replay at all.
