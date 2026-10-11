#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to block suspicious shell syntax patterns
#
# .why  = harnesses like claude-code-cli parse shell commands to detect
#         potentially dangerous operations. when they see suspicious
#         syntax, they prompt the user for permission — even for safe
#         commands that just look suspicious.
#
#         these prompts interrupt the delegate (agent) mid-task, break
#         flow, and waste human attention on false positives.
#
#         this hook blocks suspicious patterns early with clear guidance,
#         so the delegate can fix the command before it triggers a
#         permission prompt.
#
#         patterns blocked:
#         - =() process substitution (zsh)
#         - <() and >() process substitution (bash)
#         - consecutive quotes at word start (parser confusion)
#
# .how  = reads JSON from stdin, extracts tool_input.command,
#         loads syntax.suspicious.jsonc, checks patterns, blocks with guidance.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks commands with suspicious shell metacharacters
#   - provides actionable alternatives from config
#   - prevents permission prompt interruptions to delegate
#   - fast: simple pattern match
######################################################################

set -euo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, exit with error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "✋ ConstraintError: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract command from stdin JSON
# Claude passes: {"tool_name": "Bash", "tool_input": {"command": "..."}}
# .why = a payload jq cannot parse blocks, loud. `|| echo ""` once read it as "not a Bash call"
#        and permitted it — this gate off for the one input class a caller can craft
# .note = jq writes naught to stderr on success, so `2>&1` leaves the command clean; on failure
#         the first line captured is jq's own complaint, so the cause costs no extra fork
if ! COMMAND=$(jq -r '.tool_input.command // empty' <<< "$STDIN_INPUT" 2>&1); then
  payload_crash="💥 MalfunctionError: PreToolUse payload is not valid json (${COMMAND%%$'\n'*}); the command stays blocked"
  printf '%s\n' "$payload_crash" || true
  printf '%s\n' "$payload_crash" >&2 || true
  exit 2
fi

# skip if not a Bash command or empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# find hook directory for config
# .note = ${x%/*} at zero forks; a bare "hook.sh" invocation falls back to "."
HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
CONFIG_FILE="$HOOK_DIR/syntax.suspicious.jsonc"

# skip if no config
if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

# read the config: sets PATTERNS_JSON (the `.patterns` list), or PATTERNS_CAUSE on failure
# .why = a parse failure once read as "no patterns" and exited 0 — the whole gate off, with no
#        word. an ABSENT config is the one quiet off switch (above); a malformed one blocks, loud
# .note = jq writes naught to stderr on success, so `2>&1` leaves the list clean; on failure the
#         last line captured is jq's own complaint, so the cause costs no extra fork
set_syntax_patterns() {
  local file="${1#file=}"
  PATTERNS_JSON=$(sed 's|^[[:space:]]*//.*$||' "$file" \
    | jq -c '(.patterns // []) | if type == "array" then . else error(".patterns is not a list") end' 2>&1) \
    && return 0
  PATTERNS_CAUSE="${PATTERNS_JSON##*$'\n'}"
  return 1
}
if ! set_syntax_patterns file="$CONFIG_FILE"; then
  {
    echo ""
    echo "💥 MalfunctionError: the suspicious-syntax config could not be parsed ($PATTERNS_CAUSE)"
    echo ""
    echo "config: $CONFIG_FILE"
    echo ""
    echo "fix: repair the json in syntax.suspicious.jsonc — or delete the file to turn this"
    echo "     gate off on purpose."
    echo ""
  } >&2
  exit 2
fi

# skip if no patterns
if [[ "$PATTERNS_JSON" == "[]" ]]; then
  exit 0
fi

