# self-review: has-consistent-conventions

## summary

**verdict**: conventions are consistent with codebase patterns

## name conventions review

### 1. variable names

| new code | convention check |
|----------|------------------|
| `keyGrant` | matches codebase pattern: camelCase ✅ |
| `FILL_ARGS` | matches shell convention: SCREAMING_SNAKE_CASE for arrays ✅ |
| `REFRESH_KEY` | matches shell convention: SCREAMING_SNAKE_CASE for vars ✅ |

### 2. key names in keyrack.yml

| key | convention check |
|-----|------------------|
| `XAI_API_KEY` | matches pattern: SCREAMING_SNAKE_CASE ✅ |
| `EHMPATHY_SEATURTLE_GITHUB_TOKEN` | matches pattern: SCREAMING_SNAKE_CASE ✅ |
| removed `_PROD_` | aligns with env nomenclature: key name should not repeat env context ✅ |

### 3. keyrack SDK parameters

| param | convention check |
|-------|------------------|
| `for: { key: ... }` | matches SDK contract ✅ |
| `owner: 'ehmpath'` | matches other keyrack calls in codebase ✅ |
| `env: 'prep'` | matches env nomenclature ✅ |

### 4. error output patterns

| aspect | convention check |
|--------|------------------|
| `console.error(...)` | matches TypeScript error output ✅ |
| `process.exit(2)` | matches hook block convention ✅ |
| `result.emit.stdout` | uses SDK-provided message (wisher specified) ✅ |

### 5. keyrack fill flags

| flag | convention check |
|------|------------------|
| `--owner ehmpath` | matches keyrack CLI conventions ✅ |
| `--prikey "$EHMPATH_KEY"` | matches keyrack CLI conventions ✅ |
| `--env prep` | matches env nomenclature ✅ |
| `--refresh` | matches keyrack CLI conventions ✅ |

## pattern divergences found

**none.**

all names and patterns match codebase conventions:
- TypeScript uses camelCase
- shell uses SCREAMING_SNAKE_CASE
- keyrack keys use SCREAMING_SNAKE_CASE
- SDK params match keyrack contract
- CLI flags match rhachet conventions

## conclusion

no convention divergences. implementation uses consistent nomenclature and patterns.
