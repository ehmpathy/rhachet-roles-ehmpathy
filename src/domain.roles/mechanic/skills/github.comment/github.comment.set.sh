#!/usr/bin/env bash
######################################################################
# .what = upsert one pr comment, or the pr body
#
# .why  = a --key turns "post a comment" into "this comment says this":
#         absent → post, differs → edit, same → no-op. a re-run never doubles
#
# usage:
#   rhx github.comment.set --pr 69 --key status --from ./status.md [--mode apply]
#   rhx github.comment.set --pr 69 --reply-to <id> --key answer --from ./a.md
#   rhx github.comment.set --pr 69 --id <id> --kind issue|review --from ./a.md
#   rhx github.comment.set --pr 69 --kind body --from ./pr.md
#   rhx github.comment.set --help    # every flag
#
# guarantee:
#   - plan by default; apply reads back + hash-checks
#   - refuses a new comment with no --key, a foreign or twin key (exit 2)
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=github.comment.operations.sh
source "$SKILL_DIR/github.comment.operations.sh"

PR=""
KEY=""
REPLY_TO=""
ID=""
KIND=""
FROM=""
REPO_IN=""
AUTH="$AUTH_DEFAULT"
MODE="plan"
OUTPUT="tree"

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  print_turtle_header "heres the wave..."
  print_tree_start "github.comment.set — upsert one comment of a pull request, or its description"
  echo "   ├─ usage: rhx github.comment.set --pr <n> (--key <k> [--reply-to <id>] | --id <id> --kind issue|review | --kind body) --from <path|@stdin> [--mode plan|apply]"
  echo "   ├─ targets"
  echo "   │  ├─ --key <k>                     top-level comment: absent → POST, differs → PATCH, same → no-op"
  echo "   │  ├─ --reply-to <id> --key <k>     a reply in that review thread, same upsert"
  echo "   │  ├─ --id <id> --kind <kind>       edit a known comment; kind = issue | review"
  echo "   │  └─ --kind body                   the pr description"
  echo "   ├─ inputs"
  echo "   │  ├─ --pr <n>                      required"
  echo "   │  ├─ --from <path|@stdin>          the body; posted as '🐢 ' + body (+ a hidden key marker)"
  echo "   │  ├─ --in <owner/name>             default: the cwd's github origin; home orgs only (${ORGS_HOME[*]})"
  echo "   │  ├─ --auth                        as-ehmpath (default; the env token, else the keyrack) | as-human"
  echo "   │  ├─ --mode                        plan (default, no write) | apply (write, read back, hash-check)"
  echo "   │  └─ --output                      tree (default) | json"
  echo "   ├─ example: rhx github.comment.set --pr 69 --key status --from ./status.md --mode apply"
  echo "   └─ exit: 0 planned, written, or no-op; 1 malfunction; 2 constraint"
}

# the caller's argv, kept whole: a plan's hint and a refusal's fix name the exact command
ORIG_ARGS=("$@")

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" github.comment.set \
    --skill --repo --role --pr --key --reply-to --id --kind --from --in --auth --mode --output
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --key) KEY="${2:-}"; shift 2 ;;
    --reply-to) REPLY_TO="${2:-}"; shift 2 ;;
    --id) ID="${2:-}"; shift 2 ;;
    --kind) KIND="${2:-}"; shift 2 ;;
    --from) FROM="${2:-}"; shift 2 ;;
    --in) REPO_IN="${2:-}"; shift 2 ;;
    --auth) AUTH="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx github.comment.set --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" github.comment.set
check_auth_arg "$AUTH"
check_mode_arg "$MODE"
[[ -n "$FROM" ]] || fail_comment_constraint "--from <path|@stdin> is required" "--from ./reply.md"
[[ "$FROM" == "@stdin" || -f "$FROM" ]] || fail_comment_constraint "--from '$FROM' is not a file" "name a body file that exists"$'\n'"pipe the body in via --from @stdin"

