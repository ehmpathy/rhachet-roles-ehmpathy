#!/usr/bin/env bash
######################################################################
# .what = upsert one pr comment
#
# .why  = a --key turns "post a comment" into "this comment says this":
#         absent → post, differs → edit, same → no-op. a re-run never doubles
#
# usage:
#   rhx git.pull.comment.set --which 69 --key status --from ./status.md [--mode apply]
#   rhx git.pull.comment.set --which 69 --reply-to <id> --key answer --from ./a.md
#   rhx git.pull.comment.set --which 69 --id <id> --kind issue|review --from ./a.md
#   rhx git.pull.comment.set --help    # every flag
#
# guarantee:
#   - every body it writes opens with 🐢; no flag omits it
#   - plan by default; apply reads back + hash-checks
#   - refuses a new comment with no --key, a foreign or twin key (exit 2)
#   - refuses the pr description; it is no comment
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.comment.operations.sh
source "$SKILL_DIR/git.pull.comment.operations.sh"

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
  cat <<'EOF'
usage: git.pull.comment.set (--key <k> [--reply-to <id>] | --id <id> --kind issue|review) --from <path|@stdin> [--which <n>] [--in <owner/name>] [--mode plan|apply] [--auth as-ehmpath|as-human] [--output tree|json]

options:
  --key <k>                    a top-level comment, upserted by key: absent → post, differs → edit, same → no-op
  --reply-to <id>              with --key: a reply in that review thread, upserted the same way
  --id <id> --kind <kind>      edit one known comment; kind = issue | review, never guessed
  --from <path|@stdin>         the body; written as '🐢 ' + body, plus a hidden key marker
  --which <n>                  the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --mode plan|apply            plan shows preview, apply writes and reads back (default: plan)
  --auth as-ehmpath|as-human   who writes (default: as-ehmpath)
  --output tree|json           the output shape (default: tree)
  --help, -h                   show this help
EOF
}

# .what = the last line with text in a file, cut to 400 chars; a stand-in when it holds none
# .why  = a tool's last stderr line is its cause; the fault line names it. bash leads a
#         source fault with the full file path, so the cut leaves room past it
as_comment_last_text_line_of_file() {
  local line
  line="$(grep -v '^[[:space:]]*$' "$1" 2>/dev/null | tail -n 1 | cut -c1-400 || true)"
  echo "${line:-no cause given}"
}

# the caller's argv, kept whole: a plan's hint and a refusal's fix name the exact command
ORIG_ARGS=("$@")

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" git.pull.comment.set \
    --skill --repo --role --which --key --reply-to --id --kind --from --in --auth --mode --output
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --) shift ;;
    --which) PR="${2:-}"; shift 2 ;;
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
    *) fail_comment_constraint "unknown arg '$1'" "rhx git.pull.comment.set --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" git.pull.comment.set
check_auth_arg "$AUTH"
check_mode_arg "$MODE"
[[ -n "$FROM" ]] || fail_comment_constraint "--from <path|@stdin> is required" "--from ./.temp/reply.md"
[[ "$FROM" == "@stdin" || -f "$FROM" ]] || fail_comment_constraint "--from '$FROM' is not a file" "name a body file that exists"$'\n'"pipe the body in via --from @stdin"

# refuse the pr description: it is no comment, and every body this verb writes wears 🐢
[[ "$KIND" != "body" ]] || fail_comment_constraint "the pr description is no comment; git.pull.comment.set writes comments only, each with the 🐢 prefix" \
  "rhx git.pull.description set --from <path|@stdin>   # the pr description has its own verb"

