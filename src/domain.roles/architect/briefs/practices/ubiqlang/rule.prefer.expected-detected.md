# rule.prefer.expected-detected

## .what

when a transformer or operation compares an **observed reality** against a **desired reality**, the two values should carry paired vocabulary:

- `expected` — the value we want / declared / intend
- `detected` — the value actually found / observed in the world

## .why

- the pair reads as a natural opposition (expected-vs-detected) that maps onto the compare's intent: "did reality match what we wanted?"
- avoids ad-hoc drift across sites: extant/desired, found/wanted, actual/target, current/intended all express the same concept with different words
- consistent names let a reader grok any such compare instantly, and let autocomplete surface the pair together

## .example

from `ehmpathy/declastruct-aws`, an ownership-classification transformer compares the exid tag AWS reports against the exid the declaration wants:

```ts
export const getResourceOwnershipVerdict = (input: {
  exidDetected: string | null | undefined; // what AWS reports on the extant resource
  exidExpected: string;                     // what our declaration wants
}): 'unowned' | 'ours' | 'foreign' => { ... };
```

## .scope

applies when a value pair expresses "desired reality vs observed reality" in a compare — transformers, reconcilers, drift detectors, verify steps.

does NOT force the vocabulary on unrelated before/after or input/output pairs.

## .enforcement

- a desired-vs-observed compare that uses ad-hoc names (found/wanted, actual/target, current/intended) instead of `expected` / `detected` = **nitpick** (prefer)

## .see also

- `rule.prefer.symmetric-term-pairs` — the general symmetric-pair principle this specializes
- `rule.require.ubiqlang` — one canonical word per concept
- `ref.reviewer.dont-bikeshed-terms` — do not force a contrived pair over a natural domain word
