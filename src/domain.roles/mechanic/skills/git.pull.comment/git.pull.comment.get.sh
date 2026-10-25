#!/usr/bin/env bash
######################################################################
# .what = read a pr's comments: the body, every comment, or one
#
# .why  = see what is there, and which rows carry your keys, before a write
#
# usage:
#   rhx git.pull.comment.get --pr 69 [--output json]
#   rhx git.pull.comment.get --pr 69 --id <id> --kind issue|review
#   rhx git.pull.comment.get --pr 69 --key status [--reply-to <id>]
#   rhx git.pull.comment.get --help    # every flag; --auth as-ehmpath|as-human on all three verbs
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.comment.operations.sh
source "$SKILL_DIR/git.pull.comment.operations.sh"

PR=""
ID=""
KEY=""
REPLY_TO=""
KIND=""
REPO_IN=""
AUTH="$AUTH_DEFAULT"
OUTPUT="tree"

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.pull.comment.get — read the comments of a pull request"
  echo "   ├─ usage: rhx git.pull.comment.get --pr <n> [--id <id> --kind issue|review | --key <k> [--reply-to <id>] | --kind body] [--in <o/r>] [--auth as-ehmpath|as-human] [--output tree|json]"
  echo "   ├─ inputs"
  echo "   │  ├─ --pr <n>                      required"
  echo "   │  ├─ --id <id> --kind <kind>       one comment, by id; kind = issue | review, never guessed"
  echo "   │  ├─ --key <k> [--reply-to <id>]   the current login's keyed comment (in that thread, with --reply-to)"
  echo "   │  ├─ --kind body                   the pr description alone"
  echo "   │  ├─ --in <owner/name>             default: the cwd's github origin; home orgs only (${ORGS_HOME[*]})"
  echo "   │  ├─ --auth                        as-ehmpath (default; the env token, else the keyrack) | as-human"
  echo "   │  └─ --output                      tree (default) | json"
  echo "   ├─ example: rhx git.pull.comment.get --pr 69"
  echo "   └─ exit: 0 shown; 1 malfunction; 2 constraint (bad input or absent target)"
}

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" git.pull.comment.get \
    --skill --repo --role --pr --id --key --reply-to --kind --in --auth --output
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --id) ID="${2:-}"; shift 2 ;;
    --key) KEY="${2:-}"; shift 2 ;;
    --reply-to) REPLY_TO="${2:-}"; shift 2 ;;
    --kind) KIND="${2:-}"; shift 2 ;;
    --in) REPO_IN="${2:-}"; shift 2 ;;
    --auth) AUTH="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx git.pull.comment.get --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" git.pull.comment.get
check_auth_arg "$AUTH"
[[ -z "$ID" || -z "$KEY" ]] || fail_comment_constraint "--id and --key are two reads; name one" "drop one"
[[ -z "$REPLY_TO" || -n "$KEY" ]] || fail_comment_constraint "--reply-to reads a keyed reply; it needs --key" "--reply-to $REPLY_TO --key <k>"
[[ -z "$REPLY_TO" || "$REPLY_TO" =~ ^[0-9]+$ ]] || fail_comment_constraint "--reply-to must be a numeric review comment id, got '$REPLY_TO'" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
[[ -z "$KEY" ]] || check_comment_key "$KEY"
if [[ -n "$ID" ]]; then
  check_comment_id_kind "$ID" "$KIND" git.pull.comment.get
fi
if [[ -z "$ID" && -n "$KIND" && "$KIND" != "body" ]]; then
  fail_comment_constraint "--kind $KIND pairs with --id; alone, only --kind body reads one target" "add --id <id>"$'\n'"drop --kind"
fi
[[ "$KIND" != "body" || -z "$KEY" ]] || fail_comment_constraint "a pr description holds no key" "drop --key"$'\n'"drop --kind body"
set_comment_repo "$REPO_IN" git.pull.comment.get
set_comment_auth "$AUTH"
set_comment_login

