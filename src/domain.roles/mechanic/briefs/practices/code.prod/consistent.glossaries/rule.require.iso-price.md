# rule.require.iso-price

## .what

represent every money and price value with the **`iso-price`** glossary types.
`iso-price` is the adopted ubiqlang glossary for money; `IsoPriceWords` (a string like
`'USD 50.37'`) is the one canonical representation a price takes when it is declared on a
domain object, passed through a contract, or stored.

cast raw inputs into the glossary at the boundary with `asIsoPrice`; do price arithmetic
through the glossary's operations (`priceSum`, `priceMultiply`, …), never with raw numbers.

## .why

`iso-price` is adopted for **ergonomics** and **safety** — the two reasons the whole
glossary family exists:

- **safety** — money math on a raw `number` is wrong by construction: `0.1 + 0.2` is
  `0.30000000000000004`. `iso-price` does lossless bigint arithmetic under the hood, knows
  each currency's iso 4217 exponent, and carries the currency in the value itself — so a
  price can never lose precision, drift, or be added to the wrong currency.
- **ergonomics** — words in, words out: `priceSum('USD 0.10', 'USD 0.20')` is `'USD 0.30'`.
  one obvious cast (`asIsoPrice`), one obvious display (`asIsoPriceHuman`), one obvious
  structured read (`asIsoPriceShape`). the common case is a one-liner.

a bare `number` is a map that dropped the currency and the precision; `IsoPriceWords` is the
territory — one validated, serializable, composable shape the whole codebase shares.

## .the glossary

| form | type | shape |
|------|------|-------|
| canonical (default) | `IsoPriceWords` | `'USD 50.37'` |
| structured | `IsoPriceShape` | `{ amount: 5037n, currency: 'USD', exponent: 'centi.x10^-2' }` |
| localized display | `IsoPriceHuman` | `'$50.37'` |

## .the operations

we use the **`price*` (noun-first)** form of each arithmetic op — it groups every price
operation together under one autocomplete prefix (`rule.require.order.noun_adj`). the
verb-first aliases (`sumPrices`, `multiplyPrice`, …) name the same op; prefer `price*`.

| kind | operation | does |
|------|-----------|------|
| cast | `asIsoPrice` (= `asIsoPriceWords`) | any input → canonical words `'USD 50.37'` |
| cast | `asIsoPriceShape` | words → `{ amount: 5037n, currency, exponent }` |
| cast | `asIsoPriceHuman` | words → localized display `'$50.37'` |
| sort | `asIsoPrice.sorted` (`.asc` / `.desc`) | numeric sort of a price list |
| arithmetic | `priceSum(...prices)` | add prices |
| arithmetic | `priceSub(a, b)` | subtract |
| arithmetic | `priceMultiply({ of, by })` | scale by a scalar |
| arithmetic | `priceDivide({ of, by })` | divide by a scalar |
| arithmetic | `priceAllocate({ of, into, remainder })` | split without losing a cent |
| precision | `setPricePrecision({ of, to })`, `roundPrice({ of })` | change/round precision |
| statistics | `calcPriceAvg(prices)`, `calcPriceStdev(prices)` | aggregate |
| guard | `isIsoPrice` (+ `.greater` / `.lesser` / `.equal`) | validate + numeric compare |

`asIsoPrice` accepts any input — `'$50.37'`, `'USD 50.37'`, `{ amount, currency }`, bigint
amounts — and returns canonical words.

> read the full glossary:
> `rhx git.repo.get lines --in ehmpathy/iso-price --paths 'readme.md'`

## .caveats

- **`IsoPriceWords` is the one you store and pass.** `IsoPriceHuman` (`'$50.37'`) is
  display-only — locale-bound, lossy — so keep it at the ui edge; `IsoPriceShape` is for
  structured reads (bigint amount, exponent).
- **precision follows iso 4217 by default.** `asIsoPrice('$7')` → `'USD 7.00'` (2 decimals),
  `asIsoPrice('¥1000')` → `'JPY 1000'` (0). custom currencies default to 2 decimals. override
  with `{ exponent }`, and round explicitly with `{ round: 'half-up' }` when you need to.
- **precision is preserved to the most granular input** — `priceSum('USD 50.00',
  'USD 0.000_005')` keeps the micro-precision. this is a feature, not drift.
- **compare with `isIsoPrice.equal`**, not `===` — `'USD 0.25'` and `'USD 0.250_000'` are
  equal in value but not as strings.

## .scope

applies to the **representation** of a money value:

- a field on a domain object or type (a price, a total, a fee, a balance)
- an input/output shape on a contract or operation
- a value persisted or passed between operations

a bare `number` / `'$50.37'` string / `{ amount, currency }` bag is allowed **only** as
transient input to `asIsoPrice` at a boundary. the declared, stored, passed shape is
`IsoPriceWords`.

## .how

- **declare** price fields as `IsoPriceWords`, never `number`
- **cast at the boundary** — `asIsoPrice(sdkCharge.amount)` the moment a raw price enters
- **compute** through `priceSum` / `priceMultiply` / `priceDivide`, never `a + b` on raw money numbers
- **compare** through `isIsoPrice.greater` / `.lesser` / `.equal`, which handle precision
- **display** through `asIsoPriceHuman` at the ui edge only

## .examples

### 👎 bad — any-price number as the representation, float math

```ts
interface BoardRental {
  pricePerDay: number;      // dollars? cents? which currency?
}

// float drift — a customer is charged $0.30000000000000004
const total = rental.pricePerDay * 0.1 + rental.pricePerDay * 0.2;
```

### 👍 good — the iso-price glossary as the representation

```ts
import type { IsoPriceWords } from 'iso-price';
import { priceSum, priceMultiply, priceDivide } from 'iso-price';

interface BoardRental {
  pricePerDay: IsoPriceWords;             // 'USD 45.00'
}

// lossless, currency-safe arithmetic
const weekend = priceSum(rental.pricePerDay, rental.pricePerDay);   // 'USD 90.00'
const week = priceMultiply({ of: rental.pricePerDay, by: 7 });      // 'USD 315.00'
const halfDay = priceDivide({ of: rental.pricePerDay, by: 2 });     // 'USD 22.50'
```

### 👍 good — cast at the boundary

```ts
import { asIsoPrice } from 'iso-price';

// sdk hands back cents + currency; cast once at the boundary
const charged = asIsoPrice({ amount: sdkCharge.amount, currency: sdkCharge.currency });
```

## .exceptions

- **transient cast input** — a `number` / display string / `{ amount, currency }` handed to
  `asIsoPrice` at a boundary
- **third-party contracts** — an sdk/api money type you do not own; cast to `iso-price` the
  moment it crosses into our code

## .enforcement

- a money / price / fee / total declared as `number` in a domain object, contract, or stored
  value = **blocker**
- raw arithmetic (`+`, `*`, `/`) on money numbers where `priceSum` / `priceMultiply` /
  `priceDivide` applies = **blocker**

## .see also

- `rule.forbid.any-price` — the negative pair (what not to use)
- `.readme` (consistent.glossaries) — why the glossary family exists
- `rule.require.ubiqlang` — one canonical representation per concept
- `rule.require.read-package-docs-before-use` — read the iso-price readme first
