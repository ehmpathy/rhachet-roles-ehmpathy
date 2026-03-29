# review: has-consistent-mechanisms (r3)

## deeper search

searched for shared utilities or common patterns:

```
grep STDIN_INPUT src/domain.roles/mechanic/inits/claude.hooks/*.sh
```

found 7 hooks all with the same inline pattern. there is no shared utility file.

**why this is correct**: hooks must be standalone shell scripts. they cannot import shared modules. each hook duplicates the stdin read pattern by necessity, not by oversight.

## line-by-line comparison

### stdin read pattern (lines 24-31 of my hook)

```bash
STDIN_INPUT=$(cat)
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

vs forbid-stderr-redirect.sh (lines 23-30):

```bash
STDIN_INPUT=$(cat)
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

**verdict**: exact match.

### jq extraction pattern (line 34 and 43 of my hook)

```bash
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
```

vs forbid-stderr-redirect.sh (line 34):

```bash
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
```

**verdict**: same pattern, different keys extracted.

### block message pattern (lines 47-56 of my hook)

```bash
{
  echo ""
  echo "🛑 BLOCKED: ..."
  echo ""
  echo "explanation"
  echo ""
} >&2
exit 2
```

vs forbid-stderr-redirect.sh (lines 43-53):

```bash
{
  echo ""
  echo "🛑 BLOCKED: ..."
  echo ""
  echo "explanation"
  echo ""
} >&2
exit 2
```

**verdict**: exact match.

## could I have used a shared utility?

**no**. shell hooks are standalone executables. bash has no module system. the only way to share code would be:
1. source a common file (adds dependency, breaks if file moves)
2. extract to a separate binary (adds complexity)

both are worse than inline duplication for simple hooks.

## conclusion

no duplicate mechanisms. the inline patterns are intentional and consistent with all 7 extant hooks.