# .what = the target a set names: body, id, key, or thread (a keyed reply); empty if none
# .why  = four targets, each with its own endpoint; the target is never guessed
as_set_target() {
  local kind="$1" id="$2" key="$3" reply_to="$4"
  [[ "$kind" == "body" ]] && { echo "body"; return 0; }
  [[ -n "$id" ]] && { echo "id"; return 0; }
  [[ -n "$key" && -n "$reply_to" ]] && { echo "thread"; return 0; }
  [[ -n "$key" ]] && { echo "key"; return 0; }
  echo ""
}

# .what = is this target matched by its key (top-level or thread)?
# .why  = both keyed targets share the key match and the twin and foreign refusals
is_keyed_target() {
  [[ "$1" == "key" || "$1" == "thread" ]]
}

TARGET="$(as_set_target "$KIND" "$ID" "$KEY" "$REPLY_TO")"

# refuse no target: an unkeyed post would double on every retry
if [[ -z "$TARGET" ]]; then
  [[ -z "$KIND" ]] || fail_comment_constraint "--kind $KIND pairs with --id; alone, only --kind body names a target" "add --id <id>"$'\n'"drop --kind"
  fail_comment_constraint "a new comment needs --key; an unkeyed post would double on every retry" \
    "rhx github.comment.set $(as_comment_cmd_target "$PR") --key <slug> --from <file>   # a keyed comment"$'\n'"rhx github.comment.set $(as_comment_cmd_target "$PR") --id <id> --kind issue|review --from <file>   # edit one known comment"$'\n'"rhx github.comment.set $(as_comment_cmd_target "$PR") --kind body --from <file>   # the pr description"
fi

# refuse flags the target cannot use
if [[ "$TARGET" == "body" && -n "$ID$KEY$REPLY_TO" ]]; then
  fail_comment_constraint "--kind body targets the pr description alone; it takes no --id, --key, or --reply-to" "drop --id, --key, and --reply-to"$'\n'"drop --kind body"
fi
[[ "$TARGET" != "id" ]] || check_comment_id_kind "$ID" "$KIND" github.comment.set
if [[ "$TARGET" == "id" && -n "$KEY$REPLY_TO" ]]; then
  fail_comment_constraint "--id edits one known comment; it takes no --key or --reply-to" "drop --key and --reply-to"$'\n'"drop --id"
fi
[[ -z "$KEY" ]] || check_comment_key "$KEY"
if is_keyed_target "$TARGET" && [[ -n "$KIND" ]]; then
  fail_comment_constraint "--kind pairs with --id or names body; a keyed comment needs none" "drop --kind"
fi
if [[ "$TARGET" == "thread" && ! "$REPLY_TO" =~ ^[0-9]+$ ]]; then
  fail_comment_constraint "--reply-to must be a numeric review comment id, got '$REPLY_TO'" "rhx github.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
fi

# read the body
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# .note = stdin is read as fd 0, never via /dev/stdin, which a socket stdin refuses (ENXIO)
[[ "$FROM" != "@stdin" ]] || as_body_trimmed >"$WORK/text.md"
[[ "$FROM" == "@stdin" ]] || as_body_trimmed <"$FROM" >"$WORK/text.md"
# a body piped via @stdin is spent once read, so an apply must pipe it again
STDIN_NOTE=""
[[ "$FROM" == "@stdin" ]] && STDIN_NOTE="   # pipe the body in again"
FIX_EMPTY="write the body into '$FROM', then rerun"
[[ "$FROM" == "@stdin" ]] && FIX_EMPTY="cat ./reply.md | $(as_comment_cmd_in_mode set "$MODE" "${ORIG_ARGS[@]}")   # pipe a body that is not empty"
[[ -s "$WORK/text.md" ]] || fail_comment_constraint "the body from '$FROM' is empty" "$FIX_EMPTY"

set_comment_repo "$REPO_IN" github.comment.set
set_comment_auth "$AUTH"
set_comment_login

