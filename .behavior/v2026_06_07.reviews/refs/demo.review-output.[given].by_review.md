# demo.review-output

## .what

prior review output (before this repo). used to identify false positives for eval creation.

## .why

this review contained false positives — blockers that cite rules incorrectly or invent violations. we use this as evidence to build evals that prevent those false positives.

---

## output

```
● Here are all 18 blockers across 7 peer reviews:

---
r1: mech-failhides (2 blockers)

┌─────┬───────────────────────────────────────────┬─────────────────────────────────────┐
│  #  │                  blocker                  │              location               │
├─────┼───────────────────────────────────────────┼─────────────────────────────────────┤
│     │ BadRequestError does not use              │                                     │
│ 1   │ helpful-errors package (lacks exit codes, │ src/utils/errors/BadRequestError.ts │
│     │  structured metadata, cause chaining)     │                                     │
├─────┼───────────────────────────────────────────┼─────────────────────────────────────┤
│     │ failfast logic uses if/return + throw     │                                     │
│ 2   │ instead of .throw() 1-liner with guard    │ withExtendableCache.ts:120-140      │
│     │ comments                                  │                                     │
└─────┴───────────────────────────────────────────┴─────────────────────────────────────┘

---
r2: mech-decode-friction (0 blockers) ✅

---
r3: arch-opport-decomposition (3 blockers)

┌─────┬───────────────────────────────────┬────────────────────────────────────────────┐
│  #  │              blocker              │                  location                  │
├─────┼───────────────────────────────────┼────────────────────────────────────────────┤
│     │ duplicated cache factory logic —  │                                            │
│ 1   │ 6 createExample* functions repeat │ createExampleCache.ts:20,40,60,80,100,120  │
│     │  store+cache construction         │                                            │
├─────┼───────────────────────────────────┼────────────────────────────────────────────┤
│     │ duplicated orchestrator logic —   │ withExtendableCache.ts vs                  │
│ 2   │ invalidate/update bodies nearly   │ withExtendableCacheAsync.ts                │
│     │ identical between sync/async      │                                            │
├─────┼───────────────────────────────────┼────────────────────────────────────────────┤
│     │ inline sub-operation definitions  │                                            │
│ 3   │ — invalidate/update defined as    │ withExtendableCache.ts:210-230             │
│     │ inline closures instead of        │                                            │
│     │ composed named operations         │                                            │
└─────┴───────────────────────────────────┴────────────────────────────────────────────┘

---
r4: arch-smell-scopeleaks (6 blockers)

┌─────┬────────────────────────────────────────────────┬────────────────────────────────┐
│  #  │                    blocker                     │            location            │
├─────┼────────────────────────────────────────────────┼────────────────────────────────┤
│ 1   │ domain.operations imports from domain.objects  │ withExtendableCache.ts:1       │
│     │ internals (SimpleCacheSync)                    │                                │
├─────┼────────────────────────────────────────────────┼────────────────────────────────┤
│ 2   │ domain.operations imports from utils internals │ withExtendableCache.ts:1       │
│     │  (BadRequestError)                             │                                │
├─────┼────────────────────────────────────────────────┼────────────────────────────────┤
│ 3   │ multiple procedures exported from single file  │ withExtendableCache.ts         │
│     │ (10+ exports)                                  │                                │
├─────┼────────────────────────────────────────────────┼────────────────────────────────┤
│ 4   │ withExtendableCache lacks required get/set/gen │ withExtendableCache.ts         │
│     │  verb prefix                                   │                                │
├─────┼────────────────────────────────────────────────┼────────────────────────────────┤
│     │ separate interface declarations                │                                │
│ 5   │ (ArgsWithForInput, ArgsWithForKey,             │ withExtendableCache.ts:188-207 │
│     │ LogicWithExtendableCache) instead of inline    │                                │
├─────┼────────────────────────────────────────────────┼────────────────────────────────┤
│ 6   │ positional arguments (logic, options) instead  │ withExtendableCache.ts         │
│     │ of (input, context?) pattern                   │                                │
└─────┴────────────────────────────────────────────────┴────────────────────────────────┘

---
r5: arch-hazards-maintenance (3 blockers)

┌─────┬──────────────────────────────────┬──────────────────────────────────────────────┐
│  #  │             blocker              │                   location                   │
├─────┼──────────────────────────────────┼──────────────────────────────────────────────┤
│ 1   │ mutable state via store[key] =   │ createExampleCache.ts:19,38,57,76,95,114,133 │
│     │ assignment in test caches        │                                              │
├─────┼──────────────────────────────────┼──────────────────────────────────────────────┤
│ 2   │ as casts bypass type system      │ withExtendableCache.ts:135,155,170           │
│     │ (args as ArgsWithForInput<L>)    │                                              │
├─────┼──────────────────────────────────┼──────────────────────────────────────────────┤
│ 3   │ mutable state via                │ withExtendableCache.test.ts:22,50,88         │
│     │ apiCalls.push() in tests         │                                              │
└─────┴──────────────────────────────────┴──────────────────────────────────────────────┘

---
r6: arch-hazards-behavior (2 blockers)

┌─────┬────────────────────────────────────────────────────────┬────────────────────────┐
│  #  │                        blocker                         │        location        │
├─────┼────────────────────────────────────────────────────────┼────────────────────────┤
│ 1   │ race condition — update does unprotected               │ withExtendableCache.ts │
│     │ read-modify-write (get → compute → set)                │                        │
├─────┼────────────────────────────────────────────────────────┼────────────────────────┤
│     │ non-idempotent functional toValue — ({                 │                        │
│ 2   │ fromCachedOutput }) => fromCachedOutput * 2 applies    │ withExtendableCache.ts │
│     │ twice on retry                                         │                        │
└─────┴────────────────────────────────────────────────────────┴────────────────────────┘

---
r7: behavior-intent-coverage (0 blockers) ✅

---
r8: ergo-friction-hazards (2 blockers)

┌─────┬───────────────────────────────────────────┬─────────────────────────────────────┐
│  #  │                  blocker                  │              location               │
├─────┼───────────────────────────────────────────┼─────────────────────────────────────┤
│     │ BadRequestError message has redundant     │                                     │
│ 1   │ prefix → BadRequestError:                 │ BadRequestError.ts:5                │
│     │ BadRequestError: ...                      │                                     │
├─────┼───────────────────────────────────────────┼─────────────────────────────────────┤
│     │ error messages not actionable —           │                                     │
│ 2   │ "invalidate forKey requires cache arg"    │ withExtendableCache.test.ts:280,320 │
│     │ lacks "fix: ..." guidance                 │                                     │
└─────┴───────────────────────────────────────────┴─────────────────────────────────────┘

---
summary: all 18 blockers concern pre-extant patterns — they existed in the codebase before
this behavior's type renames and test ejection work. the original scope is complete.
```

---

## false positive evals

evals to prevent the false positives found in this review:

```yaml
- slug: no-false-positive-allowed-imports
  given: rule says "domain.operations/ on domain.objects/"
  when: code imports domain.objects from domain.operations
  then: NOT flagged as blocker (import is explicitly allowed)

- slug: no-false-positive-utils-is-infra
  given: rule says "domain.operations/ on domain.objects/ or infra/" and utils = infra
  when: code imports from utils/ in domain.operations
  then: NOT flagged as violation (utils is infra, import allowed)

- slug: no-invented-violations
  given: rule text
  when: review flags a violation
  then: violation must cite specific rule clause that forbids the pattern

- slug: no-false-positive-with-hof-wrappers
  given: rule exempts "HOF wrappers with with* prefix"
  when: code has withSimpleCache, withLogTrail, withRetry
  then: NOT flagged as absent get/set/gen prefix (with* is exempt)

- slug: no-blocker-from-prefer-rule
  given: rule directive is "prefer" or "avoid"
  when: review flags a violation
  then: severity must be nitpick, NOT blocker (prefer/avoid = nitpick max)

- slug: blocker-only-from-forbid-require
  given: review flags blocker severity
  when: citing a rule
  then: rule must be "forbid" or "require" directive (only these can block)
```
