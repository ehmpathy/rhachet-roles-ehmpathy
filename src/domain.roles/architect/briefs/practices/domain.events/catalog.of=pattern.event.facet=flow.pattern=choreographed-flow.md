# catalog.of=pattern.event.facet=flow.pattern=choreographed-flow

a member of `catalog.of=pattern.event._` · facet `flow` · verdict **`forbid`**.

## .what it is

a business flow of many steps that lives only as a cascade of reactions: service a reacts to fact x and emits y, service b reacts to y and emits z. no one place holds the flow; each step sees only its own link.

## .why it is an antipattern

- **the flow is visible in no program text** — to learn it, one must trace every listener across every repo, or watch production
- **each link is sane; the chain is not** — two sensible reactions compose into a wrong outcome no author of either foresaw
- **a change breaks it silently** — a new field on a fact, a new reaction, and a step downstream misfires with no error
- **no one decides once every light is green** — the irreversible act fires on whichever fact arrives, not on the full set

## .the smell

- an outcome that depends on the order of facts from different services
- a question "what happens after x?" that needs a search across repos to answer
- a service that emits a fact only so another can react and emit the next

## .the test

does the correctness of a business outcome depend on the chain? yes → it is a flow, and it needs one owner. no — a receipt email on `PaymentRefundedEvent`, a cache warm on `LessonConfirmedEvent` — it is an independent reaction, and free to listen.

## .the cure

one async task owns the outcome, in the bound that owns its decision (`pattern=async-task`). it waits on the facts it needs — from its own tasks and from its peers — decides once every light is green, and publishes the fact. peers react to that fact, each by its own policy (`pattern=consumer-decides`). the task orders no one: a peer's act is the peer's call (`rule.forbid.command-messages`).

## .source

### converge

> "It can become problematic, however, if there really is a logical flow that runs over various event notifications. The problem is that it can be hard to see such a flow as it's not explicit in any program text. Often the only way to figure out this flow is from monitoring a live system." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

> "Event cascades are good because something happens and as a result of a string of local logical event connections something indirect happens. Event cascades are bad because something happens and as a result of a string of local logical event connections something indirect happens." — fowler, "event collaboration", 2006 ✅

his worked case: a contra-indication postpones an operation; a second reaction releases its room; a clinician clears the patient minutes later, and the room is already rebooked. two sane reactions, one wrong outcome.