# find the target and its current state
CURRENT=""
METHOD=""
ENDPOINT=""
READ_BACK=""
LABEL=""
FOREIGN_AUTHOR=""
if [[ "$TARGET" == "body" ]]; then
  LABEL="$COMMENT_REPO#$PR, pr description"
  rc=0
  CURRENT="$(get_one_gh_resource "repos/$COMMENT_REPO/pulls/$PR")" || rc=$?
  # a 404 here is the pr itself: the shared visibility refusal names it
  [[ "$rc" == "3" ]] && fail_comment_absent "$PR" "no pull request $COMMENT_REPO#$PR" "check --pr and --in"
  [[ "$rc" == "0" ]] || exit "$rc"
  METHOD="PATCH"
  ENDPOINT="repos/$COMMENT_REPO/pulls/$PR"
  READ_BACK="$ENDPOINT"
fi
if [[ "$TARGET" == "id" ]]; then
  LABEL="$COMMENT_REPO#$PR, $KIND comment $ID"
  ENDPOINT="$(get_comment_endpoint "$COMMENT_REPO" "$KIND" "$ID")"
  rc=0
  CURRENT="$(get_one_gh_resource "$ENDPOINT")" || rc=$?
  [[ "$rc" == "3" ]] && check_comment_kind_not_swapped "$PR" "$KIND" "$ID"
  [[ "$rc" == "3" ]] && fail_comment_absent "$PR" "no $KIND comment $ID on $COMMENT_REPO to edit" "rhx github.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  [[ "$rc" == "0" ]] || exit "$rc"
  is_comment_on_pr "$CURRENT" "$PR" || fail_comment_constraint "$KIND comment $ID is not on $COMMENT_REPO#$PR" "rhx github.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  AUTHOR="$(printf '%s' "$CURRENT" | jq -r '.user.login // ""')"
  is_author_self "$AUTHOR" || FOREIGN_AUTHOR="$AUTHOR"
  METHOD="PATCH"
  READ_BACK="$ENDPOINT"
fi
# list the top-level comments a key may match
if [[ "$TARGET" == "key" ]]; then
  LABEL="$COMMENT_REPO#$PR, top-level comment key=$KEY"
  # a list of an unseen pr 404s; prove the pr first, so that reads as a constraint
  check_pr_visible "$PR"
  LIST="$(get_all_gh_resources "repos/$COMMENT_REPO/issues/$PR/comments")" || exit $?
  POST_ENDPOINT="repos/$COMMENT_REPO/issues/$PR/comments"
  ONE_KIND="issue"
fi

# list the replies of one thread a reply key may match; the thread must sit on --pr
if [[ "$TARGET" == "thread" ]]; then
  LABEL="$COMMENT_REPO#$PR, reply to review comment $REPLY_TO, key=$KEY"
  check_reply_parent_on_pr "$PR" "$REPLY_TO"
  LIST="$(get_all_gh_resources "repos/$COMMENT_REPO/pulls/$PR/comments")" || exit $?
  # a reply to a reply joins the thread root, so the post and the match both use the root
  REPLY_ROOT="$(get_thread_root_id "$LIST" "$REPLY_TO")"
  LIST="$(get_replies_in_thread "$LIST" "$REPLY_TO")"
  POST_ENDPOINT="repos/$COMMENT_REPO/pulls/$PR/comments/$REPLY_ROOT/replies"
  ONE_KIND="review"
fi

# match the key: own one → edit, none → post, a twin or a foreign holder → refuse
# .note = deliberate hazard: github offers no create-if-absent, so two runs that
#         list "absent" at once can both POST — a twin. the window is the gap
#         between list and POST. the next run of any verb on that key refuses
#         the twin and names `del --id <newest>`, so a twin never goes unseen
if is_keyed_target "$TARGET"; then
  MATCHES="$(get_key_matches "$LIST" "$KEY")"
  check_key_matches_claimable "$MATCHES" "$KEY" "$ONE_KIND" "$PR" set
  OWN="$(printf '%s' "$MATCHES" | jq -c '.own')"
  OWN_COUNT="$(get_count_of_comments "$OWN")"

  # one own match → edit it; none → post
  if [[ "$OWN_COUNT" == "1" ]]; then
    CURRENT="$(get_first_comment "$OWN")"
    ID="$(printf '%s' "$CURRENT" | jq -r '.id')"
    METHOD="PATCH"
    ENDPOINT="$(get_comment_endpoint "$COMMENT_REPO" "$ONE_KIND" "$ID")"
    READ_BACK="$ENDPOINT"
  fi
  if [[ "$OWN_COUNT" == "0" ]]; then
    METHOD="POST"
    ENDPOINT="$POST_ENDPOINT"
  fi
