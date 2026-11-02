#!/usr/bin/env bash
######################################################################
# .what = set a pull's description, signed with the seaturtle attribution
#
# .why  = a driver rewrites its own pull's body without a human edit or a raw
#         `gh pr edit`; every body it sets ends in the one attribution
#         git.commit.push declares, whatever the caller passed in
#
# usage:
#   rhx git.pull.description set --from ./.temp/body.md                           # plan
#   rhx git.pull.description set --from ./.temp/body.md --mode apply
#   rhx git.pull.description set --pr 69 --from @stdin --mode apply               # a piped body
#   rhx git.pull.description.set --help                                           # every flag
#
# guarantee:
#   - strips a claude code line, a co-authored-by trailer (any case), and a
#     prior seaturtle footer; then appends one footer (as_pr_body_attributed)
#   - writes only a pull its own credential opened
#   - plan by default; apply writes, reads back, and compares the sha256
#   - a body that already reads so is a no-op; a rerun never stacks a footer
#   - refuses an empty or wordless body, and one over github's cap, before any write
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../git.pull/git.pull.operations.sh
source "$SKILL_DIR/../git.pull/git.pull.operations.sh"

SKILL="git.pull.description.set"
PR=""
FROM=""
REPO_IN=""
AUTH="$AUTH_DEFAULT"
MODE="plan"
OUTPUT="tree"

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  cat <<'EOF'
usage: git.pull.description.set --from <path|@stdin> [--pr <n>] [--in <owner/name>] [--mode plan|apply] [--auth as-ehmpath|as-human] [--output tree|json]

options:
  --from <path|@stdin>         the body; written with the seaturtle attribution as its last line
  --pr <n>                     the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --mode plan|apply            plan shows preview, apply writes and reads back (default: plan)
  --auth as-ehmpath|as-human   who writes (default: as-ehmpath)
  --output tree|json           the output shape (default: tree)
  --help, -h                   show this help

example:
  rhx git.pull.description get --to ./.temp/body.md
  rhx git.pull.description set --from ./.temp/body.md --mode apply
EOF
}

# the caller's argv, kept whole: a plan's hint names the exact command
ORIG_ARGS=("$@")

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" "$SKILL" \
    --skill --repo --role --pr --from --in --auth --mode --output
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --from) FROM="${2:-}"; shift 2 ;;
    --in) REPO_IN="${2:-}"; shift 2 ;;
    --auth) AUTH="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx $SKILL --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" "$SKILL"
check_auth_arg "$AUTH"
check_mode_arg "$MODE"
[[ -n "$FROM" ]] || fail_comment_constraint "--from <path|@stdin> is required" "rhx $SKILL --from ./.temp/body.md"
[[ "$FROM" == "@stdin" || -f "$FROM" ]] || fail_comment_constraint "--from '$FROM' is not a file" "name a body file that exists"$'\n'"pipe the body in via --from @stdin"

# read the body
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# .note = stdin is read as fd 0, never via /dev/stdin, which a socket stdin refuses (ENXIO)
[[ "$FROM" != "@stdin" ]] || as_body_trimmed >"$WORK/text.md"
[[ "$FROM" == "@stdin" ]] || as_body_trimmed <"$FROM" >"$WORK/text.md"
# a body piped via @stdin is spent once read, so an apply must pipe it again
STDIN_PIPE=""
STDIN_NOTE=""
[[ "$FROM" == "@stdin" ]] && STDIN_PIPE="cat ./.temp/body.md | " && STDIN_NOTE="   # pipe the same body in again"
FIX_EMPTY="write the body into '$FROM', then rerun"
[[ "$FROM" == "@stdin" ]] && FIX_EMPTY="cat ./.temp/body.md | $(as_comment_cmd_in_mode "$SKILL" "$MODE" "${ORIG_ARGS[@]}")   # pipe a body that is not empty"
[[ -s "$WORK/text.md" ]] || fail_comment_constraint "the body from '$FROM' is empty; an empty body would wipe the pull's description" "$FIX_EMPTY"

# compose the posted body: strip foreign attribution, sign once
TEXT="$(cat "$WORK/text.md")"
CLEAN="$(get_clean_pr_body "$TEXT")"
# refuse a body that holds only attribution lines: it would wipe the pull to a signature (fulcrum F10)
! is_text_wordless "$CLEAN" || fail_comment_constraint "the body from '$FROM' holds no words once its attribution lines are stripped" \
  "add the pull's own words to the body; attribution lines are stripped, and the footer is appended for you"
mapfile -t REPAIRS < <(get_all_pr_body_repairs "$TEXT")
as_pr_body_attributed "$TEXT" >"$WORK/posted.md"
NEW_SHA="$(as_body_trimmed <"$WORK/posted.md" | as_sha256)"
NEW_BYTES="$(as_body_trimmed <"$WORK/posted.md" | as_bytes_count)"
check_body_under_cap "$(as_body_trimmed <"$WORK/posted.md" | as_chars_count)" \
  "move a section into a keyed comment: rhx git.pull.comment set --key <name> --from <file>"

