# self-review: has-consistent-conventions (r4)

## code-level conventions review

this review examines actual code against codebase conventions.

### guardBorder.onWebfetch.ts

**import order:**
```typescript
import * as path from 'path';
import { keyrack } from 'rhachet/keyrack';
import { genBrainAtom } from 'rhachet-brains-xai';

import { decideIsContentAdmissibleOnWebfetch } from '@src/domain.operations/guardBorder/decideIsContentAdmissibleOnWebfetch';
```

| check | convention | match? |
|-------|------------|--------|
| stdlib first | yes | ✅ `path` is first |
| external packages second | yes | ✅ `rhachet/keyrack`, `rhachet-brains-xai` |
| internal imports last | yes | ✅ `@src/...` at end |
| blank line separator | yes | ✅ blank line before internal |

**function structure:**
```typescript
export const guardBorderOnWebfetch = async (): Promise<void> => {
  // fetch XAI_API_KEY from keyrack
  const keyGrant = await keyrack.get({...});

  // failfast if not granted
  if (keyGrant.attempt.status !== 'granted') {...}

  // set env var for downstream
  process.env.XAI_API_KEY = keyGrant.attempt.grant.key.secret;
  ...
};
```

| check | convention | match? |
|-------|------------|--------|
| arrow function | yes | ✅ `const fn = async () => {}` |
| comment paragraphs | yes | ✅ `// verb noun` before each block |
| early return | yes | ✅ `if (!granted) { exit }` pattern |
| named export | yes | ✅ `export const` not `export default` |

**variable names:**
| name | convention | match? |
|------|------------|--------|
| `keyGrant` | camelCase | ✅ |
| `stdin` | camelCase | ✅ |
| `input` | camelCase | ✅ |
| `brain` | camelCase | ✅ |
| `quarantineDir` | camelCase | ✅ |
| `result` | camelCase | ✅ |

### keyrack.ehmpath.sh

**shell variable conventions:**
```bash
FILL_ARGS=(...)
REFRESH_KEY="$2"
EHMPATH_KEY="$HOME/.ssh/ehmpath"
```

| name | convention | match? |
|------|------------|--------|
| `FILL_ARGS` | SCREAMING_SNAKE_CASE | ✅ |
| `REFRESH_KEY` | SCREAMING_SNAKE_CASE | ✅ |
| `EHMPATH_KEY` | SCREAMING_SNAKE_CASE | ✅ |

**shell comment style:**
```bash
# step 3: fill required keys from keyrack.yml
```

| check | convention | match? |
|-------|------------|--------|
| comment before action | yes | ✅ |
| lowercase in comments | yes | ✅ |
| step numbers | matches file structure | ✅ |

## divergences found

**none.**

code follows all codebase conventions:
- import order (stdlib → external → internal)
- arrow functions with named exports
- comment paragraphs before code blocks
- early return pattern for guards
- camelCase in TypeScript, SCREAMING_SNAKE_CASE in shell

## conclusion

implementation follows codebase conventions consistently.
