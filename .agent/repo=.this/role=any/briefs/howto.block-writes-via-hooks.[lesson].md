# howto: block writes via PreToolUse hooks

## .what

PreToolUse hooks can block Write/Edit operations by exiting with code 2 and outputting a message to stderr.

## .how

### exit codes

| code  | meaning                                            |
| ----- | -------------------------------------------------- |
| 0     | allow the operation                                |
| 2     | block the operation (stderr shown to Claude)       |
| other | non-blocking error (logged but operation proceeds) |

### blocking pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

# read input from stdin
STDIN_INPUT=$(cat)

# extract tool info
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.content // empty')

# skip if not Write
if [[ "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# check condition and block if needed
if [[ "$CONTENT" == *"forbidden"* ]]; then
  {
    echo ""
    echo "🔴 BLOCKED: forbidden content detected"
    echo ""
    echo "file: $FILE_PATH"
    echo ""
  } >&2
  exit 2
fi

# allow
exit 0
```

### HARDNUDGE pattern

block on first attempt, allow on retry within a time window:

```bash
#!/usr/bin/env bash
set -euo pipefail

HARDNUDGE_WINDOW_SECONDS=300  # 5 minutes

STDIN_INPUT=$(cat)

# extract command or content to check
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty')
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# find .claude directory
find_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

CLAUDE_DIR=$(find_claude_dir) || exit 0
NUDGE_FILE="$CLAUDE_DIR/my-hook.nudges.local.json"

# ensure nudge file exists
if [[ ! -f "$NUDGE_FILE" ]]; then
  echo '{}' > "$NUDGE_FILE"
fi

# check if recently attempted
now=$(date +%s)
last_attempt=$(jq -r --arg cmd "$COMMAND" '.[$cmd] // 0' "$NUDGE_FILE" 2>/dev/null || echo "0")
elapsed=$((now - last_attempt))

if [[ $elapsed -lt $HARDNUDGE_WINDOW_SECONDS ]]; then
  # within retry window, allow
  exit 0
fi

# first attempt - record and block
tmp_file=$(mktemp)
jq --arg cmd "$COMMAND" --argjson ts "$now" '. + {($cmd): $ts}' "$NUDGE_FILE" > "$tmp_file" && mv "$tmp_file" "$NUDGE_FILE"

{
  echo ""
  echo "BLOCKED: command not allowed"
  echo ""
  echo "if this is intentional, retry the same command."
  echo ""
} >&2
exit 2
```

### key points

1. **always output to stderr** (`>&2`) when blocking
2. **always exit 2** to signal blocking
3. **keep hooks simple** - complex bash features (associative arrays, process substitution) may cause issues
4. **fail fast** - if stdin is empty, exit 2 immediately

### stdin format

Claude Code passes JSON via stdin:

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  },
  "tool_use_id": "toolu_01ABC123...",
  "session_id": "abc123",
  "cwd": "/current/working/dir",
  "permission_mode": "default"
}
```

### registration

add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/your-hook.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## .see also

- howto.debug-hooks.[lesson].md