# find the pull, under the chosen credential
set_pull_target "$PR" "$REPO_IN" "$SKILL" "$AUTH"
PR="$COMMENT_PR"
CURRENT="$(get_one_gh_pull "$PR")" || exit $?
check_pull_by_self "$CURRENT" "$SKILL" "$STDIN_PIPE" "${ORIG_ARGS[@]}"
CUR_BODY="$(printf '%s' "$CURRENT" | as_pull_field_from_json body)"
CUR_SHA="$(printf '%s' "$CUR_BODY" | as_sha256)"
CUR_BYTES="$(printf '%s' "$CUR_BODY" | as_bytes_count)"
URL="$(printf '%s' "$CURRENT" | as_pull_url_from_json)"
AUTHOR="$(printf '%s' "$CURRENT" | as_pull_author_from_json)"
STATE="$(printf '%s' "$CURRENT" | as_pull_state_from_json)"
LABEL="$COMMENT_REPO#$PR, description"

# decide the verdict
VERDICT="would set"
[[ "$CUR_SHA" == "$NEW_SHA" ]] && VERDICT="no-op"

# the repairs: what the set changes in what the caller passed; a no-op changes naught,
# so tree and json both report none
[[ "$VERDICT" != "no-op" ]] || REPAIRS=()
REPAIR_LINE="$(as_pull_repair_summary "${REPAIRS[@]}")"
[[ "$VERDICT" != "no-op" ]] || REPAIR_LINE="none: the pull already reads so"

# .what = emit the result of set: the tree, or the json contract
#         { mode, verdict, target, pr, url, author, repairs, sha256: { current, new, readback } }
# .why  = one leaf renders every verdict, so plan, write, and no-op read alike
emit() {
  local verdict="$1" back="${2:-}"
  if [[ "$OUTPUT" == "json" ]]; then
    jq -n --arg mode "$MODE" --arg verdict "$verdict" --arg target "$LABEL" --arg pr "$PR" --arg url "$URL" \
      --arg author "$AUTHOR" --arg state "$STATE" --argjson repairs "$(as_json_array_of_args "${REPAIRS[@]}")" \
      --arg cur "$CUR_SHA" --arg new "$NEW_SHA" --arg back "$back" '{
        mode: $mode, verdict: $verdict, target: $target, pr: ($pr | tonumber), url: $url, author: $author, state: $state, repairs: $repairs,
        sha256: { current: $cur, new: $new, readback: (if $back == "" then null else $back end) }
      }'
    return 0
  fi
  print_turtle_header "heres the wave..."
  print_tree_start "$SKILL --mode $MODE"
  echo "   ├─ target: $LABEL"
  echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
  echo "   ├─ author: $AUTHOR"
  echo "   ├─ state: $STATE"
  echo "   ├─ current"
  echo "   │  ├─ url: $URL"
  echo "   │  ├─ bytes: $CUR_BYTES"
  # a plan shows the text it would overwrite, read fresh, beside the new text
  if [[ "$verdict" == *"(plan)" ]]; then
    echo "   │  ├─ sha256: $CUR_SHA"
    echo "   │  └─ text"
    printf '%s\n' "$CUR_BODY" | as_tree_indented_text '   │        '
    echo "   │"
  fi
  [[ "$verdict" == *"(plan)" ]] || echo "   │  └─ sha256: $CUR_SHA"
  echo "   ├─ new"
  echo "   │  ├─ from: $FROM"
  echo "   │  ├─ repair: $REPAIR_LINE"
  echo "   │  ├─ bytes: $NEW_BYTES"
  # a plan shows the body as it would land, so the repair is seen before it is written
  if [[ "$verdict" == *"(plan)" ]]; then
    echo "   │  ├─ sha256: $NEW_SHA"
    echo "   │  └─ text"
    # posted.md ends with no newline; printf adds one so the spacer sits on its own line
    printf '%s\n' "$(cat "$WORK/posted.md")" | as_tree_indented_text '   │        '
    echo "   │"
  fi
  [[ "$verdict" == *"(plan)" ]] || echo "   │  └─ sha256: $NEW_SHA"
  if [[ -z "$back" ]]; then
    echo "   └─ verdict: $verdict"
    [[ "$MODE" == "plan" && "$VERDICT" != "no-op" ]] && print_comment_hint "plan writes naught; to write it" "${STDIN_PIPE}$(as_comment_cmd_in_mode "$SKILL" apply "${ORIG_ARGS[@]}")${STDIN_NOTE}"
    return 0
  fi
  echo "   └─ verdict: $verdict"
  echo "      └─ read-back sha256: $back"
}

# no-op: the pull already reads so
if [[ "$VERDICT" == "no-op" ]]; then
  emit "already there — no-op"
  exit 0
fi

# plan: say what would happen, write naught
if [[ "$MODE" == "plan" ]]; then
  emit "$VERDICT (plan)"
  exit 0
fi

# write, then read back and compare the hash
set_one_gh_pull_field body "$PR" "$WORK/posted.md" \
  "edit the body so github accepts it, then rerun the same command" >/dev/null || exit $?
BACK="$(get_one_gh_pull "$PR")" || exit $?
BACK_SHA="$(printf '%s' "$BACK" | as_pull_field_from_json body | as_sha256)"
if [[ "$BACK_SHA" != "$NEW_SHA" ]]; then
  fail_comment_malfunction "read-back hash mismatch on $LABEL" "$(printf 'posted sha256:    %s\nread-back sha256: %s\nstate: the description is live, with a body other than the one posted\nlive body: rhx git.pull.description get %s' "$NEW_SHA" "$BACK_SHA" "$(as_comment_cmd_target "$PR")")" \
    "rerun the same command once: set overwrites the description, so a race converges" \
    "a second mismatch means github rewrites this body on write: compare it via the get above, and set the read-back text"
fi
emit "set, read back, hash matches" "$BACK_SHA"