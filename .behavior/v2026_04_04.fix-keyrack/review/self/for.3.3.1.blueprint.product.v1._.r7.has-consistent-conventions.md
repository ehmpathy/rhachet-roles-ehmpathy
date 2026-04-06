# review r7: has-consistent-conventions

review blueprint name conventions against extant codebase patterns.

## extant conventions found

### keyrack environment names

from grep of `*.yml` files:
```
src/domain.roles/mechanic/keyrack.yml:6:env.prod:
src/domain.roles/mechanic/keyrack.yml:10:env.prep:
src/domain.roles/mechanic/keyrack.yml:13:env.test:
```

convention: `env.prod`, `env.prep`, `env.test`

### keyrack key names

from keyrack.yml:
```yaml
env.prep:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
```

convention: `SCREAMING_SNAKE_CASE` with namespace prefix

### function names

from guardBorder.onWebfetch.ts:
```typescript
export const guardBorderOnWebfetch = async (): Promise<void> => { ... }
const readStdin = async (): Promise<string> => { ... }
```

convention: camelCase for functions

### file names

extant: `guardBorder.onWebfetch.ts`, `keyrack.operations.sh`

convention: camelCase with dot separators for scope

## blueprint name choices vs extant

### 1. environment name: `env.prep`

**blueprint uses:** `env: 'prep'`

**extant pattern:** `env.prep` in keyrack.yml

**consistent?** yes. blueprint uses `'prep'` which maps to `env.prep` section.

### 2. key name: `XAI_API_KEY`

**blueprint uses:** `XAI_API_KEY`

**extant pattern:** `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` (SCREAMING_SNAKE_CASE)

**consistent?** yes. same case convention. no namespace prefix needed for XAI key (external service, not ehmpathy-specific).

### 3. owner name: `ehmpath`

**blueprint uses:** `owner: 'ehmpath'`

**extant pattern:** `--owner ehmpath` in git.commit.push.sh

**consistent?** yes. matches extant shell keyrack calls.

### 4. renamed token: `EHMPATHY_SEATURTLE_GITHUB_TOKEN`

**blueprint renames:** `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` → `EHMPATHY_SEATURTLE_GITHUB_TOKEN`

**extant pattern:** `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` includes `_PROD_`

**consistent?** intentional divergence. vision states rename removes `_PROD_` because token lives in `env.prep`, not `env.prod`. this fixes a name inconsistency, not introduces one.

### 5. SDK import path: `'rhachet/keyrack'`

**blueprint uses:** `import { keyrack } from 'rhachet/keyrack'`

**extant pattern:** human stated in wish: "rhachet exports a keyrack SDK from 'rhachet/keyrack'"

**consistent?** yes. follows path specified by human.

### 6. variable name: `grant`

**blueprint uses:** `const grant = await keyrack.get({ ... })`

**extant pattern:** no extant TypeScript keyrack usage to compare.

shell pattern from keyrack.operations.sh:
```bash
keyrack_output=$(rhachet keyrack get ...)
secret=$(... | jq -r '.grant.key.secret')
```

**consistent?** yes. shell extracts from `.grant.key.secret`, so SDK returns a `grant` object. name matches SDK response shape.

## namespace and prefix patterns

| name | pattern | consistent? |
|------|---------|-------------|
| `XAI_API_KEY` | external service key | yes (no ehmpathy prefix needed) |
| `EHMPATHY_SEATURTLE_GITHUB_TOKEN` | internal token with namespace | yes |
| `ehmpath` | owner namespace | yes (extant) |
| `env.prep` | environment scope | yes (extant) |

## divergence check

**only intentional divergence found:**

token rename `_PROD_` → removed

this is requested by vision to fix an extant inconsistency, not introduce a new one.

## issues found

none. all name conventions align with extant patterns.

## why this holds

1. **env names** — uses extant `prep` convention
2. **key names** — follows SCREAMING_SNAKE_CASE with appropriate namespaces
3. **owner** — uses extant `ehmpath` owner
4. **SDK path** — follows human-specified import path
5. **variable names** — matches SDK response structure

no new name patterns introduced. rename fixes an extant inconsistency.

