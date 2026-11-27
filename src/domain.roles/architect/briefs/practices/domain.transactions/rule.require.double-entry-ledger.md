# rule.require.double-entry-ledger

## .what

never update a balance in place. append entries in balanced pairs, in one transaction; a balance is a read over the entries. every balance equals the sum of its entries, and every entry has an equal and opposite twin.

## .when

a leaf rule: it binds a repo that moves or holds money — surfer credits, instructor payouts, gift cards. a repo with no balance owes naught.

## .the smell

```ts
// 👎 a balance updated in place: two writers race, and no trail shows where it drifted
await daoSurferCredit.set({ credit: { ...credit, balance: priceSum([credit.balance, refund]) } }, context);
```

the tells:

- a `balance` column that an `update` changes
- a credit or debit with no paired entry
- a reconcile job that patches balances to match a report

## .the cure

- append entries in balanced pairs, in one transaction: a debit to one account, an equal credit to another
- read a balance as the sum over its entries
- two writers append, so neither can erase the other: no read-modify-write is left to race
- amounts are `IsoPrice` (`rule.forbid.any-price`, mechanic)

> "every financial transaction is recorded with equal and opposite entries (debits and credits)" — wikipedia, "double-entry bookkeeping" ☑️ (secondary)

## .enforcement

- in a repo that moves or holds money: a balance updated in place = **blocker**. harm: a lost update on a hot balance, and a balance that drifts from its history with no trail to show where — monetary
- an entry with no equal and opposite twin = **blocker**. harm: money appears or vanishes

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=double-entry-ledger` — the member, in full
- `rule.forbid.check-then-write` — the read-modify-write race this removes
- `rule.forbid.any-price` (mechanic) — the money type each entry carries
