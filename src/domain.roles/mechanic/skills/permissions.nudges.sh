#!/usr/bin/env bash
######################################################################
# .what = report what the permission nudge has recorded: how often a
#         command was nudged, how often a nudge was retried through to
#         a human, and which heads have no paved path at all
#
# .why  = the check-permissions hook appends one ledger row per blocked
#         part. the rows are the evidence two decisions wait on:
#         - a retry share that runs high promotes the `--why` gate
#         - a head that recurs with no paved path is a skill to pave
#           here, or to request upstream
#         a ledger nobody can read decides naught
#
# usage:
#   permissions.nudges.sh                 # the summary, top 7 heads per list
#   permissions.nudges.sh --top 15        # more heads per list
#
# guarantee:
#   - reads .agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl
#   - read-only: never writes the ledger, the nudge record, or settings
#   - one jq pass over the ledger; an unreadable row is named, never skipped in silence
#   - exit 0 = answered (an absent ledger is an answer), 1 = malfunction, 2 = bad input
######################################################################
set -euo pipefail

# a write to a reader that has gone away must fail as an error, never kill the skill
trap '' PIPE

# load the permission surfaces' shared frame (print_framed, print_to_both), so an error here
# renders as the hook's and the lookup's do
# .note = ${x%/*} at zero forks; an absent lib is a malfunction: named on both streams, exit 1
SKILL_DIR="${BASH_SOURCE[0]%/*}"
[[ "$SKILL_DIR" == "${BASH_SOURCE[0]}" ]] && SKILL_DIR="."
RENDER_LIB="$SKILL_DIR/../inits/claude.hooks/_permissions.render.lib.sh"
# shellcheck source=../inits/claude.hooks/_permissions.render.lib.sh
source "$RENDER_LIB" 2>/dev/null || {
  render_lib_crash="💥 MalfunctionError: permissions.nudges could not load $RENDER_LIB — reinstall the mechanic role"
  printf '%s\n' "$render_lib_crash" || true
  printf '%s\n' "$render_lib_crash" >&2 || true
  exit 1
}

# the usage, for --help and bad input
print_usage() {
  echo "🐚 permissions.nudges — what the permission nudge has recorded"
  echo "   ├─ usage"
  echo "   │  ├─ rhx permissions.nudges              the summary, top 7 heads per list"
  echo "   │  └─ rhx permissions.nudges --top <n>    more (or fewer) heads per list"
  echo "   └─ example"
  echo "      └─ rhx permissions.nudges --top 15"
  return 0
}

