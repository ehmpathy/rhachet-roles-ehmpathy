#!/usr/bin/env bash
######################################################################
# .what = read a pull's description
#
# .why  = a driver reads its own pull's body before it edits it; get → edit
#         → set is how a pull's words change
#
# usage:
#   rhx git.pull.description get                          # this branch's pull
#   rhx git.pull.description get --pr 69                  # a pull by number
#   rhx git.pull.description get --to ./.temp/body.md     # the bare body, into a file to edit
#   rhx git.pull.description.get --help                   # every flag
#
# guarantee:
#   - reads the pull only; --to writes the one file it names, never the pull
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../git.pull/git.pull.operations.sh
source "$SKILL_DIR/../git.pull/git.pull.operations.sh"

SKILL="git.pull.description.get"
PR=""
REPO_IN=""
AUTH="$AUTH_DEFAULT"
OUTPUT="tree"
TO=""

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  cat <<'EOF'
usage: git.pull.description.get [--pr <n>] [--in <owner/name>] [--auth as-ehmpath|as-human] [--output tree|json|text] [--to <path>]

options:
  --pr <n>                     the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --auth as-ehmpath|as-human   who reads (default: as-ehmpath)
  --output tree|json|text      the output shape (default: tree); text = the body alone.
                               via rhx, stdout opens with rhx's header line; to edit, use --to
  --to <path>                  also write the bare body to <path>, to edit, then set --from <path>
  --help, -h                   show this help

example:
  rhx git.pull.description get --to ./.temp/body.md
  rhx git.pull.description set --from ./.temp/body.md
EOF
}

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" "$SKILL" \
    --skill --repo --role --pr --in --auth --output --to
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --in) REPO_IN="${2:-}"; shift 2 ;;
    --auth) AUTH="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --to) TO="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx $SKILL --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_pull_get_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" "$SKILL"
check_auth_arg "$AUTH"
check_pull_field_file_arg "$TO"

# find the pull, under the chosen credential
set_pull_target "$PR" "$REPO_IN" "$SKILL" "$AUTH"
PR="$COMMENT_PR"
PULL="$(get_one_gh_pull "$PR")" || exit $?
BODY="$(printf '%s' "$PULL" | as_pull_field_from_json body)"
URL="$(printf '%s' "$PULL" | as_pull_url_from_json)"
AUTHOR="$(printf '%s' "$PULL" | as_pull_author_from_json)"

# --to: the bare body lands in a file, so a get → edit → set round trip never
# passes through stdout, where rhx prints its own header first
[[ -n "$TO" ]] && set_pull_field_into_file "$BODY" "$TO"

# text: the bare body on stdout, for a direct call of the skill file
if [[ "$OUTPUT" == "text" ]]; then
  printf '%s\n' "$BODY"
  exit 0
fi

SHA="$(printf '%s' "$BODY" | as_sha256)"
BYTES="$(printf '%s' "$BODY" | as_bytes_count)"

# json: one object
if [[ "$OUTPUT" == "json" ]]; then
  jq -n --arg repo "$COMMENT_REPO" --arg pr "$PR" --arg url "$URL" --arg author "$AUTHOR" \
    --arg body "$BODY" --arg sha "$SHA" --argjson bytes "$BYTES" --arg to "$TO" \
    '{ repo: $repo, pr: ($pr | tonumber), url: $url, author: $author, bytes: $bytes, sha256: $sha,
       to: (if $to == "" then null else $to end), body: $body }'
  exit 0
fi

# tree: the target, then the body under its own branch
print_turtle_header "heres the wave..."
print_tree_start "git.pull.description.get"
echo "   ├─ target: $COMMENT_REPO#$PR, description"
echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
echo "   ├─ url: $URL"
echo "   ├─ author: $AUTHOR"
[[ -n "$TO" ]] && echo "   ├─ to: $TO"
echo "   ├─ bytes: $BYTES"
echo "   ├─ sha256: $SHA"
echo "   └─ text"
if [[ -z "$BODY" ]]; then
  echo "      (empty)"
fi
if [[ -n "$BODY" ]]; then
  printf '%s\n' "$BODY" | as_tree_indented_text '      '
fi
# the hint holds the steps in order, never alternatives; set plans first
FILE="${TO:-./.temp/body.md}"
TARGET="$(as_comment_cmd_target "$PR")"
echo ""
echo "🥥 did you know?"
echo "   └─ to edit it"
if [[ -z "$TO" ]]; then
  echo "      ├─ 1. rhx git.pull.description get${TARGET:+ $TARGET} --to $FILE"
  echo "      ├─ 2. edit $FILE"
fi
if [[ -n "$TO" ]]; then
  echo "      ├─ 1. edit $FILE"
fi
echo "      └─ $([[ -z "$TO" ]] && echo 3 || echo 2). rhx git.pull.description set${TARGET:+ $TARGET} --from $FILE   # plan; add --mode apply to write"
