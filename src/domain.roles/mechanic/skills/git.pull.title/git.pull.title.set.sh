#!/usr/bin/env bash
######################################################################
# .what = set a pull's title
#
# .why  = a route grows past its first commit; the driver retitles its own
#         pull without a human edit or a raw `gh pr edit`
#
# usage:
#   rhx git.pull.title set --from ./.temp/title.md                    # plan
#   rhx git.pull.title set --from ./.temp/title.md --mode apply
#   rhx git.pull.title set --which 69 --from ./.temp/title.md --mode apply
#   echo 'feat(reef): map the kelp beds' | rhx git.pull.title set --from @stdin
#   rhx git.pull.title.set --help                                     # every flag
#
# guarantee:
#   - plan by default; apply writes, reads back, and compares the title
#   - writes only a pull its own credential opened
#   - a title that already reads so is a no-op
#   - refuses an empty, multi-line, or secret-shaped title before any write;
#     github's own refusal (422) names the fix (fulcrum F8)
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../git.pull/git.pull.operations.sh
source "$SKILL_DIR/../git.pull/git.pull.operations.sh"

SKILL="git.pull.title.set"
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
usage: git.pull.title.set --from <path|@stdin> [--which <n>] [--in <owner/name>] [--mode plan|apply] [--auth as-ehmpath|as-human] [--output tree|json]

options:
  --from <path|@stdin>         the new title, one line; from a file, or piped in
  --which <n>                  the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --mode plan|apply            plan shows preview, apply writes and reads back (default: plan)
  --auth as-ehmpath|as-human   who writes (default: as-ehmpath)
  --output tree|json           the output shape (default: tree)
  --help, -h                   show this help

example:
  rhx git.pull.title get --into ./.temp/title.md
  rhx git.pull.title set --from ./.temp/title.md --mode apply
  echo 'feat(reef): map the kelp beds' | rhx git.pull.title set --from @stdin --mode apply
EOF
}

# the caller's argv, kept whole: a plan's hint names the exact command
ORIG_ARGS=("$@")

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" "$SKILL" \
    --skill --repo --role --which --from --in --auth --mode --output
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --which) PR="${2:-}"; shift 2 ;;
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
[[ -n "$FROM" ]] || fail_comment_constraint "--from <path|@stdin> is required" "rhx $SKILL --from ./.temp/title.md"
[[ "$FROM" == "@stdin" || -f "$FROM" ]] || fail_comment_constraint "--from '$FROM' is not a file" "name a title file that exists"$'\n'"pipe the title in via --from @stdin"

# read the title
# .note = stdin is read as fd 0, never via /dev/stdin, which a socket stdin refuses (ENXIO)
TITLE=""
[[ "$FROM" != "@stdin" ]] || TITLE="$(as_body_trimmed)"
[[ "$FROM" == "@stdin" ]] || TITLE="$(as_body_trimmed <"$FROM")"
# a title piped via @stdin is spent once read, so an apply must pipe it again
STDIN_PIPE=""
STDIN_NOTE=""
[[ "$FROM" == "@stdin" ]] && STDIN_PIPE="cat ./.temp/title.md | " && STDIN_NOTE="   # pipe the same title in again"
FIX_EMPTY="write the title into '$FROM', then rerun"
[[ "$FROM" == "@stdin" ]] && FIX_EMPTY="echo 'feat(reef): map the kelp beds' | $(as_comment_cmd_in_mode "$SKILL" "$MODE" "${ORIG_ARGS[@]}")   # pipe a title that is not empty"
TITLE="$(printf '%s' "$TITLE" | as_pull_title_trimmed)"
! is_text_wordless "$TITLE" || fail_comment_constraint "the title from '$FROM' is empty; a pull needs a title" "$FIX_EMPTY"
[[ "$TITLE" != *$'\n'* ]] || fail_comment_constraint "the title from '$FROM' holds a newline; a pull title is one line" "keep the first line as the title; move the rest into the description"
check_pull_text_holds_no_secret "$TITLE" title "$FROM"

