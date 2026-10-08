#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook that nudges a blocked command toward the
#         paved command the caller most likely meant
#
# .why  = a bot that runs an un-paved command needs to know what to run
#         instead, not a dump of every allowlist pattern. this hook names
#         each blocked part, offers its paved alternatives (from
#         commands.alternatives.jsonc), ranks the nearest allowlist
#         patterns (typo- and fzf-tolerant), caps the list at 21, and
#         pushes the bot to pave a reusable rhx skill where no path fits.
#         each block and each bust-through lands in an append-only ledger,
#         so demand for paved paths accrues instead of evaporates.
#
# .how  = reads json from stdin (per Claude Code docs), extracts
#         tool_input.command, checks every part of it against the allow
#         patterns of settings.json + settings.local.json (unioned).
#         the allow path is unchanged and fast; all rank work runs only
#         on the block path.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# flags:
#   --mode HARDNUDGE  (default) blocks the first attempt (exit 2); a retry
#                     of the exact command within the window is handed to
#                     the human via permissionDecision "ask", with a reason
#   --mode SOFTNUDGE  prints the same nudge to stdout, exit 0, no block
#   --mode LOOKUP     read-only lookup for `rhx permissions.get --for`: prints the
#                     verdict and every candidate (no cap), exit 0, never records
#   --window N        seconds within which a retry counts (default 60)
#
# guarantee:
#   ✔ allowed commands exit 0 silently, before any rank runs
#   ✔ every un-paved part is named in one render
#   ✔ at most 21 candidates across all parts
#   ✔ a malfunction on the block path still blocks (exit 2)
#   ✔ a ledger failure never turns a retry into a block
#
# relies on:
#   - pretooluse.forbid-suspicious-shell-syntax.sh blocks `$(…)`, backticks, and
#     redirection on every Bash call. this hook splits only on | && || ; and
#     matches a prefix with a plain string compare, so it never checks a command
#     nested inside `$(…)`: `echo $(curl …)` reads as `echo …`. if that other
#     gate is ever removed or narrowed, this gate needs a nested-command check
######################################################################

set -euo pipefail

# a write to a reader that has gone away must fail as an error, never kill the hook
# .why = SIGPIPE would end the shell with 141 before any `exit 2` runs, and claude code reads
#        every code except 2 as "permitted" — the gate would fail open on a closed stream
trap '' PIPE

# load the shared render + read operations (frame, tree, .claude walk, allowlist filter)
# .note = loaded ahead of the EXIT trap, which calls print_to_both. an absent lib cannot use
#         the lib's own printer, so it reports with bare printf on both streams, then exits 2:
#         claude code reads any other exit as a permit, so the gate holds
RENDER_LIB="${BASH_SOURCE[0]%/*}"
[[ "$RENDER_LIB" == "${BASH_SOURCE[0]}" ]] && RENDER_LIB="."
RENDER_LIB="$RENDER_LIB/_permissions.render.lib.sh"
# shellcheck source=_permissions.render.lib.sh
source "$RENDER_LIB" 2>/dev/null || {
  render_lib_crash="💥 MalfunctionError: check-permissions could not load $RENDER_LIB; the command stays blocked — reinstall the mechanic role"
  printf '%s\n' "$render_lib_crash" || true
  printf '%s\n' "$render_lib_crash" >&2 || true
  exit 2
}

# failfast timeout (seconds) for the allow check
FAILFAST_TIMEOUT=4

# the candidate search budget (seconds) on the block path; past it, a part is left unranked
# 🔴 .note = the allow check (≤4s) plus the search (≤3s, overshot by one part at most) must end
#            well inside the hook's registered timeout (10s). a hook the harness kills never
#            reaches its EXIT trap, and claude code reads a killed PreToolUse hook as a permit —
#            so a search that scaled with the part count would open the gate on a long compound
RANK_TIMEOUT=3

# 🔴 whole-hook deadlines (seconds since the hook started), so phases that each fit their own
#    budget cannot stack past the 10s kill: the search stops at RANK_DEADLINE, the nudge-record
#    lock gives up at LOCK_DEADLINE. what follows the lock is one jq, one mv, and one append
# .note = printf %()T reads the clock in-shell, at zero forks
printf -v HOOK_STARTED_AT '%(%s)T' -1
RANK_DEADLINE=5
LOCK_DEADLINE=7

# has the hook run past a whole-hook deadline?
# .note = named arg `deadline=` (seconds since HOOK_STARTED_AT)
is_past_hook_deadline() {
  local deadline=""
  local "$@"
  local now
  printf -v now '%(%s)T' -1
  [[ $(( now - HOOK_STARTED_AT )) -ge $deadline ]]
}

# the most raw chars of a part one ledger row keeps (bounds ledger growth per block)
LEDGER_PART_CAP=1024

# .note = print_to_both (exit-2 output only; the exit-0 ask payload stays pure json on stdout)
#         and print_framed come from _permissions.render.lib.sh

# fail closed on any unexpected exit, from the first line to the last
# .why = claude code reads every exit code except 2 as "permitted". a bash runtime error
#        anywhere (bad subscript, unbound var, a failed command under set -e) exits
#        nonzero, which would silently OPEN the gate — on the allow check as much as on
#        the block path.
# .note = 0 (allowed, SOFTNUDGE, the ask hand-off) and 2 (the block) are the only
#         deliberate exits; every other code is converted to a named malfunction + exit 2
# what a crash means for the caller, per mode
# .why = a block or an advisory holds back a command, so "stays blocked" is true there; a LOOKUP
#        (`rhx permissions.get --for`) never runs a command, so it is told its question went
#        unanswered instead
# .note = named arg `mode=`; sets the global CRASH_CONSEQUENCE
as_crash_consequence() {
  local mode=""
  local "$@"
  CRASH_CONSEQUENCE="the command stays blocked — retry once"
  [[ "$mode" == "LOOKUP" ]] && CRASH_CONSEQUENCE="the lookup has no answer — run it again"
  return 0
}
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then as_crash_consequence mode="${MODE:-HARDNUDGE}"; print_to_both "💥 MalfunctionError: check-permissions hook crashed (exit $hook_exit); $CRASH_CONSEQUENCE; if it recurs, report the defect to the ehmpathy mechanic role repo"; exit 2; fi' EXIT

# the usage, for --help
print_usage() {
  echo "check-permissions — PreToolUse hook that nudges a blocked command toward the paved one"
  echo ""
  echo "usage:"
  echo "  pretooluse.check-permissions.sh [--mode HARDNUDGE|SOFTNUDGE|LOOKUP] [--window <seconds>]"
  echo "  (reads the claude code PreToolUse payload on stdin)"
  echo ""
  echo "flags:"
  echo "  --mode HARDNUDGE   block the first attempt (exit 2); a retry within the window"
  echo "                     goes to the human via permissionDecision \"ask\"   (default)"
  echo "  --mode SOFTNUDGE   print the nudge on stdout and exit 0; never block, never record"
  echo "  --mode LOOKUP      print the verdict and every candidate (no cap); exit 0, never record"
  echo "                     (the engine behind \`rhx permissions.get --for\`)"
  echo "  --window <n>       seconds within which a retry counts                (default: 60)"
  echo "  --help, -h         print this usage"
  echo ""
  echo "example:"
  echo "  echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls src\"}}' | pretooluse.check-permissions.sh"
  return 0
}

# is the --mode value one the hook knows?
# .why = a mistyped mode must not silently arm the blocked path
is_valid_mode() {
  [[ "$1" == "HARDNUDGE" || "$1" == "SOFTNUDGE" || "$1" == "LOOKUP" ]]
}

# is the --window value whole seconds?
# .why = a non-number would read as 0 in arithmetic and silently close the retry window
is_valid_window() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

# parse flags
# .note = an unknown flag is a registration defect: named loud, and the gate holds (exit 2),
#         never a silent shift that runs the hook with a flag it ignored
MODE="HARDNUDGE"
HARDNUDGE_WINDOW_SECONDS=60
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      if ! is_valid_mode "$MODE"; then
        print_to_both "💥 MalfunctionError: check-permissions hook got --mode '$MODE' — expected HARDNUDGE, SOFTNUDGE, or LOOKUP; the command stays blocked; fix the hook registration in .claude/settings.json (see --help)"
        exit 2
      fi
      shift 2
      ;;
    --window)
      HARDNUDGE_WINDOW_SECONDS="${2:-}"
      if ! is_valid_window "$HARDNUDGE_WINDOW_SECONDS"; then
        print_to_both "💥 MalfunctionError: check-permissions hook got --window '$HARDNUDGE_WINDOW_SECONDS' — expected whole seconds; the command stays blocked; fix the hook registration in .claude/settings.json (see --help)"
        exit 2
      fi
      shift 2
      ;;
    --help | -h)
      # usage wears the same blank-line frame as every other render
      print_framed "$(print_usage)"
      exit 0
      ;;
    *)
      print_to_both "💥 MalfunctionError: check-permissions hook got an unknown flag: $1 — the command stays blocked; fix the hook registration in .claude/settings.json (see --help)"
      exit 2
      ;;
  esac
done

# the candidate cap across all blocked parts, derived once from the parsed mode
# .why = one site sets it, after the mode is known, so no later read can see a pre-parse value
# .note = named arg `mode=`; sets the global CANDIDATE_CAP. a block or advisory shows at most
#         21 (the wish's cap); a LOOKUP shows every candidate (`rhx permissions.get --for`)
as_candidate_cap() {
  local mode=""
  local "$@"
  CANDIDATE_CAP=21
  [[ "$mode" == "LOOKUP" ]] && CANDIDATE_CAP=100000
  return 0
}
as_candidate_cap mode="$MODE"

# read json from stdin (Claude Code passes input via stdin, not env var)
STDIN_INPUT=$(cat)

# failfast: no input means the harness misbehaved; block so the gate holds
if [[ -z "$STDIN_INPUT" ]]; then
  print_to_both "💥 MalfunctionError: PreToolUse hook received no input via stdin — the command stays blocked; retry the call (the harness sent no payload)"
  exit 2
