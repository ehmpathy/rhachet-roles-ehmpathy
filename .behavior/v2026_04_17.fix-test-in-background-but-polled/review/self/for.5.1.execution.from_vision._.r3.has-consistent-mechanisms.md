# self-review r3: has-consistent-mechanisms

re-examined by read extant hooks line-by-line.

## issue found: empty input handle

**what I found:**

extant hooks (`forbid-stderr-redirect.sh`, `forbid-suspicious-shell-syntax.sh`):
```bash
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

my hook (before fix):
```bash
if [[ -z "$STDIN_INPUT" ]]; then
  exit 0
fi
```

**inconsistency:** extant hooks exit 2 with error on empty input; my hook exited 0 silently.

**why this matters:** empty stdin is an error condition (malformed hook call). exit 2 surfaces the problem; exit 0 hides it.

**fix applied:**
- updated hook to exit 2 with error message on empty input
- updated test to expect exit code 2 for empty input

---

## mechanisms re-verified after fix

| mechanism | extant | ours | consistent |
|-----------|--------|------|------------|
| shebang | `#!/usr/bin/env bash` | same | yes |
| stdin read | `STDIN_INPUT=$(cat)` | same | yes |
| empty check | exit 2 + error msg | fixed | yes |
| jq parse | `jq -r '...'` | same | yes |
| exit codes | 0=allow, 2=block | same | yes |
| error format | emoji + explanation | same | yes |

all mechanisms now consistent with extant hooks.
