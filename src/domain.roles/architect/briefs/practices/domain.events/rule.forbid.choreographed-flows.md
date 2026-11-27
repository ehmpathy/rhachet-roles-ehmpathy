# rule.forbid.choreographed-flows

## .what

never let a business flow of many steps live only as a cascade of reactions — service a reacts to x and emits y, service b reacts to y and emits z. one async task owns each outcome whose correctness depends on the chain.

## .why

- **the flow is visible in no program text** — to learn it, one traces every listener across every repo, or watches production
- **each link is sane; the chain is not** — two sensible reactions compose into a wrong outcome no author of either foresaw
- **a change breaks it silently** — a new field, a new reaction, and a step downstream misfires with no error
- **no one decides once every light is green** — the irreversible act fires on whichever fact arrives first

## .not a choreographed flow

an independent reaction, whose outcome no flow depends on: a receipt email on `PaymentRefundedEvent`, a cache warm on `LessonConfirmedEvent`. each is free to listen.

## .the smell

- "what happens after x?" needs a search across repos to answer
- a service that emits a fact only so another can react and emit the next
- an irreversible act triggered by one fact of a set the outcome needs

## .the cure

one async task owns the outcome, in the bound that owns its decision (`pattern=async-task`). it waits on the facts it needs — from its own tasks and from its peers — decides once every light is green, and publishes its fact. peers react by their own policy (`pattern=consumer-decides`); the task orders no one (`rule.forbid.command-messages`).

## .enforcement

- a business outcome whose correctness rests on a cascade of reactions with no owner = **blocker**
- an irreversible act fired by a reaction rather than by the task that owns the outcome = **blocker**

## .see also

- `catalog.of=pattern.event._` — `pattern=choreographed-flow` (forbid)
- `rule.forbid.sagas` — the same cure, on the transaction side
