#!/usr/bin/env bash
######################################################################
# .what = show every pr-watch daemon on this machine, and its watches
#
# .why  = a clone (or its human) sees at a glance which prs are watched,
#         by which daemon, and whether that daemon still ticks
#
# usage:
#   rhx git.pull.watch get
#   rhx git.pull.watch get --output json
#   rhx git.pull.watch get --help
#
# guarantee:
#   - read-only: spawns, stops, and writes naught
#   - one block per key: daemon state, pid, last tick, home; then each watch
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.watch.operations.sh
source "$SKILL_DIR/git.pull.watch.operations.sh"

SKILL="git.pull.watch get"
OUTPUT="tree"

# .what = print the usage: every flag, its default, an example
help() {
  cat <<'EOF'
git.pull.watch get: show each pr-watch daemon on this machine, and the watches it serves

usage: git.pull.watch get [--output tree|json]

options:
  --output tree|json  the output shape (default: tree)
  --help, -h          show this help

example:
  rhx git.pull.watch get
EOF
}

# parse args; a refusal in the loop speaks json if asked
set_watch_output_from_args "$@"
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

# .what = the alerts one watch holds, unsent: how many, the most ticks one waited, and why
# .why  = "11 held" alone hides a clone that can never take a say; the cause names it
# .note = a glob with no match holds none; the outbox dir lands only with the first alert
# .note = an entry that does not parse counts as held, with no ticks and no cause
get_watch_held_json() {
  local entry
  while IFS= read -r entry; do
    [[ -n "$entry" ]] || continue
    jq -c '{ tries: (.tries // 0), cause: (.cause // null) }' "$entry" 2>/dev/null \
      || echo '{"tries":0,"cause":null}'
  done < <(get_all_watch_outbox_entries_of_record "$1") \
    | jq -s -c '{ held: length, heldTicks: ([.[].tries] | max // 0), heldCause: ([.[].cause | select(. != null)] | last // null) }'
}

# .what = the read fault of one watch's pr: { since, rc, cause }, or null
# .why  = one pr that fails each tick must show on its own row, not hide behind a pr
#         that reads fine; the daemon keeps the clock in the pr's cache dir
get_watch_read_fault_json() {
  local record="$1" key_dir stem
  key_dir="$(dirname "$(dirname "$record")")"
  stem="$(basename "$record" .json)"
  stem="${stem%%.clone=*}"
  jq -c '{ since, rc, cause }' "$key_dir/cache/$stem/read.fault" 2>/dev/null || echo null
}

