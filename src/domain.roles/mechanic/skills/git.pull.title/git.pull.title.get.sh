#!/usr/bin/env bash
######################################################################
# .what = read a pull's title
#
# .why  = a driver checks its own pull's title before it retitles it
#
# usage:
#   rhx git.pull.title get                     # this branch's pull
#   rhx git.pull.title get --pr 69             # a pull by number
#   rhx git.pull.title get --output text       # the title alone, after rhx's own header line
#   rhx git.pull.title.get --help              # every flag
#
# guarantee:
#   - reads only; never writes
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../git.pull/git.pull.operations.sh
source "$SKILL_DIR/../git.pull/git.pull.operations.sh"

SKILL="git.pull.title.get"
PR=""
REPO_IN=""
AUTH="$AUTH_DEFAULT"
OUTPUT="tree"

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  cat <<'EOF'
usage: git.pull.title.get [--pr <n>] [--in <owner/name>] [--auth as-ehmpath|as-human] [--output tree|json|text]

options:
  --pr <n>                     the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --auth as-ehmpath|as-human   who reads (default: as-ehmpath)
  --output tree|json|text      the output shape (default: tree). via rhx, stdout opens with
                               rhx's header lines: for text (the title alone) read the last
                               line; for json parse from the first {
  --help, -h                   show this help

example:
  rhx git.pull.title get --pr 69
EOF
}

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" "$SKILL" \
    --skill --repo --role --pr --in --auth --output
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --in) REPO_IN="${2:-}"; shift 2 ;;
    --auth) AUTH="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx $SKILL --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_pull_get_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" "$SKILL"
check_auth_arg "$AUTH"

# find the pull, under the chosen credential
set_pull_target "$PR" "$REPO_IN" "$SKILL" "$AUTH"
PR="$COMMENT_PR"
PULL="$(get_one_gh_pull "$PR")" || exit $?
TITLE="$(printf '%s' "$PULL" | as_pull_field_from_json title)"
URL="$(printf '%s' "$PULL" | as_pull_url_from_json)"
AUTHOR="$(printf '%s' "$PULL" | as_pull_author_from_json)"
STATE="$(printf '%s' "$PULL" | as_pull_state_from_json)"

# text: the bare title
if [[ "$OUTPUT" == "text" ]]; then
  printf '%s\n' "$TITLE"
  exit 0
fi

# json: one object
if [[ "$OUTPUT" == "json" ]]; then
  jq -n --arg repo "$COMMENT_REPO" --arg pr "$PR" --arg url "$URL" --arg author "$AUTHOR" --arg state "$STATE" --arg title "$TITLE" \
    '{ repo: $repo, pr: ($pr | tonumber), url: $url, author: $author, state: $state, title: $title }'
  exit 0
fi

# tree
print_turtle_header "heres the wave..."
print_tree_start "git.pull.title.get"
echo "   ├─ target: $COMMENT_REPO#$PR, title"
echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
echo "   ├─ author: $AUTHOR"
echo "   ├─ state: $STATE"
echo "   ├─ url: $URL"
echo "   └─ title: $TITLE"