# .what = one github json resource (pr or comment) as a row: kind, id, author, key, size, hash, body
# .why  = the tree and the json read one row shape, whatever endpoint the row came from
shape() {
  local kind="$1" json="$2" sha bytes key
  sha="$(printf '%s' "$json" | as_sha256_of_json_body)"
  bytes="$(printf '%s' "$json" | as_bytes_of_json_body)"
  key="$(printf '%s' "$json" | jq -j '.body // ""' | as_key_from_body)"
  printf '%s' "$json" | jq -c --arg kind "$kind" --arg sha "$sha" --argjson bytes "$bytes" --arg key "$key" '{
    kind: $kind,
    id: (if $kind == "body" then null else .id end),
    author: (.user.login // null),
    created_at: (.created_at // null),
    in_reply_to: (.in_reply_to_id // null),
    key: (if $key == "" then null else $key end),
    bytes: $bytes,
    sha256: $sha,
    url: (.html_url // null),
    body: (.body // "")
  }'
}

# .what = every comment of a github list as rows, one per line
# .why  = a full read shapes issue and review lists the one way `shape` does
shape_all() {
  local kind="$1" list="$2" row
  while IFS= read -r row; do
    [[ -n "$row" ]] || continue
    shape "$kind" "$row"
    echo
  done < <(printf '%s' "$list" | jq -c '.[]')
}

# .what = a stream of rows, as one json array
# .why  = a one-row read and an every-row read hand the tree and json one shape
as_row_list() {
  jq -cs '.'
}

# .what = rows in read order: the body first, then by creation time
# .why  = a pr reads top to bottom; the body opens it
as_rows_sorted() {
  jq -cs 'sort_by(if .kind == "body" then "" else .created_at end, (.id // 0))'
}

# .what = the rows, each review row given its thread state: "open" | "resolved"
# .why  = a reader must see which review threads still wait on an answer
# .note = a review row graphql does not name reads "open"; a non-review row reads null
as_rows_with_thread_state() {
  printf '%s' "$1" | jq -c --argjson states "$2" '
    map(.thread = (if .kind == "review" then ($states["\(.id)"] // "open") else null end))'
}

# .what = the rows of one kind that carry a key, split by author: { own, foreign }
# .why  = --key reads the current login's comment; a foreign holder is named, never hidden
# .note = a reply key is scoped to its thread root (reply != null)
get_rows_with_key() {
  local rows="$1" key="$2" kind="$3" reply="$4"
  printf '%s' "$rows" | jq -c --arg re "$COMMENT_KEY_CLAIM_REGEX" --arg login "$COMMENT_LOGIN" \
    --arg key "$key" --arg kind "$kind" --argjson reply "$reply" "$COMMENT_JQ_DEFS"'
    map(select(.kind == $kind and .key == $key and ($reply == null or .in_reply_to == $reply)))
    | { own: map(select(is_login_self(.author))), foreign: map(select(is_login_self(.author) | not)) }'
}

# .what = the row counts by kind, as one line
# .why  = the tree header names how many of each kind the read found
as_counts_line() {
  printf '%s' "$1" | jq -r '
    def count($k): map(select(.kind == $k)) | length;
    "\(count("body")) pr description, \(count("issue")) issue comments, \(count("review")) review comments"'
}

# .what = the rows as tree leaves: one branch per row, its url, size, hash, and body
# .why  = each row reads as a tree, with the body indented under it
print_rows_tree() {
  printf '%s' "$1" | jq -r '
    def indent(p): gsub("\r"; "") | sub("\n+$"; "") | split("\n") | map(p + . | sub(" +$"; "")) | join("\n");
    length as $n
    | if $n == 0 then "   └─ (no comments)" else
      ( to_entries[]
        | .key as $i | .value as $c
        | (if $i == $n - 1 then "   └─ " else "   ├─ " end) as $head
        | (if $i == $n - 1 then "      " else "   │  " end) as $pad
        | $head + "\(if $c.kind == "body" then "pr description" else "\($c.kind) comment" end)\(if $c.id then " \($c.id)" else "" end) by \($c.author // "?") at \($c.created_at // "?")"
          + (if $c.in_reply_to then "  reply-to=\($c.in_reply_to)" else "" end)
          + (if $c.thread then "  thread=\($c.thread)" else "" end)
          + (if $c.key then "  key=\($c.key)" else "" end)
          + "\n" + $pad + "├─ url: \($c.url // "?")"
          + "\n" + $pad + "├─ bytes: \($c.bytes)"
          + "\n" + $pad + "├─ sha256: \($c.sha256)"
          + "\n" + $pad + "└─ text"
          + (if ($c.body | length) == 0 then "\n" + $pad + "   (empty)" else "\n" + ($c.body | indent($pad + "   ")) end) )
      end'
}

# read one comment by id
LABEL="$COMMENT_REPO#$PR, every comment"
ROWS=""
if [[ -n "$ID" ]]; then
  LABEL="$COMMENT_REPO#$PR, $KIND comment $ID"
  rc=0
  ONE="$(get_one_gh_resource "$(get_comment_endpoint "$COMMENT_REPO" "$KIND" "$ID")")" || rc=$?
  [[ "$rc" == "3" ]] && check_comment_kind_not_swapped "$PR" "$KIND" "$ID"
  [[ "$rc" == "3" ]] && fail_comment_absent "$PR" "no $KIND comment $ID on $COMMENT_REPO" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  [[ "$rc" == "0" ]] || exit "$rc"
  is_comment_on_pr "$ONE" "$PR" || fail_comment_constraint "$KIND comment $ID is not on $COMMENT_REPO#$PR" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  ROWS="$(shape "$KIND" "$ONE" | as_row_list)"
fi

# read the pr itself, unless one comment was asked
if [[ -z "$ID" ]]; then
  rc=0
  PULL="$(get_one_gh_resource "repos/$COMMENT_REPO/pulls/$PR")" || rc=$?
  # a 404 here is the pr itself: the shared visibility refusal names it
  [[ "$rc" == "3" ]] && fail_comment_absent "$PR" "no pull request $COMMENT_REPO#$PR" "check --pr and --in"
  [[ "$rc" == "0" ]] || exit "$rc"
fi

# read the body alone
if [[ "$KIND" == "body" ]]; then
  LABEL="$COMMENT_REPO#$PR, pr description"
  ROWS="$(shape body "$PULL" | as_row_list)"
fi

# read every row: the body, every issue comment, every review comment (open and resolved threads)
if [[ -z "$ROWS" ]]; then
  ISSUE_ALL="$(get_all_gh_resources "repos/$COMMENT_REPO/issues/$PR/comments")" || exit $?
  REVIEW_ALL="$(get_all_gh_resources "repos/$COMMENT_REPO/pulls/$PR/comments")" || exit $?
  ROWS="$(
    {
      shape body "$PULL"
      echo
      shape_all issue "$ISSUE_ALL"
      shape_all review "$REVIEW_ALL"
    } | as_rows_sorted
  )"
fi

# name the thread state of each review row: open or resolved
if [[ "$(printf '%s' "$ROWS" | jq '[.[] | select(.kind == "review")] | length')" != "0" ]]; then
  THREAD_STATES="$(get_all_review_thread_states "$PR")" || exit $?
  ROWS="$(as_rows_with_thread_state "$ROWS" "$THREAD_STATES")"
fi

# narrow to a key, when asked
if [[ -n "$KEY" ]]; then
  LABEL="$COMMENT_REPO#$PR, top-level comment key=$KEY"
  [[ -n "$REPLY_TO" ]] && LABEL="$COMMENT_REPO#$PR, reply to review comment $REPLY_TO, key=$KEY"
  WANT_KIND="issue"
  REPLY_ROOT="null"
  if [[ -n "$REPLY_TO" ]]; then
    WANT_KIND="review"
    check_reply_parent_on_pr "$PR" "$REPLY_TO"
    REPLY_ROOT="$(get_thread_root_id "$REVIEW_ALL" "$REPLY_TO")"
  fi
  MATCHES="$(get_rows_with_key "$ROWS" "$KEY" "$WANT_KIND" "$REPLY_ROOT")"
  OWN="$(printf '%s' "$MATCHES" | jq -c '.own')"
  FOREIGN="$(printf '%s' "$MATCHES" | jq -c '.foreign')"

  # refuse a twin, as set and del do, so a reader never takes one at random
  check_key_has_no_twin "$OWN" "$KEY" "$WANT_KIND" "$PR"

  # name a foreign holder, so "absent for me" never reads as "absent"
  if [[ "$(get_count_of_comments "$OWN")" == "0" && "$(get_count_of_comments "$FOREIGN")" != "0" ]]; then
    HOLDER="$(get_first_comment "$FOREIGN" | jq -r '.author // "?"')"
    HOLDER_ID="$(get_first_comment "$FOREIGN" | jq -r '.id')"
    fail_comment_key_is_foreign "$KEY" "$PR" "$HOLDER" "$HOLDER_ID" "$WANT_KIND" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR") --id $HOLDER_ID --kind $WANT_KIND"
  fi
  [[ "$(get_count_of_comments "$OWN")" != "0" ]] || fail_comment_constraint "no comment carries key '$KEY' on $COMMENT_REPO#$PR${REPLY_TO:+ in thread $REPLY_TO}" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists every row and its key"
  ROWS="$OWN"
fi

# emit json
if [[ "$OUTPUT" == "json" ]]; then
  printf '%s' "$ROWS" | jq .
  exit 0
fi

# emit the tree
print_turtle_header "heres the wave..."
print_tree_start "git.pull.comment.get"
echo "   ├─ target: $LABEL"
echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
echo "   ├─ counts: $(as_counts_line "$ROWS")"
print_rows_tree "$ROWS"