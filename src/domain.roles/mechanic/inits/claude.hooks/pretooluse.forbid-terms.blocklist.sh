#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid terms from a configurable blocklist
#
# .why  = certain terms are overloaded or vague and degrade precision.
#         this hook blocks Write and Edit operations that contain
#         blocklisted terms, via the HARDNUDGE pattern (block first,
#         allow retry).
#
# .how  = reads JSON from stdin, extracts content from Write/Edit,
#         loads terms.blocklist.jsonc, scans for matches, blocks
#         on first attempt but allows retry within 5 minutes.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks blocklisted terms on first attempt
#   - allows retry within 5 min window (HARDNUDGE)
#   - shows why term is forbidden and alternatives
######################################################################

set -euo pipefail

# config
HARDNUDGE_WINDOW_SECONDS=300  # 5 minutes
STALE_THRESHOLD_SECONDS=3600  # 1 hour

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract tool name
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# skip if not Write or Edit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# extract file path
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

# extract content to scan based on tool type
if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null || echo "")
else
  # Edit: only scan new_string (additions, not removals)
  CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null || echo "")
fi

# skip if no content
if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# find hook directory for blocklist config
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOCKLIST_FILE="$HOOK_DIR/terms.blocklist.jsonc"

# skip if no blocklist config
if [[ ! -f "$BLOCKLIST_FILE" ]]; then
  exit 0
fi

# load blocklist config (strip comments, parse JSON)
TERMS_JSON=$(sed 's|//.*||' "$BLOCKLIST_FILE" | jq -c '.terms // []' 2>/dev/null || echo "[]")

# skip if no terms
if [[ "$TERMS_JSON" == "[]" ]]; then
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

CLAUDE_DIR=$(find_claude_dir) || {
  mkdir -p "$PWD/.claude"
  CLAUDE_DIR="$PWD/.claude"
}

NUDGE_FILE="$CLAUDE_DIR/terms.blocklist.nudges.local.json"

# ensure nudge file exists
if [[ ! -f "$NUDGE_FILE" ]]; then
  echo '{}' > "$NUDGE_FILE"
fi

# cleanup stale entries (older than 1 hour)
# nudge format: { hash: { time, path, terms } }
NOW=$(date +%s)
TMP_FILE=$(mktemp)
jq --argjson now "$NOW" --argjson threshold "$STALE_THRESHOLD_SECONDS" \
  'to_entries | map(select(.value.time > ($now - $threshold))) | from_entries' \
  "$NUDGE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" || rm -f "$TMP_FILE"

# detect matching terms
DETECTED_TERMS=""
DETECTED_INFO=""
term_count=$(echo "$TERMS_JSON" | jq 'length')
for ((i=0; i<term_count; i++)); do
  TERM=$(echo "$TERMS_JSON" | jq -r ".[$i].term")
  WHY=$(echo "$TERMS_JSON" | jq -r ".[$i].why")
  ALT=$(echo "$TERMS_JSON" | jq -r ".[$i].alt | join(\", \")")

  # case-insensitive word boundary match
  if echo "$CONTENT" | grep -iqE "\\b${TERM}\\b"; then
    if [[ -n "$DETECTED_TERMS" ]]; then
      DETECTED_TERMS="${DETECTED_TERMS},\"${TERM}\""
    else
      DETECTED_TERMS="\"${TERM}\""
    fi
    DETECTED_INFO="${DETECTED_INFO}  ⛔ ${TERM}\n    why: ${WHY}\n    alt: ${ALT}\n"
  fi
done

# if no terms detected, allow
if [[ -z "$DETECTED_TERMS" ]]; then
  exit 0
fi

# build nudge key as hash of file_path
NUDGE_KEY=$(echo -n "${FILE_PATH}" | sha256sum | cut -d' ' -f1)

# check last attempt time (nudge format: { hash: { time, path, terms } })
LAST_ATTEMPT=$(jq -r --arg key "$NUDGE_KEY" '.[$key].time // 0' "$NUDGE_FILE" 2>/dev/null || echo "0")
elapsed=$((NOW - LAST_ATTEMPT))

if [[ $elapsed -lt $HARDNUDGE_WINDOW_SECONDS ]]; then
  # within retry window, allow
  exit 0
fi

# first attempt - record and block
TMP_FILE=$(mktemp)
jq --arg key "$NUDGE_KEY" --argjson time "$NOW" --arg path "$FILE_PATH" --argjson terms "[${DETECTED_TERMS}]" \
  '. + {($key): {time: $time, path: $path, terms: $terms}}' \
  "$NUDGE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" || rm -f "$TMP_FILE"

# build block message
{
  echo ""
  echo "🛑 BLOCKED: forbidden term(s) detected in file write"
  echo ""
  echo "file: $FILE_PATH"
  echo ""
  echo "detected terms:"
  echo -e "$DETECTED_INFO"
  echo "see rule.forbid.term-* briefs for rationale."
  echo ""
  echo "if this is intentional and absolutely unavoidable, retry the same operation."
  echo ""
} >&2

exit 2
