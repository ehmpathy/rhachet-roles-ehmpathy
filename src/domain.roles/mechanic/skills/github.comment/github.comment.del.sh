#!/usr/bin/env bash
######################################################################
# .what = delete one pr comment; a no-op if absent
#
# .why  = clear a twin or a stale comment; apply confirms it is gone
#
# usage:
#   rhx github.comment.del --pr 69 --id <id> --kind issue|review [--mode apply]
#   rhx github.comment.del --pr 69 --key status [--reply-to <id>]
#   rhx github.comment.del --help    # every flag
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=github.comment.operations.sh
source "$SKILL_DIR/github.comment.operations.sh"

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
  print_turtle_header "heres the wave..."
  print_tree_start "github.comment.del — delete one comment of a pull request; a no-op if absent"
  echo "   ├─ usage: rhx github.comment.del --pr <n> (--id <id> --kind issue|review | --key <k> [--reply-to <id>]) [--mode plan|apply]"
  echo "   ├─ inputs"
  echo "   │  ├─ --pr <n>                      required"
  echo "   │  ├─ --key <k> [--reply-to <id>]   the current login's keyed comment (in that thread, with --reply-to)"
  echo "   │  ├─ --id <id> --kind <kind>       one comment, by id; kind = issue | review, never guessed"
  echo "   │  ├─ --in <owner/name>             default: the cwd's github origin; home orgs only (${ORGS_HOME[*]})"
  echo "   │  ├─ --auth                        as-ehmpath (default; the env token, else the keyrack) | as-human"
  echo "   │  ├─ --mode                        plan (default, no write) | apply (delete, then confirm absent)"
  echo "   │  └─ --output                      tree (default) | json"
  echo "   ├─ example: rhx github.comment.del --pr 69 --key status --mode apply"
  echo "   └─ exit: 0 planned, deleted, or no-op; 1 malfunction; 2 constraint"
}

# the caller's argv, kept whole: a plan's hint names the exact command
ORIG_ARGS=("$@")

# parse args
while [[ $# -gt 0 ]]; do
  # split --flag=value into two args, so both forms parse one way
  [[ "$1" == --*=* ]] && set -- "${1%%=*}" "${1#*=}" "${@:2}"
  check_flag_has_value "$1" "$#" "${2:-}" github.comment.del \
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
    *) fail_comment_constraint "unknown arg '$1'" "rhx github.comment.del --help" ;;
  esac
done

# validate the input, before any gh call; --output first, so every refusal speaks it
check_output_arg "$OUTPUT"
set_comment_output "$OUTPUT"
check_pr_number "$PR" github.comment.del
check_auth_arg "$AUTH"
check_mode_arg "$MODE"
[[ "$KIND" != "body" ]] || fail_comment_constraint "github offers no delete for a pr description" \
  "rhx github.comment.set $(as_comment_cmd_target "$PR") --kind body --from <file>   # to rewrite it"
[[ -z "$ID" || -z "$KEY" ]] || fail_comment_constraint "--id and --key are two targets; name one" "drop one"
if [[ -n "$ID" ]]; then
  check_comment_id_kind "$ID" "$KIND" github.comment.del
  [[ -z "$REPLY_TO" ]] || fail_comment_constraint "--id names one comment; it takes no --reply-to" "drop --reply-to"
fi
if [[ -z "$ID" ]]; then
  [[ -z "$KIND" ]] || fail_comment_constraint "--kind $KIND pairs with --id" "add --id <id>"$'\n'"drop --kind"
  [[ -n "$KEY" ]] || fail_comment_constraint "del needs a target: --id <id> --kind issue|review, or --key <k>" "rhx github.comment.get $(as_comment_cmd_target "$PR")   # lists the ids and keys"
  check_comment_key "$KEY"
  [[ -z "$REPLY_TO" || "$REPLY_TO" =~ ^[0-9]+$ ]] || fail_comment_constraint "--reply-to must be a numeric review comment id, got '$REPLY_TO'" "rhx github.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
fi
set_comment_repo "$REPO_IN" github.comment.del
set_comment_auth "$AUTH"
set_comment_login

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
  print_tree_start "github.comment.del --mode $MODE"
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
  is_comment_on_pr "$CURRENT" "$PR" || fail_comment_constraint "$KIND comment $ID is not on $COMMENT_REPO#$PR" "rhx github.comment.get $(as_comment_cmd_target "$PR")   # lists the ids"
  AUTHOR="$(printf '%s' "$CURRENT" | jq -r '.user.login // ""')"
  is_author_self "$AUTHOR" || fail_comment_constraint "$KIND comment $ID is by $AUTHOR, not by $COMMENT_LOGIN ($AUTH)" "rhx github.comment.del $(as_comment_cmd_target "$PR" none) --id $ID --kind $KIND --auth $(as_auth_other "$AUTH")   # if $AUTHOR is that login: plan, then add --mode apply; else only $AUTHOR can delete it"
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