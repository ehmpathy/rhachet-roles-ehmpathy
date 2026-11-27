# catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=saga

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `atomicity` · verdict **`forbid`**.

## .what it is

a coordinator drives a change across contracts as a chain of local transactions. each step owns a compensation that undoes it; a failed step fires the compensations of the steps before it, in reverse. it fakes atomicity across contracts: the change ends whole, or undone.

## .why it is an antipattern

it breaks four laws at once:

- **idempotency** — a compensation reverses a step rather than converge to an end. a retry after a partial undo has no safe answer: redo the step, or undo the undo?
- **concern boundaries** — the coordinator commands inside every service. each service now answers to an outsider for its own data, and must expose an undo for each of its acts
- **consistency at rest** — between a step and its undo, persisted records hold a half-done change. readers see a charge with no board, and act on it
- **atomic facts** — it speaks in commands ("undo the charge") where a decomposed domain publishes facts (`PaymentRefundedEvent`) that each peer reacts to on its own terms

## .the tell — it ships its own countermeasures

the proponents document the defects and bolt on a patch for each:

- a "semantic lock" — a record that an update is in progress — for dirty reads (microsoft)
- "commutative updates" for lost updates (microsoft)
- "countermeasures" that "a saga developer must" add (richardson)

each patch admits a law the pattern breaks. a pattern that needs a catalog of patches to survive its own anomalies is the defect; ban it, and the anomalies never arise. the semantic lock, made the primary move rather than a patch, is the cure's `TENTATIVE` record.

## .the smell

- a coordinator with one undo handler per step
- an operation named `compensate*`, `rollback*`, or `undo*` that a remote caller invokes
- a step list with a reverse walk on failure
- a service api that exposes an undo for its own act so another service can call it

## .what the smell reveals

an invariant drawn across a contract. two services each hold half of one rule — "a charge exists only for a reserved board" — so neither can keep it alone, and a coordinator is hired to fake the transaction they cannot share. the boundary sits in the wrong place, or the contracts speak in commands where facts belong.

## .the cure

1. **redraw the bound** so the change that must land whole touches one storage, in one transaction
2. **orchestrate with an async task** (`pattern=async-task`) — it waits on its dependency tasks and on its peers' facts, and may be retriggered any number of times
3. **decide once every light is green** — the irreversible act runs only after every dependency has fulfilled
4. **publish atomic facts** — the decision commits with its fact (`pattern=transactional-outbox`); each peer reacts idempotently (`pattern=idempotent-consumer`, `pattern=guarded-status-transitions`)
5. **a reversal fixes forward — an apology, never a revert** — when the world forces a step back (a card declined, a board broken), the domain runs a new act with its own fact: `PaymentRefundedEvent`, a rebook, a credit, a task for a human. the stored values are never rolled back; each peer reacts on its own guarded edge

`rule.forbid.sagas` boots the ban.

## .source

where the canon stands, in its own words. the canon agrees on every cost we name; it splits only on the verdict.

### converge

- **helland 2007** — the cure, a decade early. no compensation of a committed step: a tentative operation the domain records, then confirms or cancels. "The uncertainty of the outcome is held in the business semantics rather than in the record lock. This is simply workflow." … "Every tentative operation eventually confirms or cancels." — "life beyond distributed transactions: an apostate's opinion", cidr 2007 ✅
- **helland & campbell 2009** — the reversal as an apology, a forward business act: "When a mistake is made … you apologize. Every business includes apologies. … these may be manual with the software enqueuing the problem for human work." — "building on quicksand", cidr 2009, arXiv:0909.1788 ✅
- **hohpe 2004** — compensation ranked "the last option", after write-off and "a retry with Idempotent Receiver"; his one example is a refund, a forward act. — "starbucks does not use two-phase commit" ✅ (partial: he keeps compensation as an option)

### contrast — the proponents, and what they concede

> "A saga is a reliably coordinated sequence of local transactions." … "a developer must design compensating transactions that explicitly undo changes made earlier in a saga" — richardson, microservices.io, "pattern: saga" ✅

> "Compensating transactions might not always succeed, which can leave the system in an inconsistent state." … "there's no built-in isolation across services. This setup can result in data inconsistencies or durability problems, such as partially applied updates" — microsoft, azure architecture center, "saga distributed transactions pattern" ✅

> "During these steps, the overall view of the system state might be inconsistent." … "You might think that you can simply restore the system to its original state, but this approach can overwrite changes from other concurrent application instances." — microsoft, azure architecture center, "compensating transaction pattern" ✅

each concession is one of our four laws: a compensation that may fail (idempotency), records inconsistent between steps (consistency at rest), and an undo that cannot restore the past, so it must be a new business act (the apology of step 5).

origin of the term: garcia-molina & salem 1987, "sagas", sigmod '87, 249–259, doi:10.1145/38713.38742 (title and metadata only)

## .see also

- `rule.forbid.sagas` — the rule: the ban, booted as say, with the cure
- `pattern=async-task` · `rule.require.async-tasks` — the cure, as a member and its rule
