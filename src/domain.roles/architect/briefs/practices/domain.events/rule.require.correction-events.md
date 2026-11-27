# rule.require.correction-events

## .what

when the world moves on past a fact, a new fact answers it — an apology, never an edit. each peer reacts to the answer on its own guarded edge.

when our report was wrong and the world did not change, publish a corrected version instead (`rule.require.corrected-versions`).

## .the smell

```ts
// 👎 a refund "undoes" the capture: it deletes the fact that peers acted on
await context.daoOutbox.del({ event: captured });

// 👎 and a peer rolls its own value back
await context.daoLessonReceipt.del({ payment: captured.payment });
```

the receipt the surfer already holds now disagrees with every record the system keeps.

the tells:

- a fact deleted or rewritten because a later act reversed it
- a peer that rolls a stored value back, in place of a forward move
- an undo that no fact records

## .the cure

1. **publish the answer as its own fact** — `PaymentRefundedEvent` answers `PaymentCapturedEvent`; `LessonRebookedEvent` answers `LessonConfirmedEvent`. it names the fact it answers, by ref
2. **never touch the original** — the stream keeps both; the history reads true
3. **each peer reacts forward** — the reservation moves `CONFIRMED → CANCELED` by its own guarded edge (`pattern=guarded-status-transitions`); the receipt service sends a refund receipt. no stored value rolls back
4. **an answer no software can make is a task for a human** — the fact enqueues the work; the human's act publishes its own fact

> "However the whole point of the event log is that we never delete an event. So what we can do is insert a rejection event to the log" — fowler, "retroactive event", 2005 ✅

## .enforcement

- a fact deleted or rewritten because the world moved on = **blocker** — a peer acted on a fact that vanished, and the history disagrees with receipts already sent
- a peer that rolls a stored value back in place of a forward move = **blocker** — every reader of the old value now reads a past that never happened
- an answer that names no ref to the fact it answers = **nitpick**

## .see also

- `catalog.of=pattern.event.facet=correction.pattern=correction-event` — the full member, with its sources
- `rule.forbid.retroactive-replay` — the forbid twin: a rewind to where the fact should have landed
- `rule.require.corrected-versions` — the other correction, when our report was wrong
- `rule.forbid.sagas` — the apology, step 5 of the saga cure
