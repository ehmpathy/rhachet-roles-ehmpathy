# self-review r4: has-consistent-mechanisms

verified fix is complete. no further inconsistencies.

## issue fixed in r3

**problem:** empty input exited 0 (silent allow) instead of 2 (error)

**fix applied:**
```bash
# before
if [[ -z "$STDIN_INPUT" ]]; then
  exit 0
fi

# after
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

**verified:** hook file updated, test file updated, build passed.

## final consistency check

read through hook one more time. compared each section to extant hooks:

| section | extant pattern | our hook | match |
|---------|----------------|----------|-------|
| shebang | `#!/usr/bin/env bash` | same | yes |
| header comment | `.what`, `.why`, `.how` | same | yes |
| `set -euo pipefail` | yes | yes | yes |
| stdin read | `STDIN_INPUT=$(cat)` | same | yes |
| empty check | exit 2 + error | same | yes |
| jq parse | `jq -r '... // empty'` | same | yes |
| skip pattern | `exit 0` for non-match | same | yes |
| block pattern | stderr + `exit 2` | same | yes |
| emoji in block | yes | yes | yes |

all mechanisms now match extant patterns. no further inconsistencies found.
