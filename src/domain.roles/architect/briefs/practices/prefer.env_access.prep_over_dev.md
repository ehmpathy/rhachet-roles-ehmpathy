# prefer.env_access.prep_over_dev

## .what

use `prep` instead of `dev` for pre-production environments.

## .why

### semantic symmetry

| term | meaning | describes |
|------|---------|-----------|
| `prod` | produce, production | where we produce value |
| `prep` | prepare, pre-production | where we prepare for production |
| `test` | test | where we test |

all three describe **what happens in the environment**.

`dev` breaks this pattern — it describes **who uses it** (developers), not what happens there.

### the full symmetric set

```
test → prep → prod
```

- `test` — automated verification
- `prep` — manual verification, quality assurance, cross-service compatibility, pre-production
- `prod` — production, real users

### bonus: character length

all four characters:
- `prod` (4)
- `prep` (4)
- `test` (4)

vs `dev` (3) — breaks alignment in configs and logs.

## .examples

```yaml
# symmetric
environments:
  - test
  - prep
  - prod

# asymmetric (avoid)
environments:
  - test
  - dev   # describes who, not what
  - prod
```
