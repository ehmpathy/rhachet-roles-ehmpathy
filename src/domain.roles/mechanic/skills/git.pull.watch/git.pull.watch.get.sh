#!/usr/bin/env bash
######################################################################
# .what = show every pr-watch daemon on this machine, and its watches
#
# .why  = a clone (or its human) sees at a glance which prs are watched,
#         by which daemon, and whether that daemon still ticks
#
# usage:
#   rhx git.pull.watch.get
#   rhx git.pull.watch get --output json
#   rhx git.pull.watch.get --help
#
# guarantee:
#   - read-only: spawns, stops, and writes naught
#   - one block per key: daemon state, pid, last tick, home; then each watch
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.watch.operations.sh
source "$SKILL_DIR/git.pull.watch.operations.sh"

SKILL="git.pull.watch.get"
OUTPUT="tree"

# .what = print the usage: every flag, its default, an example
help() {
  cat <<'EOF'
usage: git.pull.watch.get [--output tree|json]

options:
  --output tree|json  the output shape (default: tree)
  --help, -h          show this help

example:
  rhx git.pull.watch.get
EOF
}

# parse args
while [[ $# -gt 0 ]]; do
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  case "$1" in
    --skill|--repo|--role) check_watch_flag_value "$SKILL" "$@"; shift 2 ;;
    --) shift ;;
    --output) check_watch_flag_value "$SKILL" "$@"; OUTPUT="$2"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_watch_constraint "$SKILL" "unknown arg '$1'" "rhx $SKILL --help" ;;
  esac
done
check_watch_enum_arg "$SKILL" --output "$OUTPUT" tree json
WATCH_OUTPUT="$OUTPUT"

# .what = how many alerts one watch holds, unsent
# .note = a glob with no match counts 0; the outbox dir lands only with the first alert
get_watch_held_count() {
  get_all_watch_outbox_entries_of_record "$1" | grep -c . || true
}

# .what = one watch's summary row, read from its record, as compact json
# .note = a record that does not parse is a row of its own, named by path: the
#         screen a human reads to diagnose a watch must never drop one, nor abort
get_watch_summary_json() {
  local record="$1" held="$2"
  jq -c --argjson held "$held" \
    '{ repo, pr, cloneSerial, cloneSlug, repoRoot, primed, held: $held, ended: (.ended // null) }' "$record" 2>/dev/null \
    || jq -n -c --arg record "$record" '{ unreadable: true, record: $record }'
}

# .what = the daemon marks one key holds now: backoff, unreachable, tokenfault
# .why  = "why no alerts?" is answered here, not by a hand read of the state dir
get_watch_daemon_marks_json() {
  local dir="$1" name marks=()
  for name in backoff unreachable tokenfault; do
    [[ -f "$dir/daemon.$name" ]] && marks+=("$name")
  done
  printf '%s\n' "${marks[@]}" | jq -R -s -c 'split("\n") | map(select(length > 0))'
}

# .what = every watch of one key, as a json array of summary rows
get_all_watch_summaries_json() {
  local dir="$1" record
  while IFS= read -r record; do
    [[ -n "$record" ]] && get_watch_summary_json "$record" "$(get_watch_held_count "$record")"
  done < <(get_all_watch_records "$dir") | jq -s -c '.'
}

# .what = one key's daemon and watches, as json
# .why  = one shape feeds both outputs: the tree renders it, `--output json` prints it
get_watch_key_json() {
  local dir="$1" key state pid age watches
  key="$(as_watch_key_from_dir "$dir")"
  state="$(get_watch_daemon_state "$dir" "$key")"
  pid="$(get_watch_daemon_pid "$dir")"
  age="$(get_watch_heartbeat_age "$dir")"
  watches="$(get_all_watch_summaries_json "$dir")"
  jq -n --arg key "$key" --arg state "$state" --arg pid "$pid" --arg age "$age" \
    --arg home "$dir/bin" --argjson watches "$watches" --arg paused "$(cat "$dir/daemon.paused" 2>/dev/null || echo "")" \
    --argjson marks "$(get_watch_daemon_marks_json "$dir")" '{
      key: $key, state: $state,
      pid: (if $pid == "" then null else ($pid | tonumber) end),
      lastTickSecondsAgo: (if $age == "" then null else ($age | tonumber) end),
      paused: (if $paused == "" then null else $paused end),
      marks: $marks,
      home: $home, watches: $watches
    }'
}