# .what = the target a set names: id, key, or thread (a keyed reply); empty if none
# .why  = three targets, each with its own endpoint; the target is never guessed
as_set_target() {
  local kind="$1" id="$2" key="$3" reply_to="$4"
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
  [[ -z "$KIND" ]] || fail_comment_constraint "--kind $KIND pairs with --id" "add --id <id>"$'\n'"drop --kind"
  fail_comment_constraint "a new comment needs --key; an unkeyed post would double on every retry" \
    "rhx git.pull.comment.set $(as_comment_cmd_target "$PR") --key <slug> --from <file>   # a keyed comment"$'\n'"rhx git.pull.comment.set $(as_comment_cmd_target "$PR") --reply-to <id> --key <slug> --from <file>   # a reply in a review thread"$'\n'"rhx git.pull.comment.set $(as_comment_cmd_target "$PR") --id <id> --kind issue|review --from <file>   # edit one known comment"
fi

# refuse flags the target cannot use
[[ "$TARGET" != "id" ]] || check_comment_id_kind "$ID" "$KIND" git.pull.comment.set
if [[ "$TARGET" == "id" && -n "$KEY$REPLY_TO" ]]; then
  fail_comment_constraint "--id edits one known comment; it takes no --key or --reply-to" "drop --key and --reply-to"$'\n'"drop --id"
fi
[[ -z "$KEY" ]] || check_comment_key "$KEY"
if is_keyed_target "$TARGET" && [[ -n "$KIND" ]]; then
  fail_comment_constraint "--kind pairs with --id or names body; a keyed comment needs none" "drop --kind"
fi
if [[ "$TARGET" == "thread" && ! "$REPLY_TO" =~ ^[0-9]+$ ]]; then
  fail_comment_constraint "--reply-to must be a numeric review comment id, got '$REPLY_TO'" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
fi

# read the body
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# .note = stdin is read as fd 0, never via /dev/stdin, which a socket stdin refuses (ENXIO)
[[ "$FROM" != "@stdin" ]] || as_body_trimmed >"$WORK/text.md"
[[ "$FROM" == "@stdin" ]] || as_body_trimmed <"$FROM" >"$WORK/text.md"
# a body piped via @stdin is spent once read, so an apply must pipe it again
STDIN_NOTE=""
[[ "$FROM" == "@stdin" ]] && STDIN_NOTE="   # pipe the same body in again"
FIX_EMPTY="write the body into '$FROM', then rerun"
[[ "$FROM" == "@stdin" ]] && FIX_EMPTY="cat ./.temp/reply.md | $(as_comment_cmd_in_mode set "$MODE" "${ORIG_ARGS[@]}")   # pipe a body that is not empty"
[[ -s "$WORK/text.md" ]] || fail_comment_constraint "the body from '$FROM' is empty" "$FIX_EMPTY"

set_comment_repo "$REPO_IN" git.pull.comment.set
set_comment_auth "$AUTH"
set_comment_login
set_comment_pr "$PR" "$REPO_IN" git.pull.comment.set
PR="$COMMENT_PR"

# find the target and its current state
CURRENT=""
METHOD=""
ENDPOINT=""
READ_BACK=""
LABEL=""
FOREIGN_AUTHOR=""
if [[ "$TARGET" == "id" ]]; then
  LABEL="$COMMENT_REPO#$PR, $KIND comment $ID"
  ENDPOINT="$(get_comment_endpoint "$COMMENT_REPO" "$KIND" "$ID")"
  rc=0
  CURRENT="$(get_one_gh_resource "$ENDPOINT")" || rc=$?
  [[ "$rc" == "3" ]] && check_comment_kind_not_swapped "$PR" "$KIND" "$ID"
  [[ "$rc" == "3" ]] && fail_comment_absent "$PR" "no $KIND comment $ID on $COMMENT_REPO to edit" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  [[ "$rc" == "0" ]] || exit "$rc"
  is_comment_on_pr "$CURRENT" "$PR" || fail_comment_constraint "$KIND comment $ID is not on $COMMENT_REPO#$PR" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
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

# list the replies of one thread a reply key may match; the thread must sit on --which
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

# compose the posted body: every body this verb writes wears the 🐢 prefix
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
  local id_json="$id" id_label="id"
  if [[ "$OUTPUT" == "json" ]]; then
    jq -n --arg verdict "$verdict" --arg target "$LABEL" --arg method "$METHOD" --arg endpoint "$ENDPOINT" \
      --arg id "$id_json" --arg url "$url" --arg cur "$CUR_SHA" --arg new "$NEW_SHA" --arg back "$back" --arg mode "$MODE" \
      --arg ledgerFault "${LEDGER_FAULT:-}" '{
        mode: $mode, verdict: $verdict, target: $target, method: $method, endpoint: $endpoint,
        id: (if $id == "" then null else ($id | tonumber) end), url: (if $url == "" then null else $url end),
        sha256: { current: (if $cur == "" then null else $cur end), new: $new, readback: (if $back == "" then null else $back end) },
        ledgerFault: (if $ledgerFault == "" then null else $ledgerFault end)
      }'
    return 0
  fi
  print_turtle_header "heres the wave..."
  print_tree_start "git.pull.comment.set --mode $MODE"
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
[[ -n "$NEW_ID" ]] || fail_comment_malfunction "gh api $METHOD $ENDPOINT returned no id" "response: $RESP"$'\n'"state: the write may have landed; its id is unknown" \
    "rerun the same command: a keyed set finds the comment by its key, so a rerun converges and names the id"

