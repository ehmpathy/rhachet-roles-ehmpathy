#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid special chars in sedreplace args
#
# .why  = special chars like { } ( ) [ ] trigger Claude Code's bash
#         safety heuristics and cause permission prompts. this hook
#         blocks direct args with these chars and guides the user to
#         use the @stdin pattern which bypasses heuristics.
#
# .how  = reads JSON from stdin, extracts tool_input.command,
#         checks if it's a sedreplace command with special chars
#         in --old or --new, and blocks if found.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   ✔ blocks sedreplace commands with special chars in args
#   ✔ guides user to @stdin pattern
#   ✔ allows simple patterns without special chars
#   ✔ allows @stdin patterns (they're already the solution)
######################################################################

set -euo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# Read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, stdin is empty
if [[ -z "$STDIN_INPUT" ]]; then
  echo "✋ ConstraintError: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# Extract tool_name from stdin JSON
# .why = a payload jq cannot parse blocks, loud. `|| echo ""` once read it as "not a Bash call"
#        and permitted it; once this read parses, the command read below sees valid json
# .note = jq writes naught to stderr on success, so `2>&1` leaves the name clean; on failure
#         the first line captured is jq's own complaint
if ! TOOL_NAME=$(jq -r '.tool_name // empty' <<< "$STDIN_INPUT" 2>&1); then
  payload_crash="💥 MalfunctionError: PreToolUse payload is not valid json (${TOOL_NAME%%$'\n'*}); the command stays blocked"
  printf '%s\n' "$payload_crash" || true
  printf '%s\n' "$payload_crash" >&2 || true
  exit 2
fi

# Skip if not a Bash tool
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

# Extract command from stdin JSON
# Claude passes: {"tool_name": "Bash", "tool_input": {"command": "..."}}
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# Skip if command is empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Skip if not a sedreplace command
if [[ "$COMMAND" != *"sedreplace"* ]]; then
  exit 0
fi

# Skip if already via @stdin pattern (that's the solution)
if [[ "$COMMAND" == *"@stdin"* ]]; then
  exit 0
fi

# the quoted value of one flag in the command: `--<flag> 'value'` or `--<flag> "value"`
# .note = named args `command=` `flag=`; sets the global FLAG_VALUE ("" when the flag is absent)
set_flag_value() {
  local command="" flag=""
  local "$@"
  local single_quoted="--${flag}[[:space:]]+'([^']*)'"
  local double_quoted="--${flag}[[:space:]]+\"([^\"]*)\""
  FLAG_VALUE=""
  [[ "$command" =~ $single_quoted ]] && FLAG_VALUE="${BASH_REMATCH[1]}" && return 0
  [[ "$command" =~ $double_quoted ]] && FLAG_VALUE="${BASH_REMATCH[1]}"
  return 0
}

# the three values the suggestion is built from; --glob too, so it runs against the same files
set_flag_value command="$COMMAND" flag=old
OLD_VAL="$FLAG_VALUE"
set_flag_value command="$COMMAND" flag=new
NEW_VAL="$FLAG_VALUE"
set_flag_value command="$COMMAND" flag=glob
GLOB_VAL="$FLAG_VALUE"

# quote a value as one single-quoted shell word
# .why = the suggestion is a command the bot runs as printed; a value that holds a `'`
#        (`toContain('BLOCKED')`) would close the quote mid-word and break it
# .note = sets the global QUOTED; each `'` becomes `'\''`
as_single_quoted() {
  local value="$1"
  QUOTED="'${value//\'/\'\\\'\'}'"
  return 0
}

# Check for special chars that trigger bash heuristics
# These chars cause permission prompts: { } ( ) [ ]

OLD_HAS_SPECIAL=false
NEW_HAS_SPECIAL=false

if [[ -n "$OLD_VAL" ]]; then
  if [[ "$OLD_VAL" == *'{'* ]] || [[ "$OLD_VAL" == *'}'* ]] || \
     [[ "$OLD_VAL" == *'('* ]] || [[ "$OLD_VAL" == *')'* ]] || \
     [[ "$OLD_VAL" == *'['* ]] || [[ "$OLD_VAL" == *']'* ]]; then
    OLD_HAS_SPECIAL=true
  fi
fi

if [[ -n "$NEW_VAL" ]]; then
  if [[ "$NEW_VAL" == *'{'* ]] || [[ "$NEW_VAL" == *'}'* ]] || \
     [[ "$NEW_VAL" == *'('* ]] || [[ "$NEW_VAL" == *')'* ]] || \
     [[ "$NEW_VAL" == *'['* ]] || [[ "$NEW_VAL" == *']'* ]]; then
    NEW_HAS_SPECIAL=true
  fi
fi

# If special chars found, block and guide to @stdin
if [[ "$OLD_HAS_SPECIAL" == "true" || "$NEW_HAS_SPECIAL" == "true" ]]; then
  # each value as one shell word; the glob the bot already chose, or a placeholder
  as_single_quoted "$OLD_VAL"
  OLD_QUOTED="$QUOTED"
  as_single_quoted "$NEW_VAL"
  NEW_QUOTED="$QUOTED"
  GLOB_QUOTED="'<glob>'"
  if [[ -n "$GLOB_VAL" ]]; then
    as_single_quoted "$GLOB_VAL"
    GLOB_QUOTED="$QUOTED"
  fi

  {
    echo ""
    echo "✋ ConstraintError: special chars in sedreplace args"
    echo ""
    echo "the pattern contains { } ( ) or [ ] which trigger bash safety prompts."
    echo ""
    echo "use @stdin pattern instead to bypass heuristics:"
    echo ""
    if [[ "$OLD_HAS_SPECIAL" == "true" && "$NEW_HAS_SPECIAL" == "true" ]]; then
      # both have special chars: two patterns on stdin, split by a NUL byte (sedreplace's form)
      echo "  printf '%s\\0%s' $OLD_QUOTED $NEW_QUOTED | rhx sedreplace --old @stdin --new @stdin --glob $GLOB_QUOTED"
    elif [[ "$OLD_HAS_SPECIAL" == "true" ]]; then
      # only old has special chars
      echo "  printf '%s' $OLD_QUOTED | rhx sedreplace --old @stdin --new $NEW_QUOTED --glob $GLOB_QUOTED"
    else
      # only new has special chars
      echo "  printf '%s' $NEW_QUOTED | rhx sedreplace --old $OLD_QUOTED --new @stdin --glob $GLOB_QUOTED"
    fi
    echo ""
  } >&2
  exit 2
fi

# Command is allowed
exit 0
