# rule.require.exit-code-semantics

## .what

skills use semantic exit codes:

| code | meaning | when |
|------|---------|------|
| 0 | success | operation completed as expected |
| 1 | malfunction | external error (gh failed, network, unexpected state) |
| 2 | constraint | user must fix something (needs rebase, no PR, bad input) |

## .why

- exit 1 vs 2 tells caller whether to retry or fix something
- constraint errors (2) mean user action required before retry
- malfunction errors (1) may be transient, retry might help

## .pattern

```bash
# constraint error: user must fix something
if [[ $(needs_rebase "$status_json") == "true" ]]; then
  echo "⚓ needs rebase" >&2
  exit 2
fi

# malfunction error: gh command failed
if ! enable_automerge "$pr_number"; then
  # error already went to stderr from gh
  exit 1
fi
```

## .examples

### constraint errors (exit 2)

- PR needs rebase
- no PR for branch (user needs to push)
- invalid arguments
- missing required config

### malfunction errors (exit 1)

- gh CLI failed
- network timeout
- rate limit exceeded
- unexpected API response

## .test-fns integration

test-fns provides `ConstraintError` and `MalfunctionError` with exit codes built-in:

```typescript
import { ConstraintError, MalfunctionError } from 'test-fns';

// ConstraintError has error.code.exit = 2
throw new ConstraintError('needs rebase');

// MalfunctionError has error.code.exit = 1
throw new MalfunctionError('gh failed');
```

no need to set exit code — they already have it.

## .enforcement

- skill without semantic exit codes = nitpick
- constraint error using exit 1 = nitpick
