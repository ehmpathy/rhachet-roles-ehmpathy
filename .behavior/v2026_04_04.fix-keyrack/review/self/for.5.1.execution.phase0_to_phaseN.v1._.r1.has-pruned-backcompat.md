# self-review: has-pruned-backcompat

## summary

**verdict**: no backwards-compat hacks detected

the implementation removes old logic entirely rather than add compat shims.

## review

### backwards-compat concerns checked

**1. apikeys.env fallback removed**

| aspect | analysis |
|--------|----------|
| old code | `source ~/.config/rhachet/apikeys.env` |
| new code | keyrack SDK fetch |
| compat shim? | no — removed entirely |
| wisher request? | yes — "replace hardcoded apikeys.env with keyrack SDK" |

no backwards-compat code. old approach is removed, not shimmed.

**2. REQUIRED_KEYS array removed**

| aspect | analysis |
|--------|----------|
| old code | manual array + iteration |
| new code | `keyrack fill` command |
| compat shim? | no — replaced entirely |
| wisher request? | yes — "replace REQUIRED_KEYS array with keyrack fill call" |

no backwards-compat code. old approach is removed, not shimmed.

**3. token rename**

| aspect | analysis |
|--------|----------|
| old name | `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` |
| new name | `EHMPATHY_SEATURTLE_GITHUB_TOKEN` |
| compat shim? | no — no fallback to old name |
| wisher request? | yes — explicit rename in scope |

no backwards-compat code. old name is replaced entirely via sedreplace.

### backwards-compat not added

the implementation does not include:
- fallback to old apikeys.env path
- fallback to old token name
- migration utils
- deprecation warnings
- conditional logic for old vs new

this is correct — the wisher requested replacement, not deprecation.

## conclusion

no backwards-compat hacks detected. old code is replaced, not shimmed. this aligns with the explicit wisher request for replacement.
