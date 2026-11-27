# catalog.of=pattern.event.facet=payload.pattern=self-contained-fact

a member of `catalog.of=pattern.event._` · facet `payload` · verdict `require` · tier `root` · rule `rule.require.self-contained-facts`.

fowler's name for the full-payload pattern is "event-carried state transfer". ours names what the payload is: the fact itself, whole.

## .keeps

a fact carries the data its reaction needs, as of the moment it happened; a peer reacts with no call back to the sender.

## .require when

a peer reacts to a fact: sends a receipt on `PaymentRefundedEvent`, frees a slot on `LessonCanceledEvent`.

## .the move

1. **carry what the fact is about.** the refs and the values of the moment: `{ payment: { ref }, amount: 'USD 50.37', refundedAt }` — what was true when it happened, not a pointer to what is true now
2. **carry only that.** the fact, not the whole resource. a peer that needs more reads it from the owner's contract, by the version the fact names
3. **never raw pii.** a fact is an egress. carry a ref or a concept — `consentRequired: 'PARENT'`, never a birth date (`rule.forbid.pii-egress`)
4. **declare its shape as a contract.** peers parse it at the boundary; a change to its shape is a contract change, versioned as one

## .the failure it prevents

a peer that reacts to a refund with the amount as it reads later, after a second refund; a sender that serves a read per peer per fact; a birth date copied into every listener's log.

## .source

### converge

> "A recipient can then update it's own copy of customer data with the changes, so that it never needs to talk to the main customer system in order to do its work in the future." … "What we gain is greater resilience, since the recipient systems can function if the customer system is becomes unavailable." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

### contrast — the cost he names

> "A component may continue operating, but it will be working on out of date information if it's not receiving events as things change." — fowler, "event collaboration", 2006 ✅

where we part: fowler's pattern copies the whole customer into every peer. we carry the fact, not the customer, so the copy a peer keeps is only what it acts on, and pii never leaves the owner.
