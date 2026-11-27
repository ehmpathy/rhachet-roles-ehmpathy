# rule.forbid.leaky-abstractions

## .what

never ship an abstraction a caller must see beneath to use right. a leak forces each caller to learn the layer below; an inversion forces each caller to rebuild a low primitive on top of a high one, since no way past the surface exists.

> "All non-trivial abstractions, to some degree, are leaky." — spolsky 2002, *the law of leaky abstractions* ✅

abstraction inversion: callers "re-implement the required functions in terms of the interface, which in its turn uses the internal implementation of the same functions" (wikipedia, *abstraction inversion* 🟡).

## .the smell

```ts
// 👎 a leak: the caller must know the vendor paginates, and retry its rate limit
const page1 = await getAllLessons({ cursor: null }, context);
if (page1.rateLimited) await sleep(page1.retryAfterMs);

// 👎 an inversion: no way to cast one record, so the caller syncs all and keeps one
await syncAllCustomersFromStripe({}, context);
const customer = await getCustomer({ exid }, context);
```

the tells:

- a caller handles a vendor's pagination, rate limit, or eventual read the contract never names
- a caller calls a large composite to reach the one small step inside it

## .the cure

| move | holds because |
|---|---|
| absorb the leak inside the contract (`getAllLessons` pages and retries) | no caller learns the layer below |
| a leak the contract cannot absorb is declared (a communicator documents its rate limit and eventual reads) | the caller learns it from the contract, not from production |
| an inversion gets a primitive (`asCustomer`), safe and stable | the caller composes its own path from named pieces (`rule.require.safe-escape-primitives`) |

## .enforcement

- a caller that must know an undeclared behavior of the layer below to use the contract right = **blocker** (harm: the caller who did not know it ships the defect — a lost page, a rate-limit storm)
- an inversion that costs only waste (a larger call than needed), no wrong result = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=expose` — the full tactic, with the sources
- `rule.require.safe-escape-primitives` — the require twin
- `rule.forbid.shallow-contracts` — the peer: a surface too large, where this is a surface too thin
- `rule.forbid.multiplicative-composition` — the caller-side face: a reach past a promise
