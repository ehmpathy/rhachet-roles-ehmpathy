# tsc: telegraphic semantic compression

## rule

DELETE low-entropy tokens. KEEP high-entropy tokens.

## what to DELETE (low entropy = predictable = removable)

| category | examples |
|----------|----------|
| articles | a, an, the |
| copulas | is, are, was, were, be, been |
| prepositions | of, to, for, with, in, on (when inferable) |
| filler phrases | "in order to", "it should be noted", "the fact that" |
| transitions | furthermore, additionally, moreover, however |
| redundant explanations | sentences that restate what another sentence said |

## what to KEEP (high entropy = unpredictable = essential)

| category | examples |
|----------|----------|
| content words | nouns, verbs, adjectives, adverbs |
| domain terms | precise vocabulary, proper nouns |
| rule statements | the core directive |
| enforcement levels | blocker, nitpick |
| code examples | one positive, one negative (if both present) |
| structural markers | headers, bullets, tables |

## example transformation

### before (verbose)
```
the rule is that you should always use named arguments on inputs.
this is because they make it clear when you read what the arguments are used for.
they also make it possible to reorder arguments without to break the contract,
which is great for refactors, deprecations, renames, and so forth.
```

### after (tsc compressed)
```
rule: always use named arguments on inputs

why:
- clear: reader sees what arguments used for
- evolvable: reorder arguments without contract break
- enables: refactors, deprecations, renames
```