# .what = every key with a daemon or a watch, as a json array
# .note = a key with no daemon and no watch is residue; it is not shown
get_all_watch_daemons_json() {
  local dir
  while IFS= read -r dir; do
    [[ -n "$dir" ]] && get_watch_key_json "$dir"
  done < <(get_all_watch_key_dirs) | jq -s -c '[.[] | select(.state != "absent" or (.watches | length) > 0)]'
}

# .what = does the daemons array hold no daemon and no watch?
is_watch_daemons_empty() {
  [[ "$(jq 'length' <<<"$1")" == "0" ]]
}

# .what = does any daemon in the array need a hand: stale, wedged, or absent with watches?
is_watch_daemons_unwell() {
  [[ "$(jq 'any(.[]; .state == "stale" or .state == "wedged" or .state == "absent")' <<<"$1")" == "true" ]]
}

# .what = the path of the first watch record that does not parse; empty if none
get_watch_unreadable_record_path() {
  jq -r '[.[].watches[] | select(.unreadable == true)][0].record // empty' <<<"$1"
}

# .what = the daemon.log path of the first unwell daemon
get_watch_unwell_log_path() {
  jq -r '[.[] | select(.state == "stale" or .state == "wedged" or .state == "absent")][0].home | sub("/bin$"; "/daemon.log")' <<<"$1"
}

# .what = print one tree block per key: daemon line, home, then each watch
# .why  = the tree shape lives in one render, so the orchestrator reads as narrative
print_watch_daemons_tree() {
  jq -r '
  def tick: if .lastTickSecondsAgo == null then "never ticked" else "last tick \(.lastTickSecondsAgo)s ago" end;
  def pid: if .pid == null then "no pid" else "pid \(.pid)" end;
  to_entries as $all
  | $all[]
  | .key as $i | .value as $d
  | ($i == ($all | length) - 1) as $last
  | (if $last then "   └─ " else "   ├─ " end) as $branch
  | (if $last then "      " else "   │  " end) as $under
  | "\($branch)daemon v\($d.key) · \($d.state) · \($d | pid) · \($d | tick)\(if $d.paused then " · paused (token \($d.paused))" else "" end)\(if (($d.marks // []) | length) > 0 then " · held by: \($d.marks | join(", "))" else "" end)",
    "\($under)├─ home: \($d.home)",
    (if ($d.watches | length) == 0 then "\($under)└─ watches: none"
     else "\($under)└─ watches",
       ($d.watches | to_entries[] | .key as $j | .value as $w
         | (if $j == ($d.watches | length) - 1 then "└─" else "├─" end) as $wb
         | if $w.unreadable then "\($under)   \($wb) unreadable record: \($w.record)"
           else "\($under)   \($wb) \($w.repo)#\($w.pr) → @:\($w.cloneSlug) (\($w.repoRoot | split("/") | last))\(if $w.held > 0 then " · \($w.held) held" else "" end)\(if $w.primed then "" else " · not yet primed" end)" end)
     end)
' <<<"$1"
}

DAEMONS="$(get_all_watch_daemons_json)"

if [[ "$OUTPUT" == "json" ]]; then
  jq '{ daemons: . }' <<<"$DAEMONS"
  exit 0
fi

print_watch_header "heres the wave..." "$SKILL"
if is_watch_daemons_empty "$DAEMONS"; then
  echo "   └─ no daemons, no watches"
  print_watch_coconut "to watch a pr" "rhx git.pull.watch set --pr <n> --mode apply"
  exit 0
fi
print_watch_daemons_tree "$DAEMONS"

# a daemon that is stale, wedged, or gone leaves its watches unserved; name the cure
if is_watch_daemons_unwell "$DAEMONS"; then
  print_watch_coconut "a stale, wedged, or absent daemon serves no watch" \
    "findsert a fresh one: rhx git.pull.watch set --pr <n> --mode apply" \
    "read why it stopped: cat $(get_watch_unwell_log_path "$DAEMONS")"
fi

# a record that does not parse holds its watch; name the file and the cure
UNREADABLE="$(get_watch_unreadable_record_path "$DAEMONS")"
if [[ -n "$UNREADABLE" ]]; then
  print_watch_coconut "a watch record that does not parse is held, never served" \
    "read it: cat $UNREADABLE" \
    "rewrite it from its clone: rhx git.pull.watch set --pr <n> --mode apply"
fi
