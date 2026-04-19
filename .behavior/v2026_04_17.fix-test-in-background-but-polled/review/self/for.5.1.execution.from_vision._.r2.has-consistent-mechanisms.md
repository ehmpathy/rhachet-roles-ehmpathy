# self-review: has-consistent-mechanisms

reviewed for duplication of extant functionality.

## mechanism 1: pretooluse hook pattern

**does codebase have this?** yes, many pretooluse hooks exist:
- `pretooluse.forbid-stderr-redirect.sh`
- `pretooluse.forbid-suspicious-shell-syntax.sh`
- `pretooluse.check-permissions.sh`

**do we duplicate?** no, we follow the same pattern:
- read stdin JSON
- extract tool_name and tool_input
- check conditions
- exit 0 to allow, exit 2 to block

**consistency check:**

| aspect | extant hooks | our hook |
|--------|--------------|----------|
| stdin read | `STDIN_INPUT=$(cat)` | same |
| json parse | `jq -r '.tool_input.command'` | same |
| exit codes | 0=allow, 2=block | same |
| error output | stderr with emoji | same |

**verdict:** consistent with extant patterns.

---

## mechanism 2: jq for JSON parse

**does codebase have this?** yes, all hooks use jq.

**do we duplicate?** no, we use the same approach:
```bash
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty')
```

**verdict:** consistent.

---

## mechanism 3: regex for command match

**does codebase have this?** yes, `pretooluse.forbid-suspicious-shell-syntax.sh` uses bash regex.

**do we duplicate?** no, we use the same `[[ "$CMD" =~ pattern ]]` approach.

**verdict:** consistent.

---

## mechanism 4: hook registration

**does codebase have this?** yes, hooks registered in `getMechanicRole.ts`.

**do we duplicate?** no, we add to the extant array.

**verdict:** consistent.

---

## summary

| mechanism | extant | ours | consistent |
|-----------|--------|------|------------|
| hook pattern | yes | follows | yes |
| jq parse | yes | same | yes |
| regex match | yes | same | yes |
| registration | yes | same | yes |

no new mechanisms introduced. all code follows extant patterns.