# find the pull, under the chosen credential
set_pull_target "$PR" "$REPO_IN" "$SKILL" "$AUTH"
PR="$COMMENT_PR"
CURRENT="$(get_one_gh_pull "$PR")" || exit $?
check_pull_by_self "$CURRENT" "$SKILL" "$STDIN_PIPE" "${ORIG_ARGS[@]}"
OLD_TITLE="$(printf '%s' "$CURRENT" | as_pull_field_from_json title)"
URL="$(printf '%s' "$CURRENT" | as_pull_url_from_json)"
AUTHOR="$(printf '%s' "$CURRENT" | as_pull_author_from_json)"
STATE="$(printf '%s' "$CURRENT" | as_pull_state_from_json)"
LABEL="$COMMENT_REPO#$PR, title"

# decide the verdict
VERDICT="would set"
[[ "$OLD_TITLE" == "$TITLE" ]] && VERDICT="no-op"

# .what = emit the result of set: the tree, or the json contract
#         { mode, verdict, target, pr, url, author, state, title: { old, new, readback } }
# .why  = one leaf renders every verdict, so plan, write, and no-op read alike
emit() {
  local verdict="$1" back="${2:-}" back_given="${3:-false}"
  if [[ "$OUTPUT" == "json" ]]; then
    jq -n --arg mode "$MODE" --arg verdict "$verdict" --arg target "$LABEL" --arg pr "$PR" --arg url "$URL" \
      --arg author "$AUTHOR" --arg state "$STATE" --arg old "$OLD_TITLE" --arg new "$TITLE" --arg back "$back" --arg back_given "$back_given" '{
        mode: $mode, verdict: $verdict, target: $target, pr: ($pr | tonumber), url: $url, author: $author, state: $state,
        title: { old: $old, new: $new, readback: (if $back_given == "true" then $back else null end) }
      }'
    return 0
  fi
  print_turtle_header "heres the wave..."
  print_tree_start "$SKILL --mode $MODE"
  echo "   ├─ target: $LABEL"
  echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
  echo "   ├─ author: $AUTHOR"
  echo "   ├─ state: $STATE"
  # a merged pull's squash commit is already written; say so, so a set here is not read as a release-note fix
  [[ "$STATE" == "merged" ]] && echo "   │  └─ note: the squash commit is already written; this edits the pull record only"
  echo "   ├─ url: $URL"
  echo "   ├─ old: $OLD_TITLE"
  echo "   ├─ new: $TITLE"
  if [[ "$back_given" != "true" ]]; then
    echo "   └─ verdict: $verdict"
    [[ "$MODE" == "plan" && "$VERDICT" != "no-op" ]] && print_comment_hint "plan writes naught; to write it" "${STDIN_PIPE}$(as_comment_cmd_in_mode "$SKILL" apply "${ORIG_ARGS[@]}")${STDIN_NOTE}"
    return 0
  fi
  echo "   └─ verdict: $verdict"
  echo "      └─ read-back: $back"
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

# write, then read back and compare
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
printf '%s' "$TITLE" >"$WORK/title.txt"
set_one_gh_pull_field title "$PR" "$WORK/title.txt" \
  "shorten or reword the title so github accepts it, then rerun the same command" >/dev/null || exit $?
BACK="$(get_one_gh_pull "$PR")" || exit $?
BACK_TITLE="$(printf '%s' "$BACK" | as_pull_field_from_json title)"
if [[ "$BACK_TITLE" != "$TITLE" ]]; then
  fail_comment_malfunction "read-back mismatch on $LABEL" "$(printf 'posted:    %s\nread-back: %s\nstate: the title is live, other than the one posted' "$TITLE" "$BACK_TITLE")" \
    "rerun the same command once: set overwrites the title, so a race converges" \
    "a second mismatch means github rewrites this title on write: set the read-back text, which github keeps as is"
fi
emit "set, read back, matches" "$BACK_TITLE" true