fi

# the Bash command a PreToolUse payload carries (empty for a non-Bash tool)
# .note = named arg `payload=`; sets the global COMMAND. returns nonzero, with jq's first
#         error line in PAYLOAD_ERROR, when the payload is not valid json
get_payload_command() {
  local payload=""
  local "$@"
  local out
  PAYLOAD_ERROR=""
  if ! out=$(echo "$payload" | jq -r '.tool_input.command // empty' 2>&1); then
    PAYLOAD_ERROR="${out%%$'\n'*}"
    return 1
  fi
  COMMAND="$out"
  return 0
}

# extract the command from the payload
# .note = a payload jq cannot parse is a harness malfunction: it blocks, never permits.
#         a valid payload with no command (a non-Bash tool) still passes below
COMMAND=""
if ! get_payload_command payload="$STDIN_INPUT"; then
  print_to_both "💥 MalfunctionError: PreToolUse payload is not valid json ($PAYLOAD_ERROR) — the command stays blocked; retry the call (the harness sent a malformed payload)"
  exit 2
fi

# skip if not a Bash command or empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# .note = get_claude_dir (the upward walk for .claude, at zero forks) comes from
#         _permissions.render.lib.sh

# the header a LOOKUP render opens with: the lookup the caller ran
# .note = named arg `command=`; sets the global LOOKUP_HEADER
get_lookup_header() {
  local command=""
  local "$@"
  as_shell_quoted text="${command//$'\n'/ }"
  LOOKUP_HEADER="🐚 permissions.get --for $SHELL_QUOTED"
  return 0
}

# one shell word that holds the text verbatim, in single quotes
# .why = the hint hands the bot a command to copy; it must paste and run as-is
# .note = named arg `text=`; sets the global SHELL_QUOTED
as_shell_quoted() {
  local text=""
  local "$@"
  SHELL_QUOTED="'${text//\'/\'\\\'\'}'"
  return 0
}

# no .claude directory => no allowlist to enforce
# .note = a LOOKUP says so, since the caller asked a question
CLAUDE_DIR=$(get_claude_dir) || {
  if [[ "$MODE" == "LOOKUP" ]]; then
    get_lookup_header command="$COMMAND"
    print_framed "$LOOKUP_HEADER" "   └─ verdict: no .claude/ dir found from $PWD upward — no allowlist applies here"
  fi
  exit 0
}

# the jq program that reads a settings file's Bash patterns is BASH_PATTERNS_FILTER, from
# _permissions.render.lib.sh — patterns look like: "Bash(npm run test:*)" -> "npm run test:*"
# .note = one program for the allow path and the malfunction probe, so any file the allow
#         path cannot read (bad syntax OR a bad shape, like `"allow": "Bash(ls)"`) is also
#         one the probe names — and the same program the permissions.get skill reads with

# extract Bash permissions from a settings file
# .note = quiet on purpose: this runs on every Bash call, and a file it cannot read fails
#         closed (its commands block). get_settings_malfunction runs the same program on the
#         block path and names the file there
get_bash_patterns() {
  local file="$1"
  if [[ -f "$file" ]]; then
    jq -r "$BASH_PATTERNS_FILTER" "$file" 2>/dev/null
  fi
}

# union allowlists from settings.json and settings.local.json
# .why = adhoc human-granted allows land in settings.local.json
mapfile -t ALLOWED_PATTERNS < <(
  {
    get_bash_patterns "$CLAUDE_DIR/settings.json"
    get_bash_patterns "$CLAUDE_DIR/settings.local.json"
  } | sort -u
)

# .note = the named-arg convention: a procedure declares its keys (`local key=""`), then
#         `local "$@"` binds the call's `key=value` pairs. a mistyped key at a call site
#         binds a stray local and leaves the declared default in place, with no error —
#         check each call's keys against the callee's `local` line when you edit either

# sort each allowlist pattern into its lookup: `cmd:*` is a prefix (stored as `cmd`),
# all else is an exact match
# .note = fills the globals EXACT_PATTERNS and PREFIX_PATTERNS from ALLOWED_PATTERNS
declare -A EXACT_PATTERNS=()
declare -a PREFIX_PATTERNS=()
set_pattern_lookups() {
  local pattern
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if [[ "$pattern" == *":*" ]]; then
      PREFIX_PATTERNS+=("${pattern%:*}")
      continue
    fi
    EXACT_PATTERNS["$pattern"]=1
  done
  return 0
}
set_pattern_lookups

# does the command match a `prefix:*` pattern, without a cut through a word? (no subshells)
# .why = `Bash(rhx:*)` paves `rhx foo`, never `rhxploit` (a different binary): a bare char
#        prefix let a lookalike name through the gate, and in a session whose permission mode
#        auto-runs what the gate permits, that ran an un-paved binary with no prompt.
#        but `:*` matches any suffix that does not extend the last word — `npm run test:*`
#        paves `npm run test:unit` (the colon starts a new token), and a prefix that ends in
#        a non-word char (`MESSAGE=`) paves any suffix
match_prefix() {
  local cmd="$1"
  local prefix="$2"
  [[ "$cmd" == "$prefix"* ]] || return 1
  [[ "$cmd" == "$prefix" ]] && return 0
  [[ "$prefix" == *[^[:alnum:]_] ]] && return 0
  [[ "${cmd:${#prefix}:1}" != [[:alnum:]_] ]]
}

# check if a single command matches ANY allowed pattern
command_is_allowed() {
  local cmd="$1"

  # trim lead/trail whitespace (pure bash, no subshell)
  while [[ "$cmd" == [[:space:]]* ]]; do cmd="${cmd#?}"; done
  while [[ "$cmd" == *[[:space:]] ]]; do cmd="${cmd%?}"; done

  # empty commands are allowed (e.g., post &&)
  if [[ -z "$cmd" ]]; then
    return 0
  fi

  # collapse newlines to spaces for match
  cmd="${cmd//$'\n'/ }"

  # O(1) exact match via hash lookup
  if [[ -n "${EXACT_PATTERNS[$cmd]+x}" ]]; then
    return 0
  fi

  # O(n) prefix match, no subshells
  for prefix in "${PREFIX_PATTERNS[@]}"; do
    if match_prefix "$cmd" "$prefix"; then
      return 0
    fi
  done

  return 1
}

