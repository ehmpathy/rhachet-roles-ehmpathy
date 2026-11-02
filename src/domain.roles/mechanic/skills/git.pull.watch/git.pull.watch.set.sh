#!/usr/bin/env bash
######################################################################
# .what = findsert a watch: this clone watches one pr; the daemon of
#         this clone's key is findserted to serve it
#
# .why  = once a pr is watched, the clone is alerted of ci failures, new
#         comments, approval, and the pr's end, with no director relay
#
# usage:
#   rhx git.pull.watch.set --pr 1220                     # plan (preview)
#   rhx git.pull.watch.set --pr 1220 --mode apply        # watch it
#   rhx git.pull.watch set --pr 1220 --in ehmpathy/<repo> --mode apply
#   rhx git.pull.watch.set --help                        # every flag
#
# guarantee:
#   - one watch per clone per pr, under one key only (F9); a key change moves it
#   - one daemon per key on the machine (F1); found if live, else spawned
#   - plan by default; apply writes the record, then findserts the daemon
#   - exit 0 ok · 1 malfunction · 2 constraint
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.watch.operations.sh
source "$SKILL_DIR/git.pull.watch.operations.sh"

SKILL="git.pull.watch.set"
PR=""
REPO_IN=""
MODE="plan"
OUTPUT="tree"

# .what = print the usage: every flag, its default, an example
help() {
  cat <<'EOF'
usage: git.pull.watch.set --pr <n> [--in <owner/name>] [--mode plan|apply] [--output tree|json]

options:
  --pr <n>            the pull request to watch (required)
  --in <owner/name>   the repo (default: the cwd's github origin)
  --mode plan|apply   plan shows what would happen; apply watches (default: plan)
  --output tree|json  the output shape (default: tree)
  --help, -h          show this help

example:
  rhx git.pull.watch.set --pr 1220 --mode apply
EOF
}

# parse args
while [[ $# -gt 0 ]]; do
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  case "$1" in
    --skill|--repo|--role) check_watch_flag_value "$SKILL" "$@"; shift 2 ;;
    --) shift ;;
    --pr) check_watch_flag_value "$SKILL" "$@"; PR="$2"; shift 2 ;;
    --in) check_watch_flag_value "$SKILL" "$@"; REPO_IN="$2"; shift 2 ;;
    --mode) check_watch_flag_value "$SKILL" "$@"; MODE="$2"; shift 2 ;;
    --output) check_watch_flag_value "$SKILL" "$@"; OUTPUT="$2"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_watch_constraint "$SKILL" "unknown arg '$1'" "rhx $SKILL --help" ;;
  esac
done

# validate the input; --output first, so every refusal speaks it
check_watch_enum_arg "$SKILL" --output "$OUTPUT" tree json
WATCH_OUTPUT="$OUTPUT"
check_watch_enum_arg "$SKILL" --mode "$MODE" plan apply
check_watch_pr_arg "$SKILL" "$PR"
set_watch_verb_context "$SKILL" "$REPO_IN" "$PR"

KEY_DIR="$(get_watch_key_dir "$WATCH_KEY")"
RECORD_NAME="$(as_watch_record_name "$WATCH_REPO" "$PR" "$WATCH_SERIAL")"
RECORD="$(as_watch_record_path "$KEY_DIR" "$RECORD_NAME")"

# .what = write the watch record from stdin; a fault ends the verb, named, before any spawn
# .why  = a bare fault under set -e would end at raw exit 1, with no path and no fix
set_watch_record_or_fail() {
  local record="$1" err
  err="$(set_watch_file_atomic "$record" 2>&1)" && return 0
  fail_watch_malfunction "$SKILL" "the watch record could not be written; no watch was set" \
    "record: $record" "cause: ${err:-no cause given}" \
    -- "clear the cause (no write access, a full disk, a file where a dir belongs), then rerun: rhx $SKILL --pr $PR --mode apply"
}

# .what = the watch verdict: found (this key holds it), moved (another key does), or set
# .why  = found is a no-op, moved carries the cursors, set starts unprimed (case=14)
# .note = a record marked ended waits only for its last alert; the daemon reads it
#         no more, so a reopened pr's watch is set afresh, never reported found
# .note = a record that does not parse is set afresh too: found is only for a
#         record proven live, so a corrupt one is rewritten, never trusted
get_watch_set_verdict() {
  local record="$1" priors="$2"
  [[ -f "$record" ]] && jq -e 'type == "object" and (.ended // null) == null' "$record" >/dev/null 2>&1 && { echo "found"; return 0; }
  [[ -f "$record" ]] && { echo "set"; return 0; }
  [[ "$priors" -gt 0 ]] && { echo "moved"; return 0; }
  echo "set"
}

# .what = this clone's watch on this pr under every key but this one
get_all_watch_records_of_clone_pr_elsewhere() {
  local one
  while IFS= read -r one; do
    [[ -n "$one" && "$one" != "$RECORD" ]] && echo "$one"
  done < <(get_all_watch_records_of_clone_pr "$WATCH_REPO" "$PR" "$WATCH_SERIAL")
  return 0
}

# this clone's watch on this pr under every other key, and the verdict it implies
RECORDS_PRIOR=()
while IFS= read -r one; do
  RECORDS_PRIOR+=("$one")
