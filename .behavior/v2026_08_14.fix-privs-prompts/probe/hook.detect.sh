#!/usr/bin/env bash
# .what = probe hook — record which hook event fired, when, and for what tool_input
# .why  = prove whether a suspicious-classified permission prompt reaches a hook,
#         and whether an always-approve decision suppresses it
#
# reads the hook stdin json, appends one jsonl record to fired.log,
# and (for PermissionRequest) emits an always-approve decision.

DIR="${CLAUDE_PROJECT_DIR:-.}/.behavior/v2026_08_14.fix-privs-prompts/probe"
LOG="$DIR/fired.log"
mkdir -p "$DIR"

INPUT="$(cat)"
TS="$(date +%Y-%m-%dT%H:%M:%S.%N)"

EVENT="$(printf '%s' "$INPUT" | jq -r '.hook_event_name // "?"' 2>/dev/null || echo '?')"
TOOL="$(printf '%s' "$INPUT" | jq -r '.tool_name // "?"' 2>/dev/null || echo '?')"
MODE="$(printf '%s' "$INPUT" | jq -r '.permission_mode // "?"' 2>/dev/null || echo '?')"

# append one record; keep the raw tool_input for inspection
printf '%s' "$INPUT" \
  | jq -c --arg ts "$TS" --arg ev "$EVENT" --arg tool "$TOOL" --arg mode "$MODE" \
      '{ts:$ts, event:$ev, tool:$tool, mode:$mode, tool_input:.tool_input}' \
      >> "$LOG" 2>/dev/null \
  || printf '{"ts":"%s","event":"%s","tool":"%s","mode":"%s","raw":"parse-failed"}\n' \
       "$TS" "$EVENT" "$TOOL" "$MODE" >> "$LOG"

# for the permission seam, behavior is driven by probe/mode. the modes match the
# case branches below exactly (default = nested, the proven-good schema):
#   nested  (default) — emit the nested decision.behavior allow at once
#   flat              — emit the flat permissionDecision allow (proven-broken)
#   deprecated        — emit the legacy top-level decision:approve
#   both              — emit flat + nested together
#   logonly           — emit no output (negative control → escalate to a prompt)
#   slow              — sleep 3s, then emit the nested allow (race test for #12176)
if [ "$EVENT" = "PermissionRequest" ]; then
  PMODE="nested"
  [ -f "$DIR/mode" ] && PMODE="$(tr -d '[:space:]' < "$DIR/mode")"

  # record the effective decision mode alongside the event
  printf '{"ts":"%s","event":"PermissionRequest.decision","pmode":"%s"}\n' "$TS" "$PMODE" >> "$LOG"

  case "$PMODE" in
    logonly)
      : ;;  # emit no output → claude escalates to the normal prompt (negative control)
    flat)
      # candidate A: flat permissionDecision under hookSpecificOutput
      printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PermissionRequest","permissionDecision":"allow","permissionDecisionReason":"probe: flat allow"}}' ;;
    nested)
      # candidate B: nested decision.behavior under hookSpecificOutput
      printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"},"reasoning":"probe: nested allow"}}' ;;
    deprecated)
      # candidate C: legacy top-level decision:approve
      printf '%s\n' '{"decision":"approve","reason":"probe: deprecated approve"}' ;;
    both)
      # candidate D: emit both shapes at once
      printf '%s\n' '{"decision":"approve","reason":"probe: both","hookSpecificOutput":{"hookEventName":"PermissionRequest","permissionDecision":"allow","decision":{"behavior":"allow"}}}' ;;
    slow)
      # race test (#12176): sleep 3s then emit the PROVEN nested allow.
      # isolates race from schema — if the prompt still fires, it is the race.
      sleep 3
      printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"},"reasoning":"probe: slow nested allow after 3s"}}' ;;
    *)
      # default = nested (the proven-good schema)
      printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"},"reasoning":"probe: default nested allow"}}' ;;
  esac
fi

exit 0
