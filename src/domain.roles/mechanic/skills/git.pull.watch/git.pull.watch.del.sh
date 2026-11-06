#!/usr/bin/env bash
######################################################################
# .what = delete this clone's watch on one pr, under every key
#
# .why  = a clone that no longer needs a pr's alerts stops them; the
#         daemon exits on its own once it holds zero watches (F3)
#
# usage:
#   rhx git.pull.watch.del --pr 1220                  # plan (preview)
#   rhx git.pull.watch.del --pr 1220 --mode apply     # stop the watch
#   rhx git.pull.watch del --pr 1220 --mode apply
#   rhx git.pull.watch.del --help                     # every flag
#
# guarantee:
#   - a no-op if this clone has no watch on the pr
#   - deletes the watch's held alerts with it
#   - plan by default
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.watch.operations.sh
source "$SKILL_DIR/git.pull.watch.operations.sh"

SKILL="git.pull.watch.del"
PR=""
REPO_IN=""
MODE="plan"
OUTPUT="tree"

# .what = print the usage: every flag, its default, an example
help() {
  cat <<'EOF'
usage: git.pull.watch.del --pr <n> [--in <owner/name>] [--mode plan|apply] [--output tree|json]
needs: an enrolled clone (rhx enroll sets RHACHET_CLONE_SERIAL)

options:
  --pr <n>            the pull request whose watch to stop (required)
  --in <owner/name>   the repo (default: the cwd's github origin)
  --mode plan|apply   plan shows what would happen; apply deletes (default: plan)
  --output tree|json  the output shape (default: tree)
  --help, -h          show this help

example:
  rhx git.pull.watch.del --pr 1220 --mode apply
EOF
}

# parse args; a refusal in the loop speaks json if asked
set_watch_output_from_args "$@"
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

check_watch_enum_arg "$SKILL" --output "$OUTPUT" tree json
WATCH_OUTPUT="$OUTPUT"
check_watch_enum_arg "$SKILL" --mode "$MODE" plan apply
check_watch_pr_arg "$SKILL" "$PR"

# the clone and repo; a dead clone may still delete its own watch, so the
# registry check is not owed here
set_watch_clone_and_repo "$SKILL" "$REPO_IN" "$PR" "run this from the enrolled clone that holds the watch"

# this clone's watch on this pr, under every key, and the keys that hold it
RECORDS=()
while IFS= read -r one; do
  [[ -n "$one" ]] && RECORDS+=("$one")
done < <(get_all_watch_records_of_clone_pr "$WATCH_REPO" "$PR" "$WATCH_SERIAL")
KEYS=()
for one in "${RECORDS[@]+"${RECORDS[@]}"}"; do
  KEYS+=("$(as_watch_key_of_record "$one")")
done

# .what = the del verdict, from how many records stand and the mode
# usage: as_watch_del_verdict <count> <plan|apply>
as_watch_del_verdict() {
  [[ "$1" -gt 0 ]] || { echo "absent — no-op"; return 0; }
  [[ "$2" == "apply" ]] && { echo "deleted"; return 0; }
  echo "would delete"
}
VERDICT="$(as_watch_del_verdict "${#RECORDS[@]}" "$MODE")"

# .what = the keys as the tree names them: `v<key> v<key>`
as_watch_keys_label() {
  local key labels=()
  for key in "$@"; do
    labels+=("v$key")
  done
  echo "${labels[*]}"
}

# apply: delete each record and its held alerts, under its key's lock
if [[ "$MODE" == "apply" ]]; then
  for one in "${RECORDS[@]+"${RECORDS[@]}"}"; do
    del_watch_record_locked "$one" || fail_watch_malfunction "$SKILL" "the lock of daemon v$(as_watch_key_of_record "$one") timed out; the watch stands" \
      "lock: $(as_watch_key_dir_of_record "$one")/daemon.lock" -- "rerun this command"
  done
fi

if [[ "$OUTPUT" == "json" ]]; then
  jq -n --arg mode "$MODE" --arg repo "$WATCH_REPO" --argjson pr "$PR" --arg serial "$WATCH_SERIAL" \
    --arg verdict "$VERDICT" '{ mode: $mode, repo: $repo, pr: $pr, clone: { serial: $serial }, verdict: $verdict, keys: $ARGS.positional }' \
    --args "${KEYS[@]+"${KEYS[@]}"}"
  exit 0
fi

HEADER="righteous, watch stopped"
[[ "$MODE" == "plan" || ${#RECORDS[@]} -eq 0 ]] && HEADER="heres the wave..."
print_watch_header "$HEADER" "$SKILL --mode $MODE"
echo "   ├─ pr: $WATCH_REPO#$PR"
[[ ${#KEYS[@]} -eq 1 ]] && echo "   ├─ daemon: $(as_watch_keys_label "${KEYS[@]}")"
[[ ${#KEYS[@]} -gt 1 ]] && echo "   ├─ daemons: $(as_watch_keys_label "${KEYS[@]}")"
echo "   └─ verdict: $VERDICT"
if [[ "$MODE" == "plan" && ${#RECORDS[@]} -gt 0 ]]; then
  print_watch_coconut "plan writes naught; to stop the watch" \
    "rhx $SKILL --pr $PR --in $WATCH_REPO --mode apply"
fi