# parse flags
TOP=7
while [[ $# -gt 0 ]]; do
  case "$1" in
    --top)
      if [[ $# -lt 2 || ! "$2" =~ ^[1-9][0-9]*$ ]]; then
        print_to_both "✋ ConstraintError: --top needs a positive whole number, e.g. --top 15" "" "$(print_usage)"
        exit 2
      fi
      TOP="$2"
      shift 2
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args — ignore
      shift 2
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      print_to_both "✋ ConstraintError: unknown argument: $1" "" "$(print_usage)"
      exit 2
      ;;
  esac
done

# the ledger, at the repo root the hook writes it under
# .note = git's own first line rides the message, so a broken .git or an absent git binary is
#         never misreported as "not a repo"
REPO_ROOT=$(git rev-parse --show-toplevel 2>&1) || {
  print_to_both "✋ ConstraintError: the repo root could not be found (${REPO_ROOT%%$'\n'*}) — the nudge ledger lives under it" "   fix: run from inside the repo whose nudges you want"
  exit 2
}
LEDGER_REL=".agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl"
LEDGER="$REPO_ROOT/$LEDGER_REL"

# an absent ledger is an answer: no command has been nudged here yet
if [[ ! -s "$LEDGER" ]]; then
  echo "🐢 crickets..."
  echo ""
  echo "🐚 permissions.nudges"
  echo "   ├─ ledger: $LEDGER_REL"
  echo "   └─ no nudge recorded yet"
  exit 0
fi

# the ledger summary, one tab-separated row per fact: totals, then verdicts, novel heads,
# and heads nudged most (top N each)
# .note = named args `file=` `top=`; sets LEDGER_SUMMARY, or LEDGER_CAUSE and returns 1
# .note = each row is read as raw text, so a bad row is counted, never fatal: `fromjson?`
#         yields naught for a row that will not parse, and the count of those is reported
# .note = jq writes naught to stderr on success, so `2>&1` leaves the summary clean; on
#         failure the last line captured is jq's own complaint
# .note = a shell keyword (`for`, `do`, `done`, `fi`, …) is never demand to pave. the hook
#         writes no row for one now, but a ledger written before that still holds them as
#         `novel`; they are dropped from the pave list, so the report never says "pave `done`"
set_ledger_summary() {
  local file="" top=""
  local "$@"
  LEDGER_SUMMARY=$(jq -R -s -r --argjson top "$top" '
    split("\n") | map(select(length > 0)) as $lines
    | ($lines | map(fromjson? // null)) as $parsed
    | ($parsed | map(select(. != null and (type == "object")))) as $rows
    | ($rows | length) as $total
    | ($rows | map(select(.verdict == "retried")) | length) as $retried
    | def tally(f): map(f) | group_by(.) | map({key: .[0], n: length}) | sort_by(-.n, .key);
      [
        "total\t\($total)",
        "unreadable\t\(($lines | length) - $total)",
        "retried\t\($retried)",
        "share\t\(if $total == 0 then 0 else ($retried * 100 / $total | floor) end)",
        ($rows | tally(.verdict // "unknown") | .[] | "verdict\t\(.key)\t\(.n)"),
        ($rows | map(select(.kind == "novel" and ((.head // "") | IN("for", "do", "done", "if", "then", "else", "elif", "fi", "while", "until", "case", "esac", "select", "{", "}") | not))) | tally(.head // "?") | .[:$top][] | "novel\t\(.key)\t\(.n)"),
        ($rows | tally(.head // "?") | .[:$top][] | "head\t\(.key)\t\(.n)")
      ] | .[]
  ' "$file" 2>&1) && return 0
  LEDGER_CAUSE="${LEDGER_SUMMARY##*$'\n'}"
  return 1
}

# the summary rows, decoded into the counts and the three lists the report prints
# .note = reads LEDGER_SUMMARY; sets TOTAL UNREADABLE RETRIED SHARE and the arrays
#         VERDICT_ROWS NOVEL_ROWS HEAD_ROWS
set_ledger_parts() {
  TOTAL=0 UNREADABLE=0 RETRIED=0 SHARE=0
  VERDICT_ROWS=() NOVEL_ROWS=() HEAD_ROWS=()
  local kind a b
  while IFS=$'\t' read -r kind a b; do
    case "$kind" in
      total) TOTAL="$a" ;;
      unreadable) UNREADABLE="$a" ;;
      retried) RETRIED="$a" ;;
      share) SHARE="$a" ;;
      verdict) VERDICT_ROWS+=("$a ($b)") ;;
      novel) NOVEL_ROWS+=("$a ($b)") ;;
      head) HEAD_ROWS+=("$a ($b)") ;;
    esac
  done <<< "$LEDGER_SUMMARY"
  return 0
}

# read the ledger, then decode it
if ! set_ledger_summary file="$LEDGER" top="$TOP"; then
  print_to_both "💥 MalfunctionError: could not read the nudge ledger ($LEDGER_CAUSE)" "   ├─ ledger: $LEDGER_REL" "   └─ fix: inspect the file; it is a local cache, so \`rhx rmsafe '$LEDGER_REL'\` resets it"
  exit 1
fi
set_ledger_parts

# print a labeled list as tree children
# .note = named args `label=`, `last=` (true when it is the trunk's last branch), then items
print_list() {
  local label="" last=false
  while [[ $# -gt 0 && ( "$1" == label=* || "$1" == last=* ) ]]; do local "$1"; shift; done
  local trunk="├─" pad="│  "
  [[ "$last" == true ]] && trunk="└─" && pad="   "
  echo "   $trunk $label"
  if [[ $# -eq 0 ]]; then
    echo "   $pad└─ none"
    return 0
  fi
  local items=("$@")
  local last_index=$(( ${#items[@]} - 1 ))
  local i
  for i in "${!items[@]}"; do
    local glyph="├─"
    [[ $i -eq $last_index ]] && glyph="└─"
    echo "   $pad$glyph ${items[i]}"
  done
  return 0
}

echo "🐢 heres the wave..."
echo ""
echo "🐚 permissions.nudges"
echo "   ├─ ledger: $LEDGER_REL"
echo "   ├─ nudged parts: $TOTAL"
echo "   ├─ retried through to a human: $RETRIED ($SHARE%)"
[[ "$UNREADABLE" -gt 0 ]] && echo "   ├─ 💥 unreadable rows: $UNREADABLE (counted out of every list below)"
print_list label="by verdict" "${VERDICT_ROWS[@]}"
print_list label="heads with no paved path (pave these)" "${NOVEL_ROWS[@]}"
print_list label="heads nudged most" last=true "${HEAD_ROWS[@]}"
echo ""
echo "🥥 did you know?"
echo "   ├─ a head with no paved path that recurs is a skill to pave: start in .agent/repo=.this/role=any/skills/"
echo "   └─ a head every repo hits belongs upstream: rhx radio.task.push --via gh.issues --into ehmpathy/rhachet-roles-ehmpathy --title 'pave: <head>' --description @stdin"