done < <(get_all_watch_records_of_clone_pr_elsewhere)
WATCH_VERDICT="$(get_watch_set_verdict "$RECORD" "${#RECORDS_PRIOR[@]}")"
WATCH_FROM=""
[[ "$WATCH_VERDICT" == "moved" ]] && WATCH_FROM="$(as_watch_key_of_record "${RECORDS_PRIOR[0]}")"

# .what = emit the result: the tree, or the json contract
#         { mode, repo, pr, clone: { serial, slug }, watch: { verdict, from }, daemon: { key, pid, verdict, prior }, line }
# .why  = git.commit.push composes the json and prints its `line`, so a push and
#         a hand `set` speak one sentence
emit() {
  local line="$1"
  if [[ "$OUTPUT" == "json" ]]; then
    jq -n --arg mode "$MODE" --arg repo "$WATCH_REPO" --argjson pr "$PR" --arg serial "$WATCH_SERIAL" \
      --arg slug "$WATCH_SLUG" --arg verdict "$WATCH_VERDICT" --arg from "$WATCH_FROM" --arg key "$WATCH_KEY" \
      --arg pid "$WATCH_DAEMON_PID" --arg dverdict "$WATCH_DAEMON_VERDICT" --arg prior "$WATCH_DAEMON_PRIOR" --arg line "$line" '{
        mode: $mode, repo: $repo, pr: $pr,
        clone: { serial: $serial, slug: $slug },
        watch: { verdict: $verdict, from: (if $from == "" then null else $from end) },
        daemon: { key: $key, pid: (if $pid == "" then null else ($pid | tonumber) end),
                  verdict: (if $dverdict == "" then null else $dverdict end),
                  prior: (if $prior == "" then null else $prior end) },
        line: $line
      }'
    return 0
  fi
  local header="shell yeah, watched"
  [[ "$MODE" == "plan" ]] && header="heres the wave..."
  print_watch_header "$header" "$SKILL --mode $MODE"
  echo "   ├─ pr: $WATCH_REPO#$PR"
  echo "   ├─ clone: @:$WATCH_SLUG"
  echo "   └─ watch: $line"
  if [[ "$MODE" == "plan" ]]; then
    echo ""
    echo "🥥 did you know?"
    echo "   ├─ plan writes naught; to watch it"
    echo "   └─ rhx $SKILL --pr $PR --in $WATCH_REPO --mode apply"
  fi
}

# plan: say what would happen, write naught
if [[ "$MODE" == "plan" ]]; then
  PLAN_LINE="would set → @:$WATCH_SLUG (daemon v$WATCH_KEY)"
  [[ "$WATCH_VERDICT" == "found" ]] && PLAN_LINE="found → @:$WATCH_SLUG (daemon v$WATCH_KEY)"
  [[ "$WATCH_VERDICT" == "moved" ]] && PLAN_LINE="would move v$WATCH_FROM → v$WATCH_KEY"
  emit "$PLAN_LINE"
  exit 0
fi

# write the record first, so a daemon that checks for idle sees it (F3)
if [[ "$WATCH_VERDICT" == "set" ]]; then
  as_watch_record_json "$WATCH_REPO" "$PR" "$WATCH_SERIAL" "$WATCH_SLUG" "$WATCH_REPO_ROOT" "${WATCH_SET_AT:-}" \
    | set_watch_record_or_fail "$RECORD"
fi

# a move carries the cursors, so no event re-alerts under the new key (case=14)
if [[ "$WATCH_VERDICT" == "moved" ]]; then
  as_watch_record_moved "${RECORDS_PRIOR[0]}" "$WATCH_REPO_ROOT" "$WATCH_SLUG" \
    | set_watch_record_or_fail "$RECORD"
fi

# one key per watch: drop this clone's watch on this pr under every other key (F9),
# under each key's lock, so the old daemon cannot write it back mid-tick
for one in "${RECORDS_PRIOR[@]+"${RECORDS_PRIOR[@]}"}"; do
  del_watch_record_locked "$one" || fail_watch_malfunction "$SKILL" "the lock of daemon v$(as_watch_key_of_record "$one") timed out; the watch is under both keys" \
    "lock: $(as_watch_key_dir_of_record "$one")/daemon.lock" -- "rerun this command; it moves the watch again"
done

# findsert the daemon of this key
RC=0
gen_watch_daemon "$WATCH_KEY" || RC=$?
if [[ $RC -eq 2 ]]; then
  fail_watch_malfunction "$SKILL" "the lock of daemon v$WATCH_KEY timed out" \
    "lock: $KEY_DIR/daemon.lock" -- "the watch is recorded; rerun to findsert its daemon"
fi
if [[ $RC -ne 0 ]]; then
  BOOT_CAUSE="$(as_watch_last_text_line <"$KEY_DIR/daemon.log" 2>/dev/null || echo "")"
  fail_watch_malfunction "$SKILL" "pr-watch daemon v$WATCH_KEY died at boot" \
    "cause: ${BOOT_CAUSE:-<the log is empty>}" "see: $KEY_DIR/daemon.log" \
    -- "the watch is recorded; fix the cause, then rerun this command"
fi

CLAUSE="$(as_watch_daemon_clause "$WATCH_KEY" "$WATCH_DAEMON_PID" "$WATCH_DAEMON_VERDICT" "$WATCH_DAEMON_PRIOR")"
LINE="$WATCH_VERDICT → @:$WATCH_SLUG ($CLAUSE)"
[[ "$WATCH_VERDICT" == "moved" ]] && LINE="moved v$WATCH_FROM → v$WATCH_KEY (daemon pid $WATCH_DAEMON_PID, $WATCH_DAEMON_VERDICT)"
# a daemon in a pause reads naught: the watch is set, but the clone must hear it waits
PAUSE="$(cat "$KEY_DIR/daemon.paused" 2>/dev/null || echo "")"
[[ -n "$PAUSE" ]] && LINE="$LINE · paused: token $PAUSE"
emit "$LINE"