fi

# refuse an edit of another author's comment, before github would
if [[ -n "$FOREIGN_AUTHOR" ]]; then
  fail_comment_constraint "$KIND comment $ID is by $FOREIGN_AUTHOR, not by $COMMENT_LOGIN ($AUTH)" "rerun with --auth $(as_auth_other "$AUTH")   # if $FOREIGN_AUTHOR is that login; else only $FOREIGN_AUTHOR can edit it"
fi

# compose the posted body
if [[ "$TARGET" == "body" ]]; then
  cp "$WORK/text.md" "$WORK/posted.md"
fi
if is_keyed_target "$TARGET"; then
  { as_body_unmarked <"$WORK/text.md" | as_body_prefixed; printf '\n\n'; as_key_marker "$KEY"; } >"$WORK/posted.md"
fi
if [[ "$TARGET" == "id" ]]; then
  KEY_KEPT="$(printf '%s' "$CURRENT" | jq -j '.body // ""' | as_key_from_body)"
  as_body_unmarked <"$WORK/text.md" | as_body_prefixed >"$WORK/posted.md"
  if [[ -n "$KEY_KEPT" ]]; then
    { printf '\n\n'; as_key_marker "$KEY_KEPT"; } >>"$WORK/posted.md"
  fi
fi
NEW_SHA="$(as_body_trimmed <"$WORK/posted.md" | as_sha256)"
NEW_BYTES="$(as_body_trimmed <"$WORK/posted.md" | as_bytes_count)"
check_body_under_cap "$(as_body_trimmed <"$WORK/posted.md" | as_chars_count)"

# decide the verdict
CUR_SHA=""
CUR_BYTES=""
VERDICT="would post"
if [[ -n "$CURRENT" ]]; then
  CUR_SHA="$(printf '%s' "$CURRENT" | as_sha256_of_json_body)"
  CUR_BYTES="$(printf '%s' "$CURRENT" | as_bytes_of_json_body)"
  VERDICT="would edit"
  [[ "$CUR_SHA" == "$NEW_SHA" ]] && VERDICT="no-op"
fi

# .what = emit the result of set: the tree, or the json contract
#         { mode, verdict, target, method, endpoint, id, url, sha256: { current, new, readback } }
# .why  = one leaf renders every verdict, so plan, write, and no-op read alike
CUR_URL=""
[[ -n "$CURRENT" ]] && CUR_URL="$(printf '%s' "$CURRENT" | jq -r '.html_url // empty')"
emit() {
  local verdict="$1" id="${2:-}" url="${3:-}" back="${4:-}"
  # the pr body is no comment, so it has no comment id: json says null, as get does
  local id_json="$id" id_label="id"
  if [[ "$TARGET" == "body" ]]; then
    id_json=""
    id_label="pr"
  fi
  if [[ "$OUTPUT" == "json" ]]; then
    jq -n --arg verdict "$verdict" --arg target "$LABEL" --arg method "$METHOD" --arg endpoint "$ENDPOINT" \
      --arg id "$id_json" --arg url "$url" --arg cur "$CUR_SHA" --arg new "$NEW_SHA" --arg back "$back" --arg mode "$MODE" '{
        mode: $mode, verdict: $verdict, target: $target, method: $method, endpoint: $endpoint,
        id: (if $id == "" then null else ($id | tonumber) end), url: (if $url == "" then null else $url end),
        sha256: { current: (if $cur == "" then null else $cur end), new: $new, readback: (if $back == "" then null else $back end) }
      }'
    return 0
  fi
  print_turtle_header "heres the wave..."
  print_tree_start "github.comment.set --mode $MODE"
  echo "   ├─ target: $LABEL"
  echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
  # a no-op writes naught, so its endpoint line must not read as a write
  local endpoint_line="$METHOD $ENDPOINT"
  [[ "$VERDICT" == "no-op" ]] && endpoint_line="none (no-op; an edit would $METHOD $ENDPOINT)"
  echo "   ├─ endpoint: $endpoint_line"
  if [[ -n "$CUR_SHA" ]]; then
    # one current shape across the family: author, url, bytes, sha256, as del shows
    echo "   ├─ current"
    echo "   │  ├─ author: $(printf '%s' "$CURRENT" | jq -r '.user.login // .author // "?"')"
    echo "   │  ├─ url: $(printf '%s' "$CURRENT" | jq -r '.html_url // .url // "?"')"
    echo "   │  ├─ bytes: $CUR_BYTES"
    echo "   │  └─ sha256: $CUR_SHA"
  fi
  echo "   ├─ new"
  echo "   │  ├─ from: $FROM"
  echo "   │  ├─ bytes: $NEW_BYTES"
  echo "   │  └─ sha256: $NEW_SHA"
  if [[ -z "$id" ]]; then
    echo "   └─ verdict: $verdict"
    [[ "$MODE" == "plan" ]] && print_comment_hint "plan writes naught; to write it" "$(as_comment_cmd_in_mode set apply "${ORIG_ARGS[@]}")${STDIN_NOTE}"
    return 0
  fi
  echo "   └─ verdict: $verdict"
  echo "      ├─ $id_label: $id"
  if [[ -n "$back" ]]; then
    echo "      ├─ url: $url"
    echo "      └─ read-back sha256: $back"
    return 0
  fi
  echo "      └─ url: $url"
}

