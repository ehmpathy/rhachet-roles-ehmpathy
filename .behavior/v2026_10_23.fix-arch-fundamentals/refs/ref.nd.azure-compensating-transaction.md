# ref.nd.azure-compensating-transaction

grade: ✅ — the publisher's own page (microsoft, azure architecture center)
cite: Microsoft. "Compensating Transaction pattern." *Azure Architecture Center*. https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction
seen: `.raw/page.azure-compensating-transaction.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Use this pattern to undo work when one or more steps fail in an eventually consistent operation."

> "During these steps, the overall view of the system state might be inconsistent. But the system should become consistent again when all steps finish."

> "However, you can't always roll back the data because other concurrent application instances might change the data. Even when concurrent instances don't change the data, it can be more complex to undo a step than to restore the original state. You might need to apply business-specific rules."

> "You might think that you can simply restore the system to its original state, but this approach can overwrite changes from other concurrent application instances. Instead, the compensating transaction must intelligently account for concurrent work."

## .supports

- `pattern=saga` (forbid) — **contrast**, with two concessions:
  - it states outright that the records are inconsistent between steps — the break of consistency at rest
  - it concedes a compensation cannot be a revert: it must apply "business-specific rules" and "account for concurrent work". that is a new forward act — the apology of `ref.2009.helland-campbell` — under another name