# note the id in this clone's pr-watch ledger, so its watch never echoes the clone's own words
# .note = the ledger belongs to git.pull.watch; its own operation writes it. the comment has
#         landed, so a ledger fault never fails the set; the fault is named after the result.
#         the append lands within ms of the post, well inside one 60s tick, so a tick that
#         reads the new comment before its id is noted is the one echo this accepts
LEDGER_FAULT=""
LEDGER_FIX=""
WATCH_OPS="$SKILL_DIR/../git.pull.watch/git.pull.watch.operations.sh"
LEDGER_LOADED=false
LEDGER_ERR_FILE="$(mktemp)"
# shellcheck source=../git.pull.watch/git.pull.watch.operations.sh
[[ -n "${RHACHET_CLONE_SERIAL:-}" ]] && source "$WATCH_OPS" 2>"$LEDGER_ERR_FILE" && LEDGER_LOADED=true
if [[ -n "${RHACHET_CLONE_SERIAL:-}" && "$LEDGER_LOADED" == false ]]; then
  LEDGER_FAULT="could not load $WATCH_OPS: $(as_comment_last_text_line_of_file "$LEDGER_ERR_FILE")"
  LEDGER_FIX="reinstall the mechanic role, so git.pull.watch sits beside git.pull.comment"
fi
rm -f "$LEDGER_ERR_FILE"
if [[ "$LEDGER_LOADED" == true ]] && ! LEDGER_CAUSE="$(set_watch_ledger_id "$RHACHET_CLONE_SERIAL" "$NEW_ID")"; then
  LEDGER_FAULT="$LEDGER_CAUSE"
  LEDGER_FIX="clear the cause above (no write access, or a file where the ledger dir belongs); the next set then records its id"
fi
[[ -n "$READ_BACK" ]] || READ_BACK="$(get_comment_endpoint "$COMMENT_REPO" "$ONE_KIND" "$NEW_ID")"

# read back, and compare the hash
rc=0
BACK="$(get_one_gh_resource "$READ_BACK")" || rc=$?
[[ "$rc" == "3" ]] && fail_comment_malfunction "the write is absent on read-back" "endpoint: $READ_BACK"$'\n'"state: github accepted the write, yet the comment does not read back" \
    "rerun the same command: set posts again only where the key reads absent, so a rerun converges"
[[ "$rc" == "0" ]] || exit "$rc"
BACK_SHA="$(printf '%s' "$BACK" | as_sha256_of_json_body)"
if [[ "$BACK_SHA" != "$NEW_SHA" ]]; then
  fail_comment_malfunction "read-back hash mismatch on $READ_BACK" "$(printf 'posted sha256:    %s\nread-back sha256: %s\nurl: %s\nstate: the comment is live, with a body other than the one posted\nlive body: rhx git.pull.comment.get %s --id %s --kind %s' "$NEW_SHA" "$BACK_SHA" "$NEW_URL" "$(as_comment_cmd_target "$PR")" "$NEW_ID" "$ONE_KIND")" \
    "rerun the same command: set edits that comment in place, so a rerun converges"
fi
ACTED="posted"
[[ "$METHOD" == "PATCH" ]] && ACTED="edited"
emit "$ACTED, read back, hash matches" "$NEW_ID" "$NEW_URL" "$BACK_SHA"

# a ledger fault: the comment stands, the watch will echo it once; name the cause and the fix
# .note = exit 0: the comment landed, so a nonzero exit would tell a composer the set
#         failed, and a keyed rerun is a no-op that never retries the ledger (F25)
# .note = in json mode stdout holds the result object, whose ledgerFault names the fault;
#         the human block rides stderr
[[ -n "$LEDGER_FAULT" ]] || exit 0
LEDGER_BLOCK="$(
  echo ""
  echo "💥 MalfunctionError: comment $NEW_ID posted, but the pr-watch ledger could not record it; your watch may alert you of it once"
  echo "   └─ cause: $LEDGER_FAULT"
  print_comment_hint "to fix it" "$LEDGER_FIX"
)"
echo "$LEDGER_BLOCK" >&2
[[ "$OUTPUT" == "json" ]] || echo "$LEDGER_BLOCK"
exit 0