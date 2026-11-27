# ref.nd.azure-saga

grade: ✅ — the publisher's own page (microsoft, azure architecture center)
cite: Microsoft. "Saga distributed transactions pattern." *Azure Architecture Center*. https://learn.microsoft.com/en-us/azure/architecture/patterns/saga
seen: `.raw/page.azure-saga.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "If a step fails, a series of compensating transactions undoes the changes that the completed steps made."

> "Pivot transactions serve as the point of no return in"… (the capture window ends mid-sentence)

> "Limitations of compensating transactions: Compensating transactions might not always succeed, which can leave the system in an inconsistent state."

> "Because each service manages its own data, called participant data, there's no built-in isolation across services. This setup can result in data inconsistencies or durability problems, such as partially applied updates or conflicts between services. Typical problems include: Lost updates … Dirty reads: When a saga or transaction reads data that another saga has modified, but the modification isn't complete."

> "Semantic lock: Use application-level locks when a saga's compensable transaction uses a semaphore to indicate that an update is in progress."

## .supports

- `pattern=saga` (forbid) — **contrast**: a proponent that recommends the pattern. its own limits concede our four laws: a compensation "might not always succeed" (idempotency), "partially applied updates" and "dirty reads" (consistency at rest). its countermeasure, the semantic lock — a record that an update is in progress — is our cure's `TENTATIVE` status, made the primary move rather than a patch. and the countermeasure list itself is the tell: a pattern that ships a patch per anomaly is the defect (`rule.forbid.sagas`)