# split compound command on &&, ||, |, ; (quotes preserved)
# returns newline-separated list of commands
split_compound_command() {
  local input="$1"
  local result=""
  local current=""
  local in_single_quote=false
  local in_double_quote=false
  local i=0
  local len=${#input}

  while [[ $i -lt $len ]]; do
    local char="${input:$i:1}"
    local next_char="${input:$((i+1)):1}"

    # a backslash outside single quotes escapes the next char, as bash reads it: so `\"`
    # inside a double-quoted span neither closes the span nor splits the part
    if [[ "$char" == '\' && "$in_single_quote" == false ]]; then
      current+="$char$next_char"
      ((i+=2))
      continue
    fi

    # track quotes
    # .note = each toggle is an in-shell test; a `$( … )` here forked once per quote char
    if [[ "$char" == "'" && "$in_double_quote" == false ]]; then
      [[ "$in_single_quote" == true ]] && in_single_quote=false || in_single_quote=true
      current+="$char"
      ((i++))
      continue
    fi

    if [[ "$char" == '"' && "$in_single_quote" == false ]]; then
      [[ "$in_double_quote" == true ]] && in_double_quote=false || in_double_quote=true
      current+="$char"
      ((i++))
      continue
    fi

    # split only outside quotes
    if [[ "$in_single_quote" == false && "$in_double_quote" == false ]]; then
      # && or ||
      if [[ "$char" == "&" && "$next_char" == "&" ]] || [[ "$char" == "|" && "$next_char" == "|" ]]; then
        if [[ -n "$result" ]]; then
          result+=$'\n'
        fi
        result+="$current"
        current=""
        ((i+=2))
        continue
      fi

      # single pipe | (after the || check, so || is not split twice)
      if [[ "$char" == "|" && "$next_char" != "|" ]]; then
        if [[ -n "$result" ]]; then
          result+=$'\n'
        fi
        result+="$current"
        current=""
        ((i++))
        continue
      fi

      # ;
      if [[ "$char" == ";" ]]; then
        if [[ -n "$result" ]]; then
          result+=$'\n'
        fi
        result+="$current"
        current=""
        ((i++))
        continue
      fi
    fi

    current+="$char"
    ((i++))
  done

  # add final command
  if [[ -n "$result" ]]; then
    result+=$'\n'
  fi
  result+="$current"

  echo "$result"
}

# collect EVERY part of the command that is not allowed
# .why = name all blocked parts in one render, so the bot fixes them in one pass
#        rather than meet one block per part
# .note = prints one `blocked:<part>` line per blocked part, or the bare sentinel
#         __ALL_ALLOWED__ when every part is allowed, or the bare __FAILFAST_TIMEOUT__.
#         the `blocked:` prefix keeps data and sentinel apart: a command whose text IS a
#         sentinel word still prints `blocked:__ALL_ALLOWED__`, never the bare word.
#         it always returns 0: the answer is in the words, never the exit code, so a
#         crash (a nonzero exit) can never be mistaken for "allowed" — it fails the
#         caller's assignment, and the EXIT trap turns that into a block
get_blocked_parts() {
  local command=""
  local "$@"
  local cmd="$command"
  local parts
  local part
  local found=1

  # start the failfast budget here, not at process start
  # .why = $SECONDS counts from bash startup, so the stdin read, the claude-dir search, and
  #        the settings parse were charged to the budget. under host load those alone
  #        crossed it, and a trivial allowed command timed out (a false block). the budget
  #        bounds the check — the split and the per-part match — and only the check
  SECONDS=0

  # collapse newlines to spaces (pure bash)
  cmd="${cmd//$'\n'/ }"

  # split command into parts
  parts=$(split_compound_command "$cmd")

  # check each part
  while IFS= read -r part; do
    # trim whitespace (pure bash, no subshell)
    while [[ "$part" == [[:space:]]* ]]; do part="${part#?}"; done
    while [[ "$part" == *[[:space:]] ]]; do part="${part%?}"; done

    # skip empty parts
    [[ -z "$part" ]] && continue

    # failfast timeout check
    if [[ $SECONDS -ge $FAILFAST_TIMEOUT ]]; then
      echo "__FAILFAST_TIMEOUT__"
      return 0
    fi

    if ! command_is_allowed "$part"; then
      echo "blocked:$part"
      found=0
    fi
  done <<< "$parts"

  [[ $found -eq 1 ]] && echo "__ALL_ALLOWED__"
  return 0
}

# was every part allowed?
# .note = named arg `output=` (get_blocked_parts' words). the all-allowed sentinel is the
#         whole output; a blocked part always carries `blocked:`, so it can never match
is_all_allowed() {
  local output=""
  local "$@"
  [[ "$output" == "__ALL_ALLOWED__" ]]
}

# did the allow check run out of time?
# .note = named arg `output=` (get_blocked_parts' words). the sentinel is a whole line of
#         its own; a blocked part always carries `blocked:`, so it can never match
is_timeout_output() {
  local output=""
  local "$@"
  [[ $'\n'"$output"$'\n' == *$'\n'"__FAILFAST_TIMEOUT__"$'\n'* ]]
}

# the blocked parts, from get_blocked_parts' words, with the `blocked:` prefix dropped
# .note = named arg `output=`; sets the global array BLOCKED_PARTS
set_blocked_parts() {
  local output=""
  local "$@"
  mapfile -t BLOCKED_PARTS <<< "$output"
  BLOCKED_PARTS=("${BLOCKED_PARTS[@]#blocked:}")
  return 0
}

# every part allowed => silent pass (the fast path; no rank work)
# .note = no `|| exit 0` here: a crash inside the check must block, never pass
BLOCKED_OUTPUT=$(get_blocked_parts command="$COMMAND")
if is_all_allowed output="$BLOCKED_OUTPUT"; then
  # a LOOKUP says so; a PreToolUse pass stays silent
  if [[ "$MODE" == "LOOKUP" ]]; then
    get_lookup_header command="$COMMAND"
    print_framed "$LOOKUP_HEADER" "   └─ verdict: pre-approved — every part matches the allowlist; it runs with no prompt"
  fi
  exit 0
fi

# the allow check ran out of time => fail closed
# .note = a LOOKUP is told its question went unanswered; a block or advisory holds the command
if is_timeout_output output="$BLOCKED_OUTPUT"; then
  TIMEOUT_CONSEQUENCE="the command stays blocked; retry"
  [[ "$MODE" == "LOOKUP" ]] && TIMEOUT_CONSEQUENCE="the lookup has no answer; run it again"
  print_to_both "💥 MalfunctionError: permission check exceeded ${FAILFAST_TIMEOUT}s timeout — $TIMEOUT_CONSEQUENCE, or split a very long compound into shorter calls"
  exit 2
fi

set_blocked_parts output="$BLOCKED_OUTPUT"

######################################################################
# block path — all code below runs only when some part is not paved
######################################################################

# the dir that holds a file path (`.` for a bare file name)
# .note = sets the global PARENT_DIR
as_parent_dir() {
  PARENT_DIR="${1%/*}"
  [[ "$PARENT_DIR" == "$1" ]] && PARENT_DIR="."
  return 0
}

# the repo root that holds a `.claude/` dir
# .note = sets the global REPO_ROOT
as_repo_root() {
  REPO_ROOT="${1%/.claude}"
  return 0
}

# the hook's own dir, for the inventory file
as_parent_dir "${BASH_SOURCE[0]}"
INVENTORY_FILE="$PARENT_DIR/commands.alternatives.jsonc"

# the ledger lives in the repo's gitignored cache, beside .claude/
# .note = the ledger sits beside the .claude/ whose allowlist judged the command, so a row and
#         its verdict always share one root. the role registers this hook in the repo's own
#         .claude/settings.json, so the walk lands on the repo; a .claude above it (~/.claude)
#         is reached only by a user-level registration, whose ledger then lives under that root
as_repo_root "$CLAUDE_DIR"
LEDGER_DIR="$REPO_ROOT/.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions"
LEDGER_FILE="$LEDGER_DIR/nudges.jsonl"

# load the inventory once: one line per head, "head<rs>alt1<us>alt2...<rs>advice"
# (rs = ascii record separator \x1e, us = ascii unit separator \x1f)
# .why = one jq exec for the whole inventory; lookups after are pure bash
# .note = fields split on the ascii record separator, never on tab: tab is whitespace to
#         `read`, so an empty alternatives field between two tabs collapses and shifts the
#         advice into the alternatives slot
# .note = an absent or unparseable inventory is a malfunction; it is surfaced in the
#         render and the block still holds (exit 2)
# .note = named arg `file=`; fills INVENTORY_ALTS, INVENTORY_ADVICE, INVENTORY_MALFUNCTION
declare -A INVENTORY_ALTS=()
declare -A INVENTORY_ADVICE=()
INVENTORY_MALFUNCTION=""
set_inventory_lookups() {
  local file=""
  local "$@"
  local lines inv_head inv_alts inv_advice
  if [[ ! -f "$file" ]]; then
    INVENTORY_MALFUNCTION="inventory file absent: commands.alternatives.jsonc"
    return 0
  fi

  # jq's stderr joins its stdout here: on success it is empty; on failure it is the
  # parse error, which names the defect and is kept in the malfunction line
  # .note = only whole-line comments are stripped, so a `//` inside a value survives
  if ! lines=$(
    sed 's|^[[:space:]]*//.*$||' "$file" \
      | jq -r '.entries[] as $e
               | $e.heads[]
               | [., (($e.alternatives // []) | join("\u001f")), ($e.advice // "")]
               | join("\u001e")' 2>&1
  ); then
    INVENTORY_MALFUNCTION="inventory file unparseable: commands.alternatives.jsonc (${lines%%$'\n'*})"
    return 0
  fi

  # one lookup entry per head
  while IFS=$'\x1e' read -r inv_head inv_alts inv_advice; do
    [[ -z "$inv_head" ]] && continue
    INVENTORY_ALTS["$inv_head"]="$inv_alts"
    INVENTORY_ADVICE["$inv_head"]="$inv_advice"
  done <<< "$lines"
  return 0
}
set_inventory_lookups file="$INVENTORY_FILE"

# an unreadable settings file empties the allowlist, so every command blocks; name it
# .why = without this, a malformed settings.json reads as "no paved path fits" and pushes
#        the bot to pave a skill, when the true cause is a broken allowlist
# .note = checked here, on the block path only, so the allow path gains no fork
# .note = named arg `claude_dir=`; sets SETTINGS_MALFUNCTION (empty when all parse)
SETTINGS_MALFUNCTION=""
get_settings_malfunction() {
  local claude_dir=""
  local "$@"
  local settings_file settings_err
  for settings_file in "$claude_dir/settings.json" "$claude_dir/settings.local.json"; do
    [[ -f "$settings_file" ]] || continue
    # the allow path's own program, never a syntax-only check: a valid-json file of the
    # wrong shape must be named too
    settings_err=$(jq -r "$BASH_PATTERNS_FILTER" "$settings_file" 2>&1 >/dev/null) && continue

    # name the file and the first line of jq's complaint, then append them to the list
    local settings_name="${settings_file##*/}"
    local settings_err_first="${settings_err%%$'\n'*}"
    SETTINGS_MALFUNCTION+="${SETTINGS_MALFUNCTION:+; }$settings_name ($settings_err_first)"
  done
  return 0
}
get_settings_malfunction claude_dir="$CLAUDE_DIR"

# split a part into words, with any lead VAR=value assignments and shell keywords dropped
# .why = `WAVE=1 npm test` must key on `npm test`, not on `WAVE=1`; and the `;` split hands a
#        loop body over as `do tail -4 f`, which must key on `tail`, not on `do`
# .note = sets the global array PART_WORDS, and PART_KEYWORD_DROPPED (1 when a shell keyword
#         was dropped)
as_part_words() {
  local part="$1"
  local -a words=()
  read -ra words <<< "$part"
  PART_KEYWORD_DROPPED=0
  while [[ ${#words[@]} -gt 0 ]]; do
    if [[ "${words[0]}" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      words=("${words[@]:1}")
      continue
    fi
    case "${words[0]}" in
      do | then | else | elif | if | while | until | '!' | '{' | '(')
        words=("${words[@]:1}")
        PART_KEYWORD_DROPPED=1
        continue
        ;;
    esac
    break
  done
  PART_WORDS=("${words[@]}")
}

# is the part shell grammar rather than a command? (`for r in a b`, `done`, `fi`, `esac`)
# .why = a loop header or closer has no command to pave; rank it and it reads as a novel
#        command, and the nudge pushes the bot to pave `done`
# .note = reads PART_WORDS and PART_KEYWORD_DROPPED (after as_part_words). an empty list is
#         grammar only when a keyword emptied it (`else`, `then`); a bare `VAR=value` part is
#         empty too, and stays novel
is_shell_grammar_part() {
  # no words left: grammar if a keyword emptied the part, else a bare `VAR=value` (novel)
  if [[ ${#PART_WORDS[@]} -eq 0 ]]; then
    [[ $PART_KEYWORD_DROPPED -eq 1 ]] && return 0
    return 1
  fi

  # words left: grammar if the lead word opens or closes a shell construct
  case "${PART_WORDS[0]}" in
    for | select | case | done | fi | esac | '}' | ')') return 0 ;;
  esac
  return 1
}

# the part's words with the global flags after the head dropped, in two views
# .why = `git -C . log` must rank `[p] git log`: a flag between the head and the subcommand
#        shifts every later word one slot right, so no shared lead word ever lines up
# .note = which flags take a value is per-command, so two views are built: one where a flag
#         takes the next bare word as its value (`-C .`, `--prefix dir`), one where it takes
#         none (`--no-pager`). a `--x=value` word is one word in both. the rank alone reads
#         these views — the allow check never does, so a flag still blocks
# .note = sets FLAGLESS_VALUED / FLAGLESS_BARE (empty when the second word is no flag) and
#         FLAGS_VALUED / FLAGS_BARE (the dropped words, space-joined, for the advice line)
set_flagless_words() {
  FLAGLESS_VALUED=() FLAGLESS_BARE=() FLAGS_VALUED="" FLAGS_BARE=""
  [[ "${PART_WORDS[1]:-}" == -* ]] || return 0
  local n=${#PART_WORDS[@]} k

  # the valued view: a flag with no `=` takes the next bare word as its value
  k=1
  while [[ $k -lt $n && "${PART_WORDS[k]}" == -* ]]; do
    if [[ "${PART_WORDS[k]}" != *=* && $(( k + 1 )) -lt $n && "${PART_WORDS[k+1]}" != -* ]]; then
      k=$(( k + 2 ))
      continue
    fi
    k=$(( k + 1 ))
  done
  FLAGLESS_VALUED=("${PART_WORDS[0]}" "${PART_WORDS[@]:k}")
  FLAGS_VALUED="${PART_WORDS[*]:1:k-1}"

  # the bare view: each flag is one word
  k=1
  while [[ $k -lt $n && "${PART_WORDS[k]}" == -* ]]; do k=$(( k + 1 )); done
  FLAGLESS_BARE=("${PART_WORDS[0]}" "${PART_WORDS[@]:k}")
  FLAGS_BARE="${PART_WORDS[*]:1:k-1}"
  return 0
}

# how many lead words a pattern shares with a word list
# .note = named arg `list=` (the name of a global array); sets SHARED_LEAD; reads PATTERN_WORDS
get_shared_lead() {
  local list=""
  local "$@"
  local -n lead_list="$list"
  SHARED_LEAD=0
  while [[ $SHARED_LEAD -lt ${#PATTERN_WORDS[@]} && $SHARED_LEAD -lt ${#lead_list[@]} \
    && "${PATTERN_WORDS[SHARED_LEAD]}" == "${lead_list[SHARED_LEAD]}" ]]; do
    SHARED_LEAD=$(( SHARED_LEAD + 1 ))
  done
  return 0
}

# optimal string alignment distance, capped: 3 means "more than 2"
# .why = typo tolerance; an adjacent swap costs 1, so `gti` sits 1 from `git`
# .note = named args `word=` and `target=`; sets the global OSA_DISTANCE; pure bash, no forks
get_osa_distance() {
  local word="" target=""
  local "$@"
  local a="$word" b="$target"
  local la=${#a} lb=${#b}
  local diff=$(( la > lb ? la - lb : lb - la ))
  if [[ $diff -gt 2 ]]; then
    OSA_DISTANCE=3
    return 0
  fi
  local -a d=()
  local i j cost w=$(( lb + 1 ))
  for (( i = 0; i <= la; i = i + 1 )); do d[i*w]=$i; done
  for (( j = 0; j <= lb; j = j + 1 )); do d[j]=$j; done
  for (( i = 1; i <= la; i = i + 1 )); do
    for (( j = 1; j <= lb; j = j + 1 )); do
      cost=1
      [[ "${a:i-1:1}" == "${b:j-1:1}" ]] && cost=0
      local del=$(( d[(i-1)*w+j] + 1 ))
      local ins=$(( d[i*w+j-1] + 1 ))
      local sub=$(( d[(i-1)*w+j-1] + cost ))
      local best=$del
      [[ $ins -lt $best ]] && best=$ins
      [[ $sub -lt $best ]] && best=$sub
      if [[ $i -gt 1 && $j -gt 1 && "${a:i-1:1}" == "${b:j-2:1}" && "${a:i-2:1}" == "${b:j-1:1}" ]]; then
        local swap=$(( d[(i-2)*w+j-2] + 1 ))
        [[ $swap -lt $best ]] && best=$swap
      fi
      d[i*w+j]=$best
    done
  done
  OSA_DISTANCE=${d[la*w+lb]}
  [[ $OSA_DISTANCE -gt 3 ]] && OSA_DISTANCE=3
  return 0
}

# how many edits a word may carry and still count as a typo
# .why = 2 edits on a 3-letter word rewrites two-thirds of it (`git` → `cat`); so short
#        words allow 1 edit, longer words 2
# .note = named arg `word=`; sets the global MAX_EDITS
get_max_edits() {
  local word=""
  local "$@"
  MAX_EDITS=2
  [[ ${#word} -le 4 ]] && MAX_EDITS=1
  return 0
}

# is every letter of the needle found in order within the haystack? (fzf-style)
# .note = named args `needle=` and `haystack=`
is_subsequence() {
  local needle="" haystack=""
  local "$@"
  local hay="$haystack"
  local i=0 j=0
  while [[ $i -lt ${#needle} && $j -lt ${#hay} ]]; do
    [[ "${needle:i:1}" == "${hay:j:1}" ]] && i=$(( i + 1 ))
    j=$(( j + 1 ))
  done
  [[ $i -eq ${#needle} ]]
}

# look up a part's inventory entry: the longest head first (three words, two, one)
# .note = sets INVENTORY_HEAD (empty when absent)
get_inventory_head() {
  INVENTORY_HEAD=""
  local h1="${PART_WORDS[0]:-}"

  # a part of only `VAR=value` has no head; an empty key is a bad subscript
  [[ -z "$h1" ]] && return 0

  local h2="${PART_WORDS[0]:-} ${PART_WORDS[1]:-}"
  local h3="${PART_WORDS[0]:-} ${PART_WORDS[1]:-} ${PART_WORDS[2]:-}"
  if [[ -n "${INVENTORY_ALTS[$h3]+x}" ]]; then INVENTORY_HEAD="$h3"; return 0; fi
  if [[ -n "${INVENTORY_ALTS[$h2]+x}" ]]; then INVENTORY_HEAD="$h2"; return 0; fi
  if [[ -n "${INVENTORY_ALTS[$h1]+x}" ]]; then INVENTORY_HEAD="$h1"; return 0; fi
  return 0
}

# rank the allowlist against a part's words
# .what = score each pattern; keep those that match a tier; order by score
# .tiers =
#   - shared word prefix (same head): +100 per shared lead word
#   - the next word within its edit budget (after a shared prefix): +50
#   - head within its edit budget of a pattern head (heads ≥ 3 letters): +100 - 30 × distance
#   the edit budget is 1 for words of ≤ 4 letters, 2 for longer (get_max_edits), taken from
#   the shorter of the two heads
#   - head letters in order within a pattern word, fzf-style (heads ≥ 4 letters, and only for a
#     head the inventory does not know): +30
#   - ≥ 2 part words found among a pattern's dot-segments (`git commit` → `git.commit.set`): +40 each
#   - later tokens shared with the pattern: +20 each; ≥ 2 alone qualifies
#   a head under 3 letters skips the typo tier: an edit budget reaches almost any short word
#   the shared-lead tiers also read the part with its global flags dropped (set_flagless_words),
#   and keep whichever view shares the most lead words
# .note = sets the global array RANK_HITS (display strings, best first), and RANK_FLAGS — the
#         flags the best hit needed dropped (empty when it matched the part as written)
get_ranked_hits() {
  RANK_HITS=()
  RANK_FLAGS=""
  local -a scored=()
  local h1="${PART_WORDS[0]:-}"

  # a part of only `VAR=value` has no head to rank
  [[ -z "$h1" ]] && return 0

  # the flag-skipped views, built once per part
  set_flagless_words
  local -A flags_by_disp=()

  local -a qw=() qw_cmd=()
  local pat base disp s k score matched t w tw len_gap lead_flags lead_view next_word
  local -A later_tokens=()
  for (( k = 1; k < ${#PART_WORDS[@]}; k = k + 1 )); do later_tokens["${PART_WORDS[k]}"]=1; done
  local -A part_tokens=()
  for (( k = 0; k < ${#PART_WORDS[@]}; k = k + 1 )); do part_tokens["${PART_WORDS[k]}"]=1; done

  local idx=0
  for pat in "${ALLOWED_PATTERNS[@]}"; do
    idx=$(( idx + 1 ))
    base="${pat%:\*}"
    disp="[e] $base"
    [[ "$pat" == *":*" ]] && disp="[p] $base"
    read -ra qw <<< "$base"
    [[ ${#qw[@]} -eq 0 ]] && continue

    # the command words: those before the first flag or quoted token
    # .why = the fzf and segment tiers must match a command name, never an argument value:
    #        `sort` is an in-order subsequence of `'path://src/domain.operations/surfer'`,
    #        which would rank an unrelated exact pattern as "did you mean?"
    qw_cmd=()
    for w in "${qw[@]}"; do
      [[ "$w" == -* || "$w" == \'* || "$w" == \"* ]] && break
      qw_cmd+=("$w")
    done

    score=0
    matched=0

    # shared lead words: the part as written, or a flag-skipped view if it shares more
    # .note = the part as written counts inline (no call): this runs once per pattern on every
    #         block, so only a part with a lead flag pays for the views below
    s=0
    while [[ $s -lt ${#qw[@]} && $s -lt ${#PART_WORDS[@]} && "${qw[s]}" == "${PART_WORDS[s]}" ]]; do
      s=$(( s + 1 ))
    done
    lead_flags=""
    lead_view=""
    if [[ ${#FLAGLESS_VALUED[@]} -gt 0 ]]; then
      PATTERN_WORDS=("${qw[@]}")
      get_shared_lead list=FLAGLESS_VALUED
      if [[ $SHARED_LEAD -gt $s ]]; then
        s=$SHARED_LEAD
        lead_view="valued"
        lead_flags="$FLAGS_VALUED"
      fi
      get_shared_lead list=FLAGLESS_BARE
      if [[ $SHARED_LEAD -gt $s ]]; then
        s=$SHARED_LEAD
        lead_view="bare"
        lead_flags="$FLAGS_BARE"
      fi
    fi

    # the word after the shared lead, in whichever view won (the typo check reads it)
    next_word="${PART_WORDS[s]:-}"
    [[ "$lead_view" == "valued" ]] && next_word="${FLAGLESS_VALUED[s]:-}"
    [[ "$lead_view" == "bare" ]] && next_word="${FLAGLESS_BARE[s]:-}"

    if [[ $s -gt 0 ]]; then
      score=$(( score + 100 * s ))
      # a shared lead word counts only when it signals intent:
      # - the pattern is wholly that prefix (e.g. `[e] jq`), or
      # - two or more lead words are shared (e.g. `npm run`), or
      # - the next word is within 2 edits (e.g. `git stash` near `git status`)
      # .why = one shared `git` would otherwise rank every git pattern — noise, not intent
      [[ $s -eq ${#qw[@]} || $s -ge 2 ]] && matched=1
      if [[ $s -lt ${#qw[@]} && ${#next_word} -ge 3 ]]; then
        get_osa_distance word="$next_word" target="${qw[s]}"
        get_max_edits word="$next_word"
        if [[ $OSA_DISTANCE -le $MAX_EDITS ]]; then
          score=$(( score + 50 ))
          matched=1
        fi
      fi
    fi

    # head typo or fzf match (no shared head)
    if [[ $s -eq 0 && ${#h1} -ge 3 ]]; then
      # a length gap past the edit budget cannot be a typo; skip the distance call
      # .why = the budget is the shorter word's: `chmod` is 2 edits from `cmd`, but two
      #        deletions erase 40% of `chmod` — a short word fits within a long word's budget
      #        by accident, never by a slip of the fingers
      OSA_DISTANCE=3
      len_gap=$(( ${#h1} - ${#qw[0]} ))
      [[ $len_gap -lt 0 ]] && len_gap=$(( -len_gap ))
      local typo_basis="$h1"
      [[ ${#qw[0]} -lt ${#h1} ]] && typo_basis="${qw[0]}"
      get_max_edits word="$typo_basis"
      [[ $len_gap -le $MAX_EDITS ]] && get_osa_distance word="$h1" target="${qw[0]}"
      if [[ $OSA_DISTANCE -le $MAX_EDITS ]]; then
        matched=1
        score=$(( score + 100 - 30 * OSA_DISTANCE ))
      fi
      # fzf tier: needs ≥ 4 letters; a 3-letter subsequence (g…i…t) fits almost any word
      # .note = skipped for a head the inventory knows: `grep` is a real tool the bot meant, not
      #         a slip, so its letters in order across `git.repo.test` (g·it, r·e·p·o) are a
      #         coincidence — they ranked 19 `git.repo.test` rows under a plain grep. a slip like
      #         `rpotst` (no inventory entry) still finds `git.repo.test`
      if [[ $matched -eq 0 && ${#h1} -ge 4 && -z "$INVENTORY_HEAD" ]]; then
        for w in "${qw_cmd[@]}"; do
          if [[ ${#w} -ge ${#h1} ]] && is_subsequence needle="$h1" haystack="$w"; then
            matched=1
            score=$(( score + 30 ))
            break
          fi
        done
      fi
    fi

    # segment tier: the part's words found among the pattern's dot-segments
    # .why = `git commit` means `rhx git.commit.set` — both words are segments of the
    #        skill name, a stronger signal than any single shared word
    # .note = runs only for a pattern with a dot, and splits by parameter expansion
    #         (no read, no subshell): it runs once per pattern on every block
    if [[ "$base" == *.* ]]; then
      local seg_seen=" " seg_count=0 rest seg
      for w in "${qw_cmd[@]}"; do
        [[ "$w" == *.* ]] || continue
        rest="$w."
        while [[ -n "$rest" ]]; do
          seg="${rest%%.*}"
          rest="${rest#*.}"
          if [[ -n "$seg" && -n "${part_tokens[$seg]+x}" && "$seg_seen" != *" $seg "* ]]; then
            seg_seen+="$seg "
            seg_count=$(( seg_count + 1 ))
          fi
        done
      done
      if [[ $seg_count -ge 2 ]]; then
        matched=1
        score=$(( score + 40 * seg_count ))
      fi
    fi

    # later tokens shared
    t=0
    for (( k = 1; k < ${#qw[@]}; k = k + 1 )); do
      tw="${qw[k]}"
      [[ -n "${later_tokens[$tw]+x}" ]] && t=$(( t + 1 ))
    done
    score=$(( score + 20 * t ))
    [[ $t -ge 2 ]] && matched=1

    [[ $matched -eq 1 ]] && scored+=("$score"$'\t'"$idx"$'\t'"$disp")
    [[ $matched -eq 1 && -n "$lead_flags" ]] && flags_by_disp["$disp"]="$lead_flags"
  done

  # order best first; a tie keeps the union's order, which `sort -u` made alphabetical
  # .note = so a tie never depends on how a human ordered settings.json, or which of the two
  #         settings files a row came from — the render is stable for one allowlist set
  [[ ${#scored[@]} -eq 0 ]] && return 0
  mapfile -t RANK_HITS < <(printf '%s\n' "${scored[@]}" | sort -t $'\t' -k1,1nr -k2,2n | cut -f3)

  # the flags the best hit needed dropped, for the part's advice line
  RANK_FLAGS="${flags_by_disp[${RANK_HITS[0]}]:-}"
  return 0
}

# rank the part, inside the search budget only
# .note = sets RANK_HITS, RANK_FLAGS, and RANK_SKIPPED (1 = the budget ran out, no search made).
#         SECONDS restarts just before the analysis loop, so the budget bounds the search alone
set_ranked_hits_in_budget() {
  RANK_HITS=()
  RANK_FLAGS=""
  RANK_SKIPPED=1
  [[ $SECONDS -ge $RANK_TIMEOUT ]] && return 0
  is_past_hook_deadline deadline="$RANK_DEADLINE" && return 0
  RANK_SKIPPED=0
  get_ranked_hits
}

# append one blocked part's analysis to the PART_* arrays (one index per part)
# .what = kind (alt | typo | novel), display head, inventory alternatives + advice,
#         and the ranked hits, each stored as one field
# .note = alternatives and hits are stored joined by the ascii unit separator (\x1f);
#         as_first_field reads them back, so no caller decodes the join
declare -a PART_TEXT=() PART_HEAD=() PART_KIND=() PART_ALTS=() PART_ADVICE=() PART_HITS=()
set_blocked_part_row() {
  local part=""
  local "$@"
  as_part_words "$part"

  # shell grammar has no command to rank or pave: one honest kind, no candidates
  if is_shell_grammar_part; then
    local -a grammar_words=()
    read -ra grammar_words <<< "$part"
    PART_TEXT+=("$part")
    PART_HEAD+=("${grammar_words[0]:-$part}")
    PART_KIND+=("grammar")
    PART_ALTS+=("")
    PART_ADVICE+=("")
    PART_HITS+=("")
    return 0
  fi

  get_inventory_head
  set_ranked_hits_in_budget

  # kind: an inventory entry wins; else any ranked hit makes it a typo; else novel — or
  # unranked, when the search budget ran out before this part (never read as "none fit")
  local kind="novel" head_display="${PART_WORDS[0]:-$part}"
  [[ $RANK_SKIPPED -eq 1 ]] && kind="unranked"
  [[ ${#RANK_HITS[@]} -gt 0 ]] && kind="typo"
  [[ -n "$INVENTORY_HEAD" ]] && kind="alt"
  [[ -n "$INVENTORY_HEAD" ]] && head_display="$INVENTORY_HEAD"

  # an empty key is a bad subscript for an associative array, so look up only on a hit
  local part_alts="" part_advice=""
  if [[ -n "$INVENTORY_HEAD" ]]; then
    part_alts="${INVENTORY_ALTS[$INVENTORY_HEAD]}"
    part_advice="${INVENTORY_ADVICE[$INVENTORY_HEAD]}"
  fi

  # the best hit fit only once the flags were dropped: say so, or the `[p]` row reads as a
  # match the part already makes
  if [[ -z "$part_advice" && -n "$RANK_FLAGS" ]]; then
    part_advice="\`$RANK_FLAGS\` sits before the subcommand, so no paved prefix fits as written — drop it (for a dir flag like \`-C <dir>\`, run from that dir)"
  fi

  # store the hits as one joined field
  local hits_joined="" hit
  for hit in "${RANK_HITS[@]}"; do hits_joined+="$hit"$'\x1f'; done

  PART_TEXT+=("$part")
  PART_HEAD+=("$head_display")
  PART_KIND+=("$kind")
  PART_ALTS+=("$part_alts")
  PART_ADVICE+=("$part_advice")
  PART_HITS+=("$hits_joined")
  return 0
}

# the first item of a \x1f-joined field (empty when the field is empty)
as_first_field() {
  FIRST_FIELD="${1%%$'\x1f'*}"
  return 0
}

# analyze each blocked part, inside the search budget
# .note = the allow check ran in a subshell, so its SECONDS reset never reached this shell
SECONDS=0
for part in "${BLOCKED_PARTS[@]}"; do
  [[ -z "$part" ]] && continue
  set_blocked_part_row part="$part"
done

# append one ledger row per blocked part
# .why = accrue demand for paved paths; append-only jsonl never rewrites a row
# .how = the rows are serialized first, then appended one printf per row to an O_APPEND
#        file: two clones that block at once interleave whole rows at worst, not a torn line
# .note = named arg `verdict=nudged|retried`. returns nonzero when the rows could not be
#         written, with the cause in LEDGER_ERROR (the first line of the mkdir / jq /
#         append error); callers name it
LEDGER_ERROR=""
set_ledger_rows() {
  local verdict=""
  local "$@"
  local at
  # stamp in UTC: printf %()T formats in the local zone; the TZ prefix scopes UTC to this
  # one printf and leaves the process zone untouched
  TZ=UTC printf -v at '%(%Y-%m-%dT%H:%M:%SZ)T' -1

  # create the ledger dir; keep the cause if it fails
  local mkdir_err
  if ! mkdir_err=$(mkdir -p "$LEDGER_DIR" 2>&1); then
    LEDGER_ERROR="${mkdir_err%%$'\n'*}"
    return 1
  fi

  # serialize every row; keep jq's cause if it fails
  # .note = the part is capped at LEDGER_PART_CAP chars, so one pasted heredoc cannot bloat
  #         the ledger; the cap bounds raw chars, not the json-escaped bytes
  # .note = a grammar part (`fi`, `done`) is no command, so no demand: it writes no row
  local i rows part_capped
  if ! rows=$(
    {
      for i in "${!PART_TEXT[@]}"; do
        [[ "${PART_KIND[i]}" == "grammar" ]] && continue
        part_capped="${PART_TEXT[i]:0:LEDGER_PART_CAP}"
        printf '%s\t%s\t%s\t%s\t%s\n' "$at" "${part_capped//$'\t'/ }" "${PART_HEAD[i]}" "${PART_KIND[i]}" "$verdict"
      done
    } | jq -Rc 'split("\t") | {at: .[0], part: .[1], head: .[2], kind: .[3], verdict: .[4]}' 2>&1
  ); then
    LEDGER_ERROR="${rows%%$'\n'*}"
    return 1
  fi

  # every part was grammar: no row to append (a here-string of naught would append a blank line)
  [[ -z "$rows" ]] && return 0

  # append one row per printf; keep the redirect's cause if it fails
  # .why = each printf flushes one row to an O_APPEND file, and each write lands at the
  #        file's end: rows of two clones may interleave, but a row of typical size is one
  #        write. a whole-block printf would mix every row into one buffer of any size
  local append_err row
  # each row's write is checked: one failed row fails the whole append, so a partial append
  # never reads as a whole one
  if ! append_err=$({ while IFS= read -r row; do printf '%s\n' "$row" || exit 1; done <<< "$rows" >> "$LEDGER_FILE"; } 2>&1); then
    LEDGER_ERROR="${append_err%%$'\n'*}"
    [[ -z "$LEDGER_ERROR" ]] && LEDGER_ERROR="append to $LEDGER_FILE failed"
    return 1
  fi
  return 0
}

# the ranked hits of a part, minus any the inventory already offered
# .why = `[p] rhx grepsafe` beside `rhx grepsafe --pattern …` names one command twice
# .note = named args `alts=` and `hits=` (each a \x1f-joined field);
#         sets the global array FRESH_HITS
set_fresh_hits() {
  local alts="" hits=""
  local "$@"
  FRESH_HITS=()
  local -a alt_list=() hit_list=()
  [[ -n "$alts" ]] && IFS=$'\x1f' read -ra alt_list <<< "$alts"
  [[ -n "$hits" ]] && IFS=$'\x1f' read -ra hit_list <<< "$hits"
  local hit hit_base alt_hit dup
  for hit in "${hit_list[@]}"; do
    [[ -z "$hit" ]] && continue
    hit_base="${hit#\[?\] }"
    dup=0
    for alt_hit in "${alt_list[@]}"; do
      [[ -n "$alt_hit" && "$alt_hit" == "$hit_base"* ]] && dup=1
    done
    [[ $dup -eq 0 ]] && FRESH_HITS+=("$hit")
  done
  return 0
}

# each part's share of the candidate cap, rounded up so the cap is always reachable
# .note = named args `cap=` and `parts=`; sets the global PER_PART_BUDGET
as_per_part_budget() {
  local cap=0 parts=1
  local "$@"
  PER_PART_BUDGET=$(( (cap + parts - 1) / parts ))
  return 0
}

# each part's candidate budget: its fair share, then the shares light parts leave unused
# .why = a fixed ceil(cap / parts) split starved a rich part beside a light one — `cd foo &&
#        <a head with 25 near misses>` showed 11 for the rich part while the `cd` part, advice
#        only, used none of its 11. the cap still bounds the total; only the split moves.
# .how = pass 1 counts each part's demand (inventory alternatives + fresh rank hits). each part
#        first takes min(demand, fair share). the cap left unused then goes, in part order, to
#        the parts whose demand exceeds their share. a part never gets more than it can show.
# .note = sets the global array PART_BUDGET; a symmetric compound (every part at or above its
#         share) gets exactly the fixed split, so its render does not move
set_part_budgets() {
  local nparts=${#PART_TEXT[@]}
  local i j demand spare extra
  local -a demands=()
  PART_BUDGET=()
  as_per_part_budget cap="$CANDIDATE_CAP" parts="$nparts"
  spare=$CANDIDATE_CAP
  for i in "${!PART_TEXT[@]}"; do
    demand=0
    set_field_list field="${PART_ALTS[i]}"
    for j in "${FIELD_LIST[@]}"; do [[ -n "$j" ]] && demand=$(( demand + 1 )); done
    set_fresh_hits alts="${PART_ALTS[i]}" hits="${PART_HITS[i]}"
    demand=$(( demand + ${#FRESH_HITS[@]} ))
    demands[i]=$demand
    PART_BUDGET[i]=$(( demand < PER_PART_BUDGET ? demand : PER_PART_BUDGET ))
    spare=$(( spare - PART_BUDGET[i] ))
  done
  for i in "${!PART_TEXT[@]}"; do
    [[ $spare -le 0 ]] && break
    extra=$(( demands[i] - PART_BUDGET[i] ))
    [[ $extra -le 0 ]] && continue
    [[ $extra -gt $spare ]] && extra=$spare
    PART_BUDGET[i]=$(( PART_BUDGET[i] + extra ))
    spare=$(( spare - extra ))
  done
  return 0
}

# a `\x1f`-joined field, split into its items (an empty field yields none)
# .note = named arg `field=`; sets the global array FIELD_LIST
set_field_list() {
  local field=""
  local "$@"
  FIELD_LIST=()
  [[ -n "$field" ]] && IFS=$'\x1f' read -ra FIELD_LIST <<< "$field"
  return 0
}

# how many parts a command splits into, paved or not
# .note = named arg `command=`; sets the global COMPOUND_PART_COUNT. newlines read as spaces,
#         as the split of the blocked parts reads them
set_compound_part_count() {
  local command=""
  local "$@"
  COMPOUND_PART_COUNT=$(split_compound_command "${command//$'\n'/ }" | grep -c . || true)
  return 0
}

# render the nudge into the OUT array
# .note = the header differs per mode; the body is shared
get_nudge_lines() {
  local header=""
  local "$@"
  OUT=()
  local nparts=${#PART_TEXT[@]}
  set_part_budgets
  local shown_total=0 hidden_total=0
  local any_hits=0 i j line

  # the tree's top-level entries, all peers at one depth. each entry is a label line, then
  # zero or more item lines that render as its children, newline-joined. an empty entry is a
  # `│` spacer between sections. the loop at the end adds the trunk
  local -a ENTRIES=()

  # a broken settings or inventory file qualifies every line below, so it leads
  # .why = the tree after it may read "no paved path" only because the inventory is unreadable;
  #        a caveat printed last is read after the reader already acted on the false claim
  # a LOOKUP states its verdict first, as its pre-approved answer does
  [[ "$MODE" == "LOOKUP" ]] && ENTRIES+=("verdict: not pre-approved — it would block; each blocked part and its options follow")

  local infra_malfunctions
  infra_malfunctions=$(print_malfunction_lines)
  if [[ -n "$infra_malfunctions" ]]; then
    while IFS= read -r line; do ENTRIES+=("$line"); done <<< "$infra_malfunctions"
  fi

  for i in "${!PART_TEXT[@]}"; do
    local kind="${PART_KIND[i]}"
    local -a alts=() groups=()
    set_field_list field="${PART_ALTS[i]}"
    alts=("${FIELD_LIST[@]}")

    # a spacer before each part's section, then the part's own line
    [[ ${#ENTRIES[@]} -gt 0 ]] && ENTRIES+=("")
    ENTRIES+=("blocked: ${PART_TEXT[i]}")

    # budget for this part, within the global cap
    local budget=${PART_BUDGET[i]}
    local left=$(( CANDIDATE_CAP - shown_total ))
    [[ $left -lt $budget ]] && budget=$left
    local used=0

    # each group = a label line, then its item lines, newline-joined; a lone line has no items
    # advice first (not a candidate; no budget)
    [[ -n "${PART_ADVICE[i]}" ]] && groups+=("${PART_ADVICE[i]}")

    # paved alternatives from the inventory
    if [[ ${#alts[@]} -gt 0 ]]; then
      local group="paved alternatives for \`${PART_HEAD[i]}\`"
      for j in "${alts[@]}"; do
        [[ -z "$j" ]] && continue
        if [[ $used -ge $budget ]]; then
          hidden_total=$(( hidden_total + 1 ))
          continue
        fi
        group+=$'\n'"$j"
        used=$(( used + 1 ))
      done
      groups+=("$group")
    fi

    # nearest paved patterns from the rank, minus any the inventory already offered
    set_fresh_hits alts="${PART_ALTS[i]}" hits="${PART_HITS[i]}"
    if [[ ${#FRESH_HITS[@]} -gt 0 ]]; then
      local group="nearest paved patterns"
      [[ "$kind" == "typo" ]] && group="did you mean?"
      local shown_hits=0
      for j in "${FRESH_HITS[@]}"; do
        if [[ $used -ge $budget ]]; then
          hidden_total=$(( hidden_total + 1 ))
          continue
        fi
        group+=$'\n'"$j"
        used=$(( used + 1 ))
        shown_hits=1
        any_hits=1
      done
      [[ $shown_hits -eq 1 ]] && groups+=("$group")
    fi

    # shell grammar: no command here to pave
    [[ "$kind" == "grammar" ]] && groups+=("shell grammar, not a command — a loop or branch cannot be paved; run each paved command alone")

    # no paved path at all — or none known, when the inventory could not be read
    if [[ "$kind" == "novel" ]]; then
      local novel_line="no paved path fits this part"
      [[ -n "$SETTINGS_MALFUNCTION" ]] && novel_line="no paved path known — the allowlist could not be read (see above)"
      [[ -n "$INVENTORY_MALFUNCTION" ]] && novel_line="no paved path known — the inventory could not be read (see above)"
      groups+=("$novel_line")
    fi

    # the search budget ran out before this part: say so, so it is not read as "none fit"
    [[ "$kind" == "unranked" ]] && groups+=("not searched — the candidate search ran out of time before this part; split the compound into shorter calls")

    # the part's groups are peers of its `blocked:` line, at the same depth
    shown_total=$(( shown_total + used ))
    ENTRIES+=("${groups[@]}")
  done

  # each tail line is its own section, set off by a spacer
  # overflow past the cap
  # .note = names the lookup, not a move number: SOFTNUDGE's hint holds one unnumbered line
  [[ $hidden_total -gt 0 ]] && ENTRIES+=("" "… and $hidden_total more (see all: rhx permissions.get, below)")

  # the marker key, once, whenever a pattern rendered
  # .why = `[e] jq` read as "jq is paved" when only a bare jq is; the key lived only in the
  #        session-start notice, far from the block that needs it
  [[ $any_hits -eq 1 ]] && ENTRIES+=("" "$MARKER_KEY")

  # a compound runs only if every part is paved
  set_compound_part_count command="$COMMAND"
  [[ ${COMPOUND_PART_COUNT:-0} -gt $nparts ]] && ENTRIES+=("" "tip: a compound runs only if every part is paved; the other parts are paved alone, so split the call")

  # SOFTNUDGE ends the tree with its advisory line
  # .why = SOFTNUDGE neither blocks nor records, so it must not promise a retry, a human
  #        prompt, or a ledger row
  [[ "$MODE" == "SOFTNUDGE" ]] && ENTRIES+=("" "advisory only: the command runs as-is, and no ledger row is recorded")

  # the header owns the trunk directly: no blank line between them
  OUT+=("$header")
  render_tree_entries "${ENTRIES[@]}"

  # the bot already chose to look: in a LOOKUP the tree is the whole answer
  [[ "$MODE" == "LOOKUP" ]] && return 0

  # the pave philosophy, on every nudge: a reusable tool beats an adhoc command
  OUT+=("")
  OUT+=("🐚 pave what recurs")
  OUT+=("   ├─ you will use it again? pave it")
  OUT+=("   ├─ a future traveler will need it? pave it")
  OUT+=("   ├─ a repo beyond this one will need it? pave it, and dispatch a task to teach upstream too")
  OUT+=("   └─ where? always start in .agent/repo=.this/role=any/skills/")

  # the moves left to the reader render as a coconut hint
  # (.agent/repo=.this/role=any/briefs/rule.require.coconut-hints.md)
  # .why = look before you pave or retry: the full list is one paved command away
  as_shell_quoted text="${COMMAND//$'\n'/ }"
  local see_all="see all pre-approved commands: rhx permissions.get --for $SHELL_QUOTED"
  OUT+=("")

  # SOFTNUDGE runs the command anyway, so the only move left is to look
  if [[ "$MODE" == "SOFTNUDGE" ]]; then
    OUT+=("🥥 did you know?")
    OUT+=("   └─ $see_all")
    return 0
  fi
  OUT+=("🥥 did you know?")
  OUT+=("   ├─ 1. $see_all")
  OUT+=("   ├─ 2. a need that recurs deserves a paved rhx skill — pave it")
  OUT+=("   └─ 3. need this exact command once? retry it unchanged — that interrupts the human to ask")
  return 0
}

# .note = render_tree_entries (the tree drawn onto OUT) comes from _permissions.render.lib.sh

# the malfunction lines (settings, inventory), rendered under the nudge when present
print_malfunction_lines() {
  if [[ -n "$SETTINGS_MALFUNCTION" ]]; then
    echo "💥 MalfunctionError: settings file unparseable: $SETTINGS_MALFUNCTION — the allowlist could not be read, so every command blocks and no candidate can be ranked; repair the json in .claude/"
  fi
  if [[ -n "$INVENTORY_MALFUNCTION" ]]; then
    echo "💥 MalfunctionError: $INVENTORY_MALFUNCTION — alternatives are omitted and the block still holds; repair the file beside the hook, then rebuild the role"
  fi
  return 0
}

# the block header: the error class, plus a part count when more than one part is blocked
# .note = sets the global BLOCK_HEADER
get_block_header() {
  BLOCK_HEADER="✋ ConstraintError: this command is not paved"
  [[ ${#PART_TEXT[@]} -gt 1 ]] && BLOCK_HEADER+=" (${#PART_TEXT[@]} parts)"
  return 0
}

# the reason a retried command carries into the human's prompt: what each part was offered
# .why = the prompt should say what the bot was offered and chose to pass over, not
#        show a bare command
# .note = sets the global RETRY_REASON; the ledger line is appended by the caller
get_retry_reason() {
  RETRY_REASON="🐢 retried after a nudge"
  local i offer
  for i in "${!PART_TEXT[@]}"; do
    case "${PART_KIND[i]}" in
      alt)
        # the first inventory alternative, or the advice for an advice-only head
        as_first_field "${PART_ALTS[i]}"
        offer="paved alternative offered — $FIRST_FIELD"
        [[ -z "$FIRST_FIELD" ]] && offer="advice offered — ${PART_ADVICE[i]}"
        RETRY_REASON+=$'\n'"  • ${PART_HEAD[i]}: $offer"
        ;;
      typo)
        as_first_field "${PART_HITS[i]}"
        RETRY_REASON+=$'\n'"  • ${PART_HEAD[i]}: nearest paved pattern offered — $FIRST_FIELD"
        ;;
      grammar)
        RETRY_REASON+=$'\n'"  • ${PART_HEAD[i]}: shell grammar, not a command"
        ;;
      unranked)
        RETRY_REASON+=$'\n'"  • ${PART_HEAD[i]}: not searched — the candidate search ran out of time"
        ;;
      *)
        RETRY_REASON+=$'\n'"  • ${PART_HEAD[i]}: no paved path fits"
        ;;
    esac
  done
  return 0
}

# LOOKUP: a read-only lookup — print the verdict and every candidate, never block, never record
# .why = `rhx permissions.get --for` asks what the hook would say, with no side effect: no
#        nudge record (so the next real attempt is still a first attempt), no ledger row
if [[ "$MODE" == "LOOKUP" ]]; then
  get_lookup_header command="$COMMAND"
  get_nudge_lines header="$LOOKUP_HEADER"
  print_framed "${OUT[@]}"
  exit 0
fi

# SOFTNUDGE: advise on stdout, never block, never record
if [[ "$MODE" == "SOFTNUDGE" ]]; then
  # an advisory is not an error, so it wears no ✋ ConstraintError head (that head means "blocked")
  get_nudge_lines header="🐚 advisory: this command is not paved (SOFTNUDGE — the command still runs)"
  print_framed "${OUT[@]}"
  # a malfunction reaches stderr too, even in advisory mode (the render above already leads with it)
  SOFT_MALFUNCTION=$(print_malfunction_lines)
  [[ -n "$SOFT_MALFUNCTION" ]] && print_framed "$SOFT_MALFUNCTION" >&2
  exit 0
fi

# HARDNUDGE (default): block on first attempt, hand a retry to the human
ATTEMPTED_FILE="$CLAUDE_DIR/permission.nudges.local.json"

# a nudge record that cannot be read or written is named in the render, never swallowed
# .note = the cause is the first line of jq's / mv's error; the block still holds
RECORD_MALFUNCTION=""

# name a record malfunction; the first cause wins
# .why = one failure cascades (a record that cannot be created cannot be read or locked); the
#        first cause is the root, and the remedy for it is the one worth the reader's time
# .note = named arg `cause=`; sets the global RECORD_MALFUNCTION only when it is empty
set_record_malfunction() {
  local cause=""
  local "$@"
  RECORD_MALFUNCTION="${RECORD_MALFUNCTION:-$cause}"
  return 0
}

# create the nudge record as `{}` if it is absent — never overwrite one
# .why = a test-then-write (`[[ ! -f ]]` then `>`) lets a slow clone truncate a record another
#        clone already filled. noclobber makes the create exclusive (O_EXCL): it only ever
#        creates. its one expected failure is "the file exists", which leaves the record in
#        place; any other failure leaves no record, and is named
gen_attempt_record() {
  local create_err
  create_err=$( { set -o noclobber; echo '{}' > "$ATTEMPTED_FILE"; } 2>&1 ) && return 0
  [[ -f "$ATTEMPTED_FILE" ]] && return 0
  set_record_malfunction cause="the nudge record could not be created ($ATTEMPTED_FILE: ${create_err%%$'\n'*})"
  return 1
}
gen_attempt_record || true

# was this exact command blocked within the window?
# .note = named arg `now=` (epoch seconds). the window is read off the wall clock, so a
#         clock that steps moves it:
#         - a backward step yields a negative gap; treat it as outside the window, so a stale
#           record can never pass a fresh command to the human as a retry
#         - a forward step past the window reads as a first attempt: one extra block, never a pass
#         an unreadable record also reads as a first attempt (fail closed), and is named
is_retry_in_window() {
  local now=""
  local "$@"
  local last_attempt elapsed
  if ! last_attempt=$(jq -r --arg cmd "$COMMAND" '.[$cmd] // 0' "$ATTEMPTED_FILE" 2>&1); then
    set_record_malfunction cause="the nudge record could not be read ($ATTEMPTED_FILE: ${last_attempt%%$'\n'*})"
    return 1
  fi
  elapsed=$(( now - last_attempt ))
  [[ $elapsed -lt 0 ]] && return 1
  [[ $elapsed -lt $HARDNUDGE_WINDOW_SECONDS ]]
}

# merge this command's first-attempt stamp into the record (caller holds the lock)
# .note = named arg `now=`. returns nonzero with RECORD_MALFUNCTION set when the write fails.
#         the temp file sits beside the record, so the mv is a same-filesystem rename (atomic);
#         a temp in /tmp could cross filesystems, where mv becomes copy-then-delete
set_attempt_record_merge() {
  local now=""
  local "$@"
  local tmp_file write_err
  tmp_file=$(mktemp "$ATTEMPTED_FILE.XXXXXX")
  if ! write_err=$(jq --arg cmd "$COMMAND" --argjson ts "$now" '. + {($cmd): $ts}' "$ATTEMPTED_FILE" 2>&1 > "$tmp_file"); then
    rm -f "$tmp_file"
    set_record_malfunction cause="the nudge record could not be written ($ATTEMPTED_FILE: ${write_err%%$'\n'*})"
    return 1
  fi
  if ! write_err=$(mv "$tmp_file" "$ATTEMPTED_FILE" 2>&1); then
    set_record_malfunction cause="the nudge record could not be written ($ATTEMPTED_FILE: ${write_err%%$'\n'*})"
    return 1
  fi
  return 0
}

# record this command's first attempt, keyed by its exact text, under a lock
# .why = the record is a read → merge → replace; two clones that block at once would each
#        read the same snapshot and one would drop the other's entry. a lock serializes them
# .how = `mkdir` is atomic on every posix filesystem, so the lock dir needs no flock (absent on
#        macOS). the holder writes its pid into the lock. a waiter takes the lock over only when
#        that pid is gone (`kill -0`), or when no pid appears within ~1s (a holder that died
#        between mkdir and the pid write). a wait time alone never proves a holder dead: under
#        contention it includes every clone queued ahead. a lock that cannot be made for any
#        other cause (permissions, read-only fs) is named at once, never waited on
# 🔴 .note = every wait here must end well inside the hook's registered timeout (10s). a hook
#            the harness kills never reaches its EXIT trap, and claude code reads a killed
#            PreToolUse hook as a permit — so a long wait on a live holder would open the gate.
#            a live holder is waited out ~2s, then the stamp is given up and the block holds
# .note = named arg `now=`. returns nonzero with RECORD_MALFUNCTION set on failure; the block
#         holds either way (fail closed: a lost stamp means one more block, never a pass)
ATTEMPT_LOCK_LIVE_TRIES=40   # × 0.05s ≈ 2s on a live holder
ATTEMPT_LOCK_NOPID_TRIES=20  # × 0.05s ≈ 1s with no holder pid = the holder died pre-mark
set_attempt_record() {
  local now=""
  local "$@"
  local lock="$ATTEMPTED_FILE.lock" tries=0 nopid=0 nodir=0 lock_err holder holder_now merged=0

  # take the lock: wait out a live holder, take over a dead one, name any other failure
  until lock_err=$(mkdir "$lock" 2>&1); do
    tries=$(( tries + 1 ))

    # no lock dir after a failed mkdir: either a holder released in between (retry at once),
    # or mkdir cannot work here at all (permissions, read-only fs) — which repeats every time,
    # so name it after ten straight tries (a real error reaches ten in milliseconds)
    if [[ ! -d "$lock" ]]; then
      nodir=$(( nodir + 1 ))
      if [[ $nodir -ge 10 ]]; then
        set_record_malfunction cause="the nudge record lock could not be made ($lock: ${lock_err%%$'\n'*})"
        return 1
      fi
      continue
    fi
    nodir=0
    if [[ $tries -gt $ATTEMPT_LOCK_LIVE_TRIES ]]; then
      set_record_malfunction cause="the nudge record lock stayed held past the wait by a live process ($lock)"
      return 1
    fi
    if is_past_hook_deadline deadline="$LOCK_DEADLINE"; then
      set_record_malfunction cause="the nudge record lock stayed held past the hook's deadline ($lock)"
      return 1
    fi

    # take over a lock whose holder is gone
    # .note = a take-over that loses the race to a fresh holder fails here harmlessly
    # .note = the pid file may vanish mid-read as its holder releases; that reads as absent
    holder=""
    { read -r holder < "$lock/pid"; } 2>/dev/null || holder=""
    if [[ -n "$holder" ]] && ! kill -0 "$holder" 2>/dev/null; then
      # re-read before the take-over: a holder that released normally, then exited, reads as
      # dead too — but its release removed the pid file, and a new holder's pid differs. only
      # the same dead pid, still in place, marks an orphaned lock
      holder_now=""
      { read -r holder_now < "$lock/pid"; } 2>/dev/null || holder_now=""
      if [[ "$holder_now" == "$holder" ]]; then
        rm -f "$lock/pid"
        try_lock_take_over lock="$lock" || return 1
      fi
      continue
    fi

    # no pid for ~1s straight = the holder died between mkdir and its pid write
    # .note = counted per consecutive check, not per wait: a fresh holder writes its pid in ms,
    #         even on a saturated host
    nopid=$(( nopid + 1 ))
    [[ -n "$holder" ]] && nopid=0
    if [[ $nopid -ge $ATTEMPT_LOCK_NOPID_TRIES ]]; then
      try_lock_take_over lock="$lock" || return 1
      nopid=0
      continue
    fi
    sleep 0.05
  done
  # mark the lock with this holder's pid
  # .note = the one benign failure: a take-over removed this lock between mkdir and here, so
  #         the dir is gone. the merge then runs unlocked — the pre-lock behavior (one lost
  #         stamp at worst). any other failure (the dir still there) is named
  local mark_err
  if ! mark_err=$( { echo "$$" > "$lock/pid"; } 2>&1 ) && [[ -d "$lock" ]]; then
    set_record_malfunction cause="the nudge record lock could not be marked ($lock/pid: ${mark_err%%$'\n'*})"
  fi

  # merge under the lock, then release it
  set_attempt_record_merge now="$now" || merged=1

  # release: remove the pid, then the dir. a failed release whose dir is already gone (taken
  # over) is benign; any other failed release is named
  # .note = judged by the release's own result, never by "does a lock dir exist": the next
  #         clone may take a fresh lock the instant this one is released
  # .note = a lock left behind has no live pid, so the next hook takes it over
  local release_err
  if ! release_err=$( { rm -f "$lock/pid" && rmdir "$lock"; } 2>&1 ) && [[ -d "$lock" ]]; then
    set_record_malfunction cause="the nudge record lock could not be released ($lock: ${release_err%%$'\n'*}); the next hook takes it over"
  fi
  return $merged
}

# remove an orphaned lock dir, so the wait loop can take the lock on its next mkdir
# .note = named arg `lock=`. judged by the rmdir's own result. two failures are a lost race and
#         benign: the dir is already gone, or a fresh holder made it again and marked its pid.
#         the loop retries on either. any other failure is named in RECORD_MALFUNCTION and
#         returns 1, so the caller stops and the block reports why
try_lock_take_over() {
  local lock=""
  local "$@"
  local take_err

  # the take-over itself
  take_err=$(rmdir "$lock" 2>&1) && return 0

  # a lost race: the dir is gone, or a fresh holder now owns it
  [[ ! -d "$lock" ]] && return 0
  [[ -e "$lock/pid" ]] && return 0

  # any other failure is named
  set_record_malfunction cause="the nudge record lock could not be taken over ($lock: ${take_err%%$'\n'*})"
  return 1
}

# the full block render: the nudge lines, then the record and ledger malfunctions
# .why = settings and inventory malfunctions already lead the render (get_nudge_lines); these
#        two concern what happens after the block, so they follow it, apart from the 🥥 tree
# .note = named args `ledger_malfunction=` and `record_malfunction=`; reads the global OUT;
#         sets the global BLOCK_TEXT
get_block_text() {
  local ledger_malfunction="" record_malfunction=""
  local "$@"
  local -a malfunctions=()
  [[ -n "$ledger_malfunction" ]] && malfunctions+=("$ledger_malfunction")
  [[ -n "$record_malfunction" ]] && malfunctions+=("💥 MalfunctionError: $record_malfunction — the block still holds, but a retry will block again rather than reach the human; delete the file and the hook recreates it")
  BLOCK_TEXT=$(printf '%s\n' "${OUT[@]}")
  [[ ${#malfunctions[@]} -gt 0 ]] && BLOCK_TEXT+=$'\n\n'$(printf '%s\n' "${malfunctions[@]}")
  return 0
}

# the reason text a retry hands to the human: what each part was offered, then the ledger note
# .note = named args `retry_reason=` and `ledger_note=`; sets the global ASK_REASON
as_ask_reason() {
  local retry_reason="" ledger_note=""
  local "$@"
  ASK_REASON="$retry_reason"$'\n'"$ledger_note"
  return 0
}

# the ask payload a retry hands to claude code
# .note = named arg `reason=`; prints one line of json on stdout
print_ask_payload() {
  local reason=""
  local "$@"
  jq -nc --arg reason "$reason" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $reason}}'
}

# the bust-through: the bot saw the nudge and insisted; hand it to the human with context
# .why = the human's prompt should carry what the bot was offered, not a bare command
# .note = permissionDecision "ask" is claude code's default permission flow — the same flow
#         a silent exit 0 triggers — plus the reason. a ledger failure is noted in the
#         reason, never turned into a block
NOW=$(date +%s)
if is_retry_in_window now="$NOW"; then
  get_retry_reason
  ledger_note="the ledger records this ask (retried)"
  set_ledger_rows verdict="retried" || ledger_note="💥 MalfunctionError: the ledger row could not be written ($LEDGER_ERROR) — the ask still goes to the human; make the ledger dir writable so demand is recorded"
  as_ask_reason retry_reason="$RETRY_REASON" ledger_note="$ledger_note"
  print_ask_payload reason="$ASK_REASON"
  exit 0
fi

# first attempt: record the timestamp, then block
# .note = a failed write is named below; the block holds either way
set_attempt_record now="$NOW" || true

# render the block
get_block_header
get_nudge_lines header="$BLOCK_HEADER"

# the ledger: a lost row is loud, and the block still holds
LEDGER_MALFUNCTION=""
set_ledger_rows verdict="nudged" || LEDGER_MALFUNCTION="💥 MalfunctionError: the nudge ledger row could not be written ($LEDGER_FILE: $LEDGER_ERROR) — the block still holds; make the ledger dir writable so demand is recorded"

# the block render reaches stdout and stderr both
get_block_text ledger_malfunction="$LEDGER_MALFUNCTION" record_malfunction="$RECORD_MALFUNCTION"
print_to_both "$BLOCK_TEXT"
exit 2
