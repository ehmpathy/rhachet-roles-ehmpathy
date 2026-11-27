# F31 — the transaction catalog decomposes by bound × trait

## .the fork

the catalog sorted its members by `tier` (a priority bin) and `kind` (each member's slug): no axis was walked. which two axes decompose a transaction pattern?

- **bound × trait** (taken) — what the write touches × what the write must keep
- **bound × threat** — the same walk, named by what breaks a write rather than what it keeps
- **kind × verb**, mirrored from the abstraction catalog — rejected: a transaction pattern does not shape or use a construct

## .taken, and why at the time

bound × trait. a transaction covers one storage, never more, so `storage · contract` marks the one line that matters: inside it the storage keeps each trait; past a contract, each side keeps its own and the pattern makes the cross safe. the trait names come from the canon: acid (härder & reuter 1983) for `atomicity`, `consistency`, `isolation`; at-least-once delivery for `idempotency`. `consistency` holds both declared constraints and the read guarantees (session guarantees, terry et al. 1994: a read sees the latest write; a status moves only forward); it is also the law above the walk, as acid itself uses it.

later cuts struck: `resource · storage · endpoint` split one storage by scale, though every pattern in both columns is the storage at work; `integrity · monotonicity · recency` split consistency into its parts.

the forbid members (`saga`, `two-phase-commit`, `distributed-lock`) sit in their own cells with `verdict: forbid`; `rule.forbid.sagas` boots the ban. tier is `root` / `leaf`, a members-table column.

earlier cuts, each struck by the wisher: `span × break` mixed threats with invariant kinds; `span × threat` kept code-level enforcements (bypass, bad input) that belong on the enforcement ladder and lacked out-of-order delivery; `reach` (entity · database · services) framed the axis by the invariant rather than the write and missed third-party apis.

## .rework

clean. the axes live in one catalog brief and in member filenames; a rename is mechanical (mvsafe per file, sedreplace on refs).

## .confidence

85%. least sure:

- `bound` as the axis name
- the `saga` verdict. the canon contests it: richardson and microsoft recommend the saga. the canon also concedes every cost we name — a compensation may fail, records sit inconsistent between steps, an undo cannot restore the past (`ref.nd.azure-saga`, `ref.nd.azure-compensating-transaction`). and the forbid's cure has its own canon: helland's tentative operation that confirms or cancels (`ref.2007.helland`), the apology as a forward act (`ref.2009.helland-campbell`), compensation as "the last option" (`ref.2004.hohpe`). so the split is the verdict alone, and the verdict is ours

the `two-phase-commit` and `distributed-lock` verdicts carry no doubt: every captured source converges, the saga's own proponent included.

## .where

`src/domain.roles/architect/briefs/practices/domain.transactions/catalog.of=pattern.transaction._.md`

## .verdict

ruled by the wisher, 2026-11-27: the axes are bound × trait, and `bound` is the axis name; the `saga` is forbidden. `distributed-lock` is forbidden only across a release boundary. a lock inside one is allowed — one service, or one organization's shared infra, where the organization is the release boundary. a lease as the only guard of a database write that must be correct is a blocker; the write keeps the database's own check. the rule is renamed `rule.forbid.locks-across-release-boundaries`.