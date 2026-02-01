# rule.require.read-package-docs-before-use

## .what

before use of any unfamiliar package api, read its documentation first

## .why

- prevents reinvention of built-in functionality
- avoids api misuse and subtle bugs
- eliminates boilerplate that the library already handles
- saves hours of debug by learn the correct patterns upfront

## .how

### fetch readme

```sh
npx rhachet run --skill get.package.docs readme --of $package
```

1. scan for the feature you need
2. use the documented pattern

### explore filetree

if readme is not available or you need to see package structure:

```sh
npx rhachet run --skill get.package.docs filetree --of $package
```

## .examples

### before (guesswork)

```ts
const price = { amount: 1234, currency: 'USD' };
const formatted = `$${(price.amount / 100).toFixed(2)}`; // manual format
// adds custom format function that duplicates built-in
```

### after (docs-first)

```sh
npx rhachet run --skill get.package.docs readme --of iso-price
# sees: asIsoPrice, asIsoPriceShape, asIsoPriceHuman, sumPrices
```

```ts
import { asIsoPrice, asIsoPriceHuman } from 'iso-price';

asIsoPrice({ amount: 1234, currency: 'USD' }); // => 'USD 12.34'
asIsoPriceHuman('USD 12.34');                  // => '$12.34'
// no boilerplate needed
```

## .when

apply this rule when:

- first time to use a package in this codebase
- use a package feature you haven't used before
- encounter unexpected behavior from a package
- consider to write a helper that wraps a package

## .cost

5 seconds to fetch readme, 30 seconds to scan

## .benefit

- avoid 30 minutes of debug
- avoid 50 lines of unnecessary code
- ship correct code on first attempt