# helper: check if pattern appears unquoted in command
appears_unquoted() {
  local cmd="$1"
  local pattern="$2"
  local in_single=false
  local in_double=false
  local i=0
  local len=${#cmd}
  local plen=${#pattern}

  while [[ $i -lt $len ]]; do
    local char="${cmd:$i:1}"

    # toggle quote state
    # .note = each toggle is an in-shell test; a `$( … )` here forked once per quote char
    if [[ "$char" == "'" && "$in_double" == false ]]; then
      [[ "$in_single" == true ]] && in_single=false || in_single=true
      ((i++))
      continue
    fi
    if [[ "$char" == '"' && "$in_single" == false ]]; then
      [[ "$in_double" == true ]] && in_double=false || in_double=true
      ((i++))
      continue
    fi

    # check for pattern match outside quotes
    if [[ "$in_single" == false && "$in_double" == false ]]; then
      if [[ "${cmd:$i:$plen}" == "$pattern" ]]; then
        return 0  # found unquoted
      fi
    fi

    ((i++))
  done

  return 1  # not found unquoted
}

# helper: check if pattern appears outside single quotes
# (double quotes still execute, so they don't count as safe)
# 🔴 .note = double quotes are TRACKED, though they do not make a pattern safe: a `'` inside a
#            double-quoted span is a literal apostrophe, never a quote. a single-quote-only
#            scan read `"it's a test" $(rm -rf ~)` as an open single-quoted span, skipped the
#            `$(`, and let the substitution through. both kinds are tracked; only single
#            quotes shield the pattern.
appears_executable() {
  local cmd="$1"
  local pattern="$2"
  local in_single=false
  local in_double=false
  local i=0
  local len=${#cmd}
  local plen=${#pattern}

  while [[ $i -lt $len ]]; do
    local char="${cmd:$i:1}"

    # toggle quote state; a quote char of one kind is literal inside the other kind
    if [[ "$char" == "'" && "$in_double" == false ]]; then
      [[ "$in_single" == true ]] && in_single=false || in_single=true
      ((i++))
      continue
    fi
    if [[ "$char" == '"' && "$in_single" == false ]]; then
      [[ "$in_double" == true ]] && in_double=false || in_double=true
      ((i++))
      continue
    fi

    # check for pattern match outside single quotes
    if [[ "$in_single" == false ]]; then
      if [[ "${cmd:$i:$plen}" == "$pattern" ]]; then
        return 0  # found executable
      fi
    fi

    ((i++))
  done

  return 1  # not found executable
}

# one row per pattern: index, match, type, message, why — joined by the unit separator (0x1f)
# .why = ONE jq pass emits every pattern; the prior loop forked four jq execs per pattern
#        (9 patterns ⇒ 37 execs) on every Bash call, clean or not. 0x1f appears in no pattern
# .note = -r prints raw strings, so a regex backslash reaches bash unescaped (an @tsv pass
#         would double it and change what the regex matches). sets PATTERN_ROWS
set_syntax_pattern_rows() {
  PATTERN_ROWS=$(echo "$PATTERNS_JSON" \
    | jq -r 'to_entries[] | [(.key | tostring), .value.match, .value.type, .value.message, .value.why] | join("\u001f")')
  return 0
}

# does the command trip this pattern?
# .note = named args `type=` `match=`; reads the global COMMAND
is_pattern_detected() {
  local type="" match=""
  local "$@"
  case "$type" in
    unquoted) appears_unquoted "$COMMAND" "$match" ;;
    # executes in double quotes; only single quotes make it literal
    executable) appears_executable "$COMMAND" "$match" ;;
    # at a word start: start of command, or after whitespace
    regex_word_start) [[ "$COMMAND" =~ (^|[[:space:]])($match) ]] ;;
    # anywhere in the command
    regex) [[ "$COMMAND" =~ $match ]] ;;
    *) return 1 ;;
  esac
}

# the block render for one tripped pattern: the class, the reason, the alternatives
# .note = named args `index=` `message=` `why=`; reads the global PATTERNS_JSON
print_syntax_block() {
  local index="" message="" why=""
  local "$@"
  local alt_list
  alt_list=$(echo "$PATTERNS_JSON" | jq -r ".[$index].alt[]" | sed 's/^/  - /')
  {
    echo ""
    echo "✋ ConstraintError: ${message}."
    echo ""
    echo "${why^}; harness asks for permission, which interrupts the delegation."
    echo ""
    echo "Alternatives:"
    echo "$alt_list"
    echo ""
  } >&2
}

# block on the first pattern the command trips; return 0 when none does
# .note = reads PATTERN_ROWS: one `\x1f`-joined row per pattern — index, match, type, message, why
run_syntax_gate() {
  local index match type message why
  while IFS=$'\x1f' read -r index match type message why; do
    is_pattern_detected type="$type" match="$match" || continue
    print_syntax_block index="$index" message="$message" why="$why"
    exit 2
  done <<< "$PATTERN_ROWS"
  return 0
}

# block on the first tripped pattern; else the command is allowed
set_syntax_pattern_rows
run_syntax_gate
exit 0
