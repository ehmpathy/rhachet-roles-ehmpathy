# ref.2004.hohpe

grade: ✅ — the author's own page
cite: Gregor Hohpe (2004, 19 November). "Starbucks Does Not Use Two-Phase Commit." *Gregor's Ramblings*, enterpriseintegrationpatterns.com. https://www.enterpriseintegrationpatterns.com/ramblings/18_starbucks.html
seen: `.raw/page.hohpe2005-coffee-shop.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`. the page shows 2004; the raw id's 2005 was a guess from an ieee software reprint this capture does not confirm, so this ref cites the page's own date

## .quotes

> "In the Starbucks example, a two-phase commit would equate to waiting at the cashier with the receipt and the money on the table until the drink is finished. Then, the drink would be added to the mix. Finally the money, receipt and drink would change hands in one swoop. Neither the cashier nor the customer would be able to leave until the "transaction" is completed."

> "Retry - When some operations of a larger group (i.e. "transaction") fail, we have essentially two choices: undo the ones that are already done or retry the ones that failed. … A special case is a retry with Idempotent Receiver. In this case we can simply retry all operations since the successful receivers will ignore duplicate messages."

> "Compensating Action - The last option is to undo operations that were already completed to put the system back into a consistent state. Such "compensating actions" work well for example if we deal with monetary systems where we can recredit money that has been debited."

> "If anything goes wrong, Amazon usually compensates (refund to credit card) or retries (resend lost goods)."

## .supports

- `pattern=two-phase-commit` (forbid) — **converge**: the whole post argues the real world does not block on a prepare round
- `pattern=saga` (forbid) — **partial converge**: he lists compensation as "the last option", after write-off and retry with an idempotent receiver. his compensation example is a refund — a new forward act, the apology of `ref.2009.helland-campbell`, not a revert
- `pattern=retry-with-backoff`, `pattern=idempotent-consumer` — retry with an idempotent receiver as the first choice
