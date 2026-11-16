#!/usr/bin/env bash
######################################################################
# .what = read a pull's description
#
# .why  = a driver reads its own pull's body before it edits it; get → edit
#         → set is how a pull's words change
#
# usage:
#   rhx git.pull.description get                            # this branch's pull
#   rhx git.pull.description get --which 69                    # a pull by number
#   rhx git.pull.description get --into ./.temp/body.md     # the bare body, into a file to edit
#   rhx git.pull.description.get --help                     # every flag
#
# guarantee:
#   - reads the pull only; --into writes the one file it names, never the pull
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
INTO=""

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  cat <<'EOF'
usage: git.pull.description.get [--which <n>] [--in <owner/name>] [--auth as-ehmpath|as-human] [--output tree|json|text] [--into <path>]

options:
  --which <n>                  the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --auth as-ehmpath|as-human   who reads (default: as-ehmpath)
  --output tree|json|text      the output shape (default: tree); text = the body alone.
                               via rhx, stdout opens with rhx's header lines: for json parse
                               from the first {; to edit the body, use --into
  --into <path>                also write the bare body into <path>, for you to edit and pass to
                               set --from <path>. <path> must sit inside this repo, untracked by git
  --help, -h                   show this help

example:
  rhx git.pull.description get --into ./.temp/body.md
  rhx git.pull.description set --from ./.temp/body.md
EOF
}

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" "$SKILL" \
    --skill --repo --role --which --in --auth --output --into
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --which) PR="${2:-}"; shift 2 ;;
    --in) REPO_IN="${2:-}"; shift 2 ;;
    --auth) AUTH="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --into) INTO="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx $SKILL --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_pull_get_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" "$SKILL"
check_auth_arg "$AUTH"
check_pull_field_file_arg "$INTO" ./.temp/body.md

# find the pull, under the chosen credential; the hint keeps the target as the caller named it
PR_IN="$PR"
set_pull_target "$PR" "$REPO_IN" "$SKILL" "$AUTH"
PR="$COMMENT_PR"
PULL="$(get_one_gh_pull "$PR")" || exit $?
BODY="$(printf '%s' "$PULL" | as_pull_field_from_json body)"
URL="$(printf '%s' "$PULL" | as_pull_url_from_json)"
AUTHOR="$(printf '%s' "$PULL" | as_pull_author_from_json)"
STATE="$(printf '%s' "$PULL" | as_pull_state_from_json)"

# --into: the bare body lands in a file, so a get → edit → set round trip never
# passes through stdout, where rhx prints its own header first
[[ -n "$INTO" ]] && set_pull_field_into_file "$BODY" "$INTO"

# text: the bare body on stdout, for a direct call of the skill file
if [[ "$OUTPUT" == "text" ]]; then
  printf '%s\n' "$BODY"
  exit 0
fi

SHA="$(printf '%s' "$BODY" | as_sha256)"
BYTES="$(printf '%s' "$BODY" | as_bytes_count)"

# json: one object
if [[ "$OUTPUT" == "json" ]]; then
  jq -n --arg repo "$COMMENT_REPO" --arg pr "$PR" --arg url "$URL" --arg author "$AUTHOR" --arg state "$STATE" \
    --arg body "$BODY" --arg sha "$SHA" --argjson bytes "$BYTES" --arg into "$INTO" \
    '{ repo: $repo, pr: ($pr | tonumber), url: $url, author: $author, state: $state, bytes: $bytes, sha256: $sha,
       into: (if $into == "" then null else $into end), body: $body }'
  exit 0
fi

# tree: the target, then the body under its own branch
print_turtle_header "heres the wave..."
print_tree_start "git.pull.description.get"
echo "   ├─ target: $COMMENT_REPO#$PR, description"
echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
echo "   ├─ author: $AUTHOR"
echo "   ├─ state: $STATE"
echo "   ├─ url: $URL"
[[ -n "$INTO" ]] && echo "   ├─ into: $INTO"
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
FILE="${INTO:-./.temp/body.md}"
TARGET="$(as_pull_cmd_target "$PR_IN" "$REPO_IN")"
echo ""
echo "🥥 did you know?"
echo "   └─ to edit it"
if [[ -z "$INTO" ]]; then
  echo "      ├─ 1. rhx git.pull.description get${TARGET:+ $TARGET} --into $FILE"
  echo "      ├─ 2. edit $FILE"
fi
if [[ -n "$INTO" ]]; then
  echo "      ├─ 1. edit $FILE"
fi
echo "      └─ $([[ -z "$INTO" ]] && echo 3 || echo 2). rhx git.pull.description set${TARGET:+ $TARGET} --from $FILE   # plan; add --mode apply to write"
