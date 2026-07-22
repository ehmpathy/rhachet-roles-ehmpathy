# rule.forbid.any-price

## .what

do not represent a money or price value with an **any-price** shape — a bare `number` of
dollars or cents, a display string like `'$50.37'`, or an ad-hoc `{ amount, currency }` bag —
when that value is the declared, stored, or passed shape.

**any-price** = any representation *other than* the canonical `iso-price` glossary. it is the
loose, unconstrained twin of `IsoPriceWords` (`rule.require.iso-price`) — the same sense
`any` carries in typescript: it could be any shape at all, so the compiler guards no
currency, no unit, no precision.

above all: do not do money arithmetic on an any-price number. `0.1 + 0.2` is
`0.30000000000000004`, and that cent reaches a real invoice.

## .why

`iso-price` is the adopted glossary for **ergonomics** and **safety**; an any-price shape
forfeits both:

- **float drift** — ieee-754 cannot hold `0.30` exactly. every `+`, `*`, `/` on money
  numbers accrues error; the glossary's bigint arithmetic cannot.
- **lost currency** — a bare `number` drops the currency, so `usd + eur` silently sums to a
  meaningless total. `IsoPriceWords` carries the currency and refuses the mismatch.
- **hidden unit** — is `5037` dollars or cents? an any-price number never says.
  `'USD 50.37'` does.
- **sprawl** — every ad-hoc `{ amount, currency }` bag is a private map; the glossary is one
  shared, validated, serializable territory.

## .the forbidden shapes

| forbidden (any-price) | why | use instead (iso-price) |
|-----------------------|-----|-------------------------|
| `pricePerDay: number` | unit + currency hidden | `IsoPriceWords` |
| `total: number` (cents) | unit hidden, float-prone | `IsoPriceWords` |
| `price: '$50.37'` (display string) | locale-bound, not canonical | `IsoPriceWords` (`'USD 50.37'`) |
| `{ amount: number; currency: string }` bag | reinvents `IsoPriceShape`, no validation | `IsoPriceWords` / `IsoPriceShape` |
| `a + b`, `qty * price` on money numbers | float drift, cross-currency add | `priceSum`, `priceMultiply` |

## .the one allowed use of an any-price value

a bare `number` / display string / `{ amount, currency }` is allowed **only** as transient
input to `asIsoPrice` at a boundary — the instant a price enters from an sdk or a form. it is
cast to `IsoPriceWords` at once and never stored or passed as any-price.

```ts
import { asIsoPrice } from 'iso-price';

// ✅ the sdk cents live only long enough to be cast at the boundary
const paid = asIsoPrice({ amount: sdkCharge.amount, currency: sdkCharge.currency });
```

## .reach for instead

the `iso-price` operations that replace each any-price habit — use the **`price*`
(noun-first)** form so every price op groups under one autocomplete prefix:

| any-price habit | reach for |
|-----------------|-----------|
| `parseFloat('$50.37')` | `asIsoPrice` |
| `a + b` on money | `priceSum(a, b)` |
| `a - b` on money | `priceSub(a, b)` |
| `price * qty` | `priceMultiply({ of: price, by: qty })` |
| `total / n` | `priceDivide({ of: total, by: n })` |
| split a bill by hand | `priceAllocate({ of, into, remainder })` |
| `a === b` on money | `isIsoPrice.equal(a, b)` |
| `a > b` on money | `isIsoPrice.greater(a, b)` |
| `n.toFixed(2)` for display | `asIsoPriceHuman` |

> read the full glossary:
> `rhx git.repo.get lines --in ehmpathy/iso-price --paths 'readme.md'`

## .caveats

- **the boundary cast is the escape hatch, not a loophole** — a raw `number` may enter and be
  cast at once; it may not linger as a field, a return, or a passed value.
- **never `===` two prices** — `'USD 0.25'` and `'USD 0.250_000'` are equal in value but not
  as strings; compare with `isIsoPrice.equal`.
- **display is not storage** — `asIsoPriceHuman` (`'$50.37'`) is a locale-bound, lossy view;
  it belongs at the ui edge, never as a stored or passed value.
- **a scalar multiplier stays a `number`** — `priceMultiply({ of: price, by: 7 })` is
  correct; `by` is a plain quantity, not a price.

## .examples

both demonstrate the same computation — a quote total, `rate × hours` — done wrong, then
right.

### 👎 bad — any-price number, raw multiply

```ts
interface SurfLessonQuote {
  hourlyRate: number;       // '$'? cents? which currency?
  hours: number;
}

// raw multiply — float drift + no currency guard
const total = quote.hourlyRate * quote.hours;
```

### 👍 good — iso-price words, `priceMultiply`

```ts
import type { IsoPriceWords } from 'iso-price';
import { priceMultiply } from 'iso-price';

interface SurfLessonQuote {
  hourlyRate: IsoPriceWords;              // 'USD 80.00'
  hours: number;                          // scalar quantity — the multiplier
}

// same rate × hours, now lossless + currency-safe
const total = priceMultiply({ of: quote.hourlyRate, by: quote.hours }); // 'USD 240.00'
```

## .enforcement

- a money / price / fee / total declared as `number` or display string in a domain object,
  contract, or stored value = **blocker**
- an ad-hoc `{ amount, currency }` bag as the stored or passed representation = **blocker**
- raw `+` / `*` / `/` arithmetic on money numbers = **blocker**
- an any-price value is a **false positive** only when it is transient input to `asIsoPrice`
  at a boundary

## .see also

- `rule.require.iso-price` — the positive pair (what to use)
- `.readme` (consistent.glossaries) — why the glossary family exists
- `rule.forbid.io-as-domain-objects` — the adjacent rule against ad-hoc contract bags