# .what = one watch's summary row, read from its record, as compact json
# .note = a record that does not parse is a row of its own, named by path, in the
#         same shape with null fields: the screen a human reads to diagnose a watch
#         must never drop one, nor abort, and a composer reads one row shape
get_watch_summary_json() {
  local record="$1" held="$2" fault
  fault="$(get_watch_read_fault_json "$record")"
  jq -c --argjson held "$held" --argjson fault "$fault" --arg record "$record" \
    '{ repo, pr, cloneSerial, cloneSlug, repoRoot, primed } + $held
      + { ended: (.ended // null), readFault: $fault, unreadable: false, record: $record }' "$record" 2>/dev/null \
    || jq -n -c --argjson held "$held" --arg record "$record" \
      '{ repo: null, pr: null, cloneSerial: null, cloneSlug: null, repoRoot: null, primed: null } + $held
        + { ended: null, readFault: null, unreadable: true, record: $record }'
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
    [[ -n "$record" ]] && get_watch_summary_json "$record" "$(get_watch_held_json "$record")"
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

# .what = the path of the first watch record that does not parse; empty if none
get_watch_unreadable_record_path() {
  jq -r '[.[].watches[] | select(.unreadable == true)][0].record // empty' <<<"$1"
}

# .what = print one tree block per key: daemon line, home, then each watch
# .why  = the tree shape lives in one render, so the orchestrator reads as narrative
print_watch_daemons_tree() {
  jq -r --argjson named "$WATCH_HELD_NAMED_TICKS" --argjson now "$(get_watch_epoch_now)" '
  def held: if .held == 0 then ""
    elif .heldTicks >= $named then " · \(.held) held, \(.heldTicks) ticks: \(.heldCause // "no cause given")"
    else " · \(.held) held" end;
  def fault: if (.readFault // null) == null then ""
    else " · read fault \((($now - .readFault.since) / 60) | ceil) min: \(.readFault.cause // "no cause given")" end;
  def root: (.repoRoot | split("/") | last) as $dir
    | if $dir == (.repo | split("/") | last) then "" else " (root: \($dir))" end;
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
           else "\($under)   \($wb) \($w.repo)#\($w.pr) → @:\($w.cloneSlug)\($w | root)\($w | held)\($w | fault)\(if ($w.ended // null) != null then " · ended" else "" end)\(if $w.primed then "" else " · not yet primed" end)" end)
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
  print_watch_coconut "to watch a pr" "rhx git.pull.watch set --which <n> --mode apply"
  exit 0
fi
print_watch_daemons_tree "$DAEMONS"

# every cure the render owes, one per unwell part, under one coconut header
CURES=()

# a daemon that is stale, wedged, or gone leaves its watches unserved; each names its own log
while IFS=$'\t' read -r key state log; do
  [[ -n "$key" ]] || continue
  CURES+=("daemon v$key is $state; it serves no watch"$'\n'"1. read why it stopped: cat $log"$'\n'"2. start a fresh one: rhx git.pull.watch set --which <n> --mode apply")
done < <(jq -r '.[] | select(.state == "stale" or .state == "wedged" or .state == "absent") | [.key, .state, (.home | sub("/bin$"; "/daemon.log"))] | @tsv' <<<"$DAEMONS")

# a live daemon that is paused reads naught until its token is back; a stale or absent
# one needs a fresh start first, so an unlock alone would not revive it
while IFS= read -r paused; do
  [[ -n "$paused" ]] || continue
  CURES+=("$(as_watch_paused_cure_lines "$paused")")
done < <(jq -r '[.[] | select(.paused != null and .state == "live") | .paused] | unique[]' <<<"$DAEMONS")

# an alert held this long will not reach its clone by a say; name where it lands
if [[ "$(jq --argjson named "$WATCH_HELD_NAMED_TICKS" 'any(.[].watches[]; (.heldTicks // 0) >= $named)' <<<"$DAEMONS")" == "true" ]]; then
  CURES+=("a held alert waits for its clone; the clone hears it at its next prompt"$'\n'"the next prompt in that clone prints each held alert, oldest first, then clears it"$'\n'"to see why the say refuses: rhx clone say --help")
fi

# a pr whose reads fail keeps its cursors; name where the cause is logged
if [[ "$(jq 'any(.[].watches[]; (.readFault // null) != null)' <<<"$DAEMONS")" == "true" ]]; then
  CURES+=("a read fault holds the cursors of that pr; alerts resume at its next good read, within $(as_watch_minutes_ceil "${WATCH_POLL_MAX_SECONDS:-1800}") min"$'\n'"a pr with no good read for the idle ttl ends its watch, with a note that names its last fault"$'\n'"each fault line is in the daemon log: cat $(jq -r '[.[] | select(any(.watches[]; (.readFault // null) != null))][0].home | sub("/bin$"; "/daemon.log")' <<<"$DAEMONS")")
fi

# a record that does not parse holds its watch; name the file and the cure
UNREADABLE="$(get_watch_unreadable_record_path "$DAEMONS")"
if [[ -n "$UNREADABLE" ]]; then
  CURES+=("a watch record that does not parse is held, never served"$'\n'"1. read it: cat $UNREADABLE"$'\n'"2. rewrite it from its clone: rhx git.pull.watch set --which <n> --mode apply")
fi

[[ ${#CURES[@]} -eq 0 ]] || print_watch_coconut_cures "${CURES[@]}"
