# catalog.of=pattern.event.facet=payload.pattern=thin-notification

a member of `catalog.of=pattern.event._` · facet `payload` · verdict **`forbid`**.

fowler's name is "event notification". ours names the defect: the message is too thin to act on.

## .what it is

a message that carries an id and a link back, not the fact. the peer learns that aught changed, then calls the sender to learn what.

## .why it is forbidden

- **the callback reads now, not then** — between the fact and the call, the record may move on. a peer that reacts to `PaymentRefundedEvent` reads the payment after a second refund, and acts on the wrong amount
- **the sender serves every peer** — each fact costs it one read per listener, and its outage stalls every reaction
- **the reaction is no longer deterministic** — replay the same fact tomorrow, get a different answer
- **the stream stops to be evidence** — a message with no fact in it proves naught of what happened; the stream cannot be trusted as a data product

## .not an exception — pii

a peer that would need raw pii to react never calls back for it. the pii stays with its owner, and the owner acts: the peer publishes its own fact, and the owner of the pii reacts through its quarantine (`rule.require.pii-quarantine`) — the waiver service emails the parent; the lesson service never reads the address. the fact carries a ref or a concept (`consentRequired: 'PARENT'`), never the raw value and never a link to fetch it.

## .not an exception — size

a payload too large for the channel rides as a ref to an immutable copy of that version — a content-addressed blob written with the fact — never to the live record.

## .the cure

carry the fact whole, as of the moment it happened (`pattern=self-contained-fact`).

## .source

> "An event need not carry much data on it, often just some id information and a link back to the sender that can be queried for more information. The receiver knows something has changed, may get some minimal information on the nature of the change, but then issues a request back to the sender to decide what to do next." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

### contrast

fowler grades it "nice because it implies a low level of coupling, and is pretty simple to set up". we grade it by the read it forces: a callback that races the record it reads, against a sender that must serve every peer.
