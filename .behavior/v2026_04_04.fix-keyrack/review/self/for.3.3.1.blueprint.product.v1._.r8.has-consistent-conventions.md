# review r8: has-consistent-conventions

deeper review. search for any name convention divergence not caught in r7.

## fresh codebase search

### keyrack get invocation patterns

from grep across codebase:

shell pattern (keyrack.operations.sh line 32):
```bash
keyrack_output=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
  --key "$KEY_NAME" \
  --owner ehmpath \
  --env prep \
  --json)
```

shell pattern (git.commit.push.sh line 244):
```bash
"$REPO_ROOT/node_modules/.bin/rhachet" keyrack get \
  --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN \
  --owner "$KEYRACK_OWNER" \
  --env prep \
  --json
```

**observed conventions:**
- `--key` takes SCREAMING_SNAKE_CASE
- `--owner` is lowercase identifier (ehmpath)
- `--env` is lowercase (prep, test, prod)
- `--json` flag for machine-readable output

### SDK import path

from wish (line 43):
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**observed convention:** submodule export via `'package/submodule'` pattern.

## re-examine blueprint conventions

### convention 1: SDK method name `keyrack.get()`

**blueprint uses:** `keyrack.get({ ... })`

**shell equivalent:** `rhachet keyrack get ...`

**consistent?** yes. SDK method `get` matches CLI subcommand `get`.

### convention 2: SDK argument names

**blueprint uses:**
```typescript
keyrack.get({
  key: 'XAI_API_KEY',
  owner: 'ehmpath',
  env: 'prep',
})
```

**shell equivalent:**
```bash
--key XAI_API_KEY
--owner ehmpath
--env prep
```

**consistent?** yes. argument names `key`, `owner`, `env` match CLI flags.

### convention 3: error message format

**blueprint uses:**
```
🔐 XAI_API_KEY locked

run: rhx keyrack unlock --owner ehmpath --env prep
```

**extant pattern (git.commit.push.sh):**
from vision document:
```
fallback to ehmpath owner unlock
```

**consistent?** yes. both provide unlock command. blueprint adds emoji and structured format, which aligns with other CLI output patterns.

### convention 4: exit code

**blueprint uses:** `process.exit(2)`

**extant pattern:** exit 2 = constraint error (user must fix)

**consistent?** yes. follows rule.require.exit-code-semantics.

## conventions not checked in r7

### convention 5: variable names for keyrack response

**blueprint uses:**
```typescript
const grant = await keyrack.get({ ... });
if (grant.status === 'locked') { ... }
process.env.XAI_API_KEY = grant.secret;
```

**shell pattern uses:**
```bash
keyrack_output=$(... keyrack get ... --json)
secret=$(echo "$keyrack_output" | jq -r '.grant.key.secret // empty')
```

**analysis:**
- shell extracts from `.grant.key.secret`
- blueprint uses `grant.secret` (assumes SDK simplifies path)

**risk:** if SDK returns same structure as JSON CLI output, should be `grant.key.secret`?

**verification needed:** this is an SDK contract question. flagged in assumption reviews.

**convention-wise:** variable name `grant` is consistent with JSON structure.

### convention 6: file structure

**blueprint touches:**
- `src/domain.roles/mechanic/keyrack.yml`
- `src/contract/cli/guardBorder.onWebfetch.ts`
- `src/domain.roles/mechanic/inits/claude.hooks/posttooluse.guardBorder.onWebfetch.sh`

**extant structure:** all paths match extant file locations. no new directories or reorganization.

**consistent?** yes. edits in place.

### convention 7: token name structure

**extant pattern:** `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN`

structure: `{ORG}_{NAMESPACE}_{ENV}_{SERVICE}_TOKEN`

**blueprint renames to:** `EHMPATHY_SEATURTLE_GITHUB_TOKEN`

structure: `{ORG}_{NAMESPACE}_{SERVICE}_TOKEN` (env removed)

**why:** token is used in `env.prep`, not `env.prod`. `_PROD_` in name was incorrect.

**consistent?** intentional fix of an inconsistency. new name is more accurate.

## issues found

### potential issue: grant.secret vs grant.key.secret

blueprint assumes `grant.secret` but shell uses `.grant.key.secret`.

**resolution:** this is SDK contract, not convention. SDK may expose simplified access. implementation will verify.

**not a convention issue** — this is an assumption about SDK shape, already flagged in assumption reviews.

## why this holds

all conventions align:
1. **SDK method** matches CLI subcommand
2. **SDK args** match CLI flags
3. **error format** follows extant patterns
4. **exit codes** follow semantics
5. **variable names** match JSON structure
6. **file locations** are edits in place
7. **token rename** fixes inconsistency, not introduces one

no convention divergence found.