# no-op: the target already says this
if [[ "$VERDICT" == "no-op" ]]; then
  emit "already there — no-op" "${ID:-$PR}" "$CUR_URL"
  exit 0
fi

# plan: say what would happen, write naught
if [[ "$MODE" == "plan" ]]; then
  emit "$VERDICT (plan)"
  exit 0
fi

# write
RESP="$(set_one_gh_resource "$METHOD" "$ENDPOINT" "$WORK/posted.md")" || exit $?
NEW_ID="$(printf '%s' "$RESP" | jq -r '.id // empty')"
NEW_URL="$(printf '%s' "$RESP" | jq -r '.html_url // empty')"
[[ "$TARGET" == "body" ]] && NEW_ID="$PR"
[[ -n "$NEW_ID" ]] || fail_comment_malfunction "gh api $METHOD $ENDPOINT returned no id" "response: $RESP"$'\n'"state: the write may have landed; its id is unknown" \
    "rerun the same command: a keyed set finds the comment by its key, so a rerun converges and names the id"
[[ -n "$READ_BACK" ]] || READ_BACK="$(get_comment_endpoint "$COMMENT_REPO" "$ONE_KIND" "$NEW_ID")"

# read back, and compare the hash
rc=0
BACK="$(get_one_gh_resource "$READ_BACK")" || rc=$?
[[ "$rc" == "3" ]] && fail_comment_malfunction "the write is absent on read-back" "endpoint: $READ_BACK"$'\n'"state: github accepted the write, yet the comment does not read back" \
    "rerun the same command: set posts again only where the key reads absent, so a rerun converges"
[[ "$rc" == "0" ]] || exit "$rc"
BACK_SHA="$(printf '%s' "$BACK" | as_sha256_of_json_body)"
if [[ "$BACK_SHA" != "$NEW_SHA" ]]; then
  fail_comment_malfunction "read-back hash mismatch on $READ_BACK" "$(printf 'posted sha256:    %s\nread-back sha256: %s\nurl: %s\nstate: the comment is live, with a body other than the one posted\nlive body: rhx github.comment.get %s --id %s --kind %s' "$NEW_SHA" "$BACK_SHA" "$NEW_URL" "$(as_comment_cmd_target "$PR")" "$NEW_ID" "$ONE_KIND")" \
    "rerun the same command: set edits that comment in place, so a rerun converges"
fi
ACTED="posted"
[[ "$METHOD" == "PATCH" ]] && ACTED="edited"
emit "$ACTED, read back, hash matches" "$NEW_ID" "$NEW_URL" "$BACK_SHA"