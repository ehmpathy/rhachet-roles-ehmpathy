#!/usr/bin/env bash
######################################################################
# .what = delete one pr comment the robot wrote; a no-op if absent
#
# .why  = clear a twin or a stale comment; apply confirms it is gone
#
# usage:
#   rhx git.pull.comment.del --pr 69 --id <id> --kind issue|review [--mode apply]
#   rhx git.pull.comment.del --pr 69 --key status [--reply-to <id>]
#   rhx git.pull.comment del --pr 69 --key status
#   rhx git.pull.comment.del --help    # every flag
#
# guarantee:
#   - refuses a human's comment, exit 2: another author's, or one by this
#     login whose body does not open with the 🐢 that set always writes
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
MODE="plan"
OUTPUT="tree"

# .what = print the usage tree: every flag, its default, and an example
# .why  = --help is the one authoritative flag list; the file header names none
help() {
  cat <<'EOF'
usage: git.pull.comment.del (--key <k> [--reply-to <id>] | --id <id> --kind issue|review) [--pr <n>] [--in <owner/name>] [--mode plan|apply] [--auth as-ehmpath|as-human] [--output tree|json]

options:
  --key <k>                    your keyed top-level comment; a no-op if absent
  --reply-to <id>              with --key: your keyed reply in that review thread
  --id <id> --kind <kind>      one comment, by id; kind = issue | review, never guessed
  --pr <n>                     the pull request (default: the open pull of the cwd branch)
  --in <owner/name>            the repo (default: the cwd's github origin); a home org only
  --mode plan|apply            plan shows preview, apply deletes and confirms absent (default: plan)
  --auth as-ehmpath|as-human   who deletes (default: as-ehmpath); a human's comment is refused
  --output tree|json           the output shape (default: tree)
  --help, -h                   show this help
EOF
}

# the caller's argv, kept whole: a plan's hint names the exact command
ORIG_ARGS=("$@")

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" git.pull.comment.del \
    --skill --repo --role --pr --id --key --reply-to --kind --in --auth --mode --output
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
    --mode) MODE="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    help|--help|-h) help; exit 0 ;;
    *) fail_comment_constraint "unknown arg '$1'" "rhx git.pull.comment.del --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" git.pull.comment.del
check_auth_arg "$AUTH"
check_mode_arg "$MODE"
[[ "$KIND" != "body" ]] || fail_comment_constraint "github offers no delete for a pr description" \
  "edit the pr description in the github ui, to rewrite it"$'\n'"a pr description verb is tracked in ehmpathy/rhachet-roles-ehmpathy#1165"
[[ -z "$ID" || -z "$KEY" ]] || fail_comment_constraint "--id and --key are two targets; name one" "drop one"
if [[ -n "$ID" ]]; then
  check_comment_id_kind "$ID" "$KIND" git.pull.comment.del
  [[ -z "$REPLY_TO" ]] || fail_comment_constraint "--id names one comment; it takes no --reply-to" "drop --reply-to"
fi
if [[ -z "$ID" ]]; then
  [[ -z "$KIND" ]] || fail_comment_constraint "--kind $KIND pairs with --id" "add --id <id>"$'\n'"drop --kind"
  [[ -n "$KEY" ]] || fail_comment_constraint "del needs a target: --id <id> --kind issue|review, or --key <k>" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids and keys"
  check_comment_key "$KEY"
  [[ -z "$REPLY_TO" || "$REPLY_TO" =~ ^[0-9]+$ ]] || fail_comment_constraint "--reply-to must be a numeric review comment id, got '$REPLY_TO'" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
fi
set_comment_repo "$REPO_IN" git.pull.comment.del
set_comment_auth "$AUTH"
set_comment_login
set_comment_pr "$PR" "$REPO_IN" git.pull.comment.del
PR="$COMMENT_PR"

# .what = emit the result of del: the tree, or the json contract
#         { mode, verdict, target, endpoint, id }
# .why  = one leaf renders every verdict, so plan, delete, and no-op read alike
LABEL=""
ENDPOINT=""
emit() {
  local verdict="$1" id="${2:-}"
  if [[ "$OUTPUT" == "json" ]]; then
    jq -n --arg mode "$MODE" --arg verdict "$verdict" --arg target "$LABEL" --arg endpoint "$ENDPOINT" --arg id "$id" '{
      mode: $mode, verdict: $verdict, target: $target,
      endpoint: (if $endpoint == "" then null else $endpoint end),
      id: (if $id == "" then null else ($id | tonumber) end)
    }'
    return 0
  fi
  print_turtle_header "heres the wave..."
  print_tree_start "git.pull.comment.del --mode $MODE"
  echo "   ├─ target: $LABEL"
  echo "   ├─ auth: $(get_comment_auth_label) as $COMMENT_LOGIN"
  [[ -z "$ENDPOINT" ]] || echo "   ├─ endpoint: DELETE $ENDPOINT"
  if [[ -n "$CURRENT" ]]; then
    echo "   ├─ current"
    echo "   │  ├─ author: $(printf '%s' "$CURRENT" | jq -r '.user.login // .author // "?"')"
    echo "   │  ├─ url: $(printf '%s' "$CURRENT" | jq -r '.html_url // .url // "?"')"
    echo "   │  ├─ bytes: $(printf '%s' "$CURRENT" | as_bytes_of_json_body)"
    echo "   │  └─ sha256: $(printf '%s' "$CURRENT" | as_sha256_of_json_body)"
  fi
  echo "   └─ verdict: $verdict"
  if [[ "$MODE" == "plan" && -n "$id" ]]; then
    print_comment_hint "plan deletes naught; to delete it" "$(as_comment_cmd_in_mode del apply "${ORIG_ARGS[@]}")"
  fi
  return 0
}

# find the target
CURRENT=""
if [[ -n "$ID" ]]; then
  LABEL="$COMMENT_REPO#$PR, $KIND comment $ID"
  ENDPOINT="$(get_comment_endpoint "$COMMENT_REPO" "$KIND" "$ID")"
  rc=0
  CURRENT="$(get_one_gh_resource "$ENDPOINT")" || rc=$?
  if [[ "$rc" == "3" ]]; then
    # a 404 means absent only if the pr itself is visible to this credential,
    # and no comment of the other kind holds this id on the pr
    check_pr_visible "$PR"
    check_comment_kind_not_swapped "$PR" "$KIND" "$ID"
    ENDPOINT=""
    CURRENT=""
    emit "absent — no-op"
    exit 0
  fi
  [[ "$rc" == "0" ]] || exit "$rc"
  is_comment_on_pr "$CURRENT" "$PR" || fail_comment_constraint "$KIND comment $ID is not on $COMMENT_REPO#$PR" "rhx git.pull.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  AUTHOR="$(printf '%s' "$CURRENT" | jq -r '.user.login // ""')"
  is_author_self "$AUTHOR" || fail_comment_constraint "$KIND comment $ID is by $AUTHOR, not by $COMMENT_LOGIN ($AUTH)" "rhx git.pull.comment.del $(as_comment_cmd_target "$PR" none) --id $ID --kind $KIND --auth $(as_auth_other "$AUTH")   # if $AUTHOR is that login: plan, then add --mode apply; else only $AUTHOR can delete it"
fi
if [[ -n "$KEY" ]]; then
  # a top-level key lists the issue comments; a reply key lists one thread
  ONE_KIND="issue"
  LABEL="$COMMENT_REPO#$PR, top-level comment key=$KEY"
  LIST_ENDPOINT="repos/$COMMENT_REPO/issues/$PR/comments"
  if [[ -n "$REPLY_TO" ]]; then
    ONE_KIND="review"
    LABEL="$COMMENT_REPO#$PR, reply to review comment $REPLY_TO, key=$KEY"
    LIST_ENDPOINT="repos/$COMMENT_REPO/pulls/$PR/comments"
  fi
  # a list of an unseen pr 404s; prove the pr first, so that reads as a constraint
  check_pr_visible "$PR"
  [[ -z "$REPLY_TO" ]] || check_reply_parent_on_pr "$PR" "$REPLY_TO"
  LIST="$(get_all_gh_resources "$LIST_ENDPOINT")" || exit $?
  [[ -z "$REPLY_TO" ]] || LIST="$(get_replies_in_thread "$LIST" "$REPLY_TO")"

  # refuse a twin or a foreign holder, so the crew never reads a held key as gone
  # .note = deliberate hazard: a set that posts between this list and the DELETE
  #         is not seen. the next run of any verb on that key finds it
  MATCHES="$(get_key_matches "$LIST" "$KEY")"
  check_key_matches_claimable "$MATCHES" "$KEY" "$ONE_KIND" "$PR" del
  OWN="$(printf '%s' "$MATCHES" | jq -c '.own')"

  # none → absent
  if [[ "$(get_count_of_comments "$OWN")" == "0" ]]; then
    emit "absent — no-op"
    exit 0
  fi
  CURRENT="$(get_first_comment "$OWN")"
  ID="$(printf '%s' "$CURRENT" | jq -r '.id')"
  KIND="$ONE_KIND"
  ENDPOINT="$(get_comment_endpoint "$COMMENT_REPO" "$KIND" "$ID")"
fi

# refuse a human's comment: del deletes only what the robot wrote, and the robot
# wrote a body only if it opens with the 🐢 that git.pull.comment.set always adds
is_comment_by_robot "$CURRENT" || fail_comment_constraint "$KIND comment $ID is a human's comment: its body does not open with 🐢, which every git.pull.comment.set body wears; del deletes only what the robot wrote" \
  "rhx git.pull.comment.set $(as_comment_cmd_target "$PR") --reply-to $ID --key <slug> --from <file>   # answer it instead, for a review comment"$'\n'"a human deletes it in the github ui, if it must go"

# plan: say what would happen, write naught
if [[ "$MODE" == "plan" ]]; then
  emit "would delete $KIND comment $ID (plan)" "$ID"
  exit 0
fi

# delete; a 404 here means another run deleted it first, so the state converged
rc=0
del_one_gh_resource "$ENDPOINT" || rc=$?
if [[ "$rc" == "3" ]]; then
  emit "absent — no-op (gone before the DELETE)"
  exit 0
fi
[[ "$rc" == "0" ]] || exit "$rc"

# confirm absent
rc=0
get_one_gh_resource "$ENDPOINT" >/dev/null || rc=$?
[[ "$rc" == "3" ]] || {
  [[ "$rc" == "0" ]] && fail_comment_malfunction "$KIND comment $ID is still present after DELETE" "endpoint: $ENDPOINT"$'\n'"state: github accepted the DELETE, yet the comment still reads back" \
    "rerun the same command: del is a no-op once the comment is absent, so a rerun is safe"
  exit "$rc"
}
emit "deleted, confirmed absent" "$ID"