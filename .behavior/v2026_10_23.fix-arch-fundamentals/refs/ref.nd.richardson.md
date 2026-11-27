# ref.nd.richardson

grade: ✅ — the author's own pattern pages (microservices.io, © 2026 chris richardson)
cite: Chris Richardson. microservices.io pattern pages: "Pattern: Idempotent Consumer"; "Pattern: Saga"; "Pattern: Transactional outbox". the pages name his book *Microservices Patterns* as the longer treatment.
seen: `.raw/page.richardson-idempotent-consumer.json` · `.raw/page.richardson-saga.json` · `.raw/page.richardson-transactional-outbox.json` — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "a consumer must be idempotent: the outcome of processing the same message repeatedly must be the same as processing the message once." … "Make a consumer idempotent by having it record the IDs of processed messages in the database." (idempotent consumer)

> "A saga is a reliably coordinated sequence of local transactions." … "Orchestration - an orchestrator (object) tells the participants what local transactions to execute" … "a developer must design compensating transactions that explicitly undo changes made earlier in a saga" (saga)

> "The solution is for the service that sends the message to first store the message in the database as part of the transaction that updates the business entities. A separate process then sends the messages to the message broker." … "Messages are guaranteed to be sent if and only if the database transaction commits" (transactional outbox)

## .supports

- `catalog.of=pattern.transaction`: idempotent-consumer · transactional-outbox (converge) · saga (contrast — the member forbids what the page recommends)
