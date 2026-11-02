#!/usr/bin/env bash
######################################################################
# .what = shared operations for git.pull.title and git.pull.description
#
# .why  = the title and description verbs read and write one field of one
#         pull. the repo fence, the auth split, the pull lookup, the
#         refusals, and the hash already live in git.pull.comment's ops;
#         this file sources them and adds only the pull-field read + write
#
# usage:
#   source "$SKILL_DIR/../git.pull/git.pull.operations.sh"
#
# .note = it lives in a neutral git.pull/ dir, apart from either noun, so
#         neither title nor description reaches into the other's folder
#
# guarantee:
#   - sources only; runs naught on its own beyond what the comment ops run
#   - every gh call goes through a communicator; the verbs never call gh
######################################################################

PULL_OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .why = reuse, not copy: one fence, one auth, one refusal shape across the
#        git.pull.* family (fulcrum F6)
# shellcheck source=../git.pull.comment/git.pull.comment.operations.sh
source "$PULL_OPS_DIR/../git.pull.comment/git.pull.comment.operations.sh"
# .why = the description set signs a body with the one pr body attribution
# shellcheck source=../git/git.attribution.operations.sh
source "$PULL_OPS_DIR/../git/git.attribution.operations.sh"

# .what = check --output for a pull-field get: tree, json, or text
# .why  = text prints the bare field to stdout, for a direct call of the skill file
#         (fulcrum F9); via rhx, `get --to <path>` carries the bare field instead
check_pull_get_output_arg() {
  is_arg_in_enum "$1" tree json text || fail_comment_constraint "--output must be tree, json, or text, got '$1'" "--output tree (the default)"
}

# .what = set the pull a verb acts on: the repo, the credential, its login,
#         then the pull number (COMMENT_PR)
# .why  = each step reads the one before it, so the order lives here, once,
#         rather than in each of the four verbs
# .note = args: --pr value, --in value, the skill name, --auth value
set_pull_target() {
  local pr_in="$1" repo_in="$2" skill="$3" auth="$4"
  set_comment_repo "$repo_in" "$skill"
  set_comment_auth "$auth"
  set_comment_login
  set_comment_pr "$pr_in" "$repo_in" "$skill"
}

# .what = a title with \r, tail newlines, and the blanks around each line dropped
# .why  = github stores a title without blanks at its ends; a title sent with
#         them would read back different and never converge to a no-op
as_pull_title_trimmed() {
  as_body_trimmed | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

# .what = exit 0 when the text holds no visible character
# .why  = a body of blanks alone would wipe the pull; the set verbs refuse it
is_text_wordless() {
  [[ -z "${1//[[:space:]]/}" ]]
}

# .what = one field of a pull's json, \r dropped and tail newlines trimmed
# .why  = github rewrites line ends; a compare must read text, not line ends
as_pull_field_from_json() {
  local field="$1"
  jq -j --arg f "$field" '.[$f] // ""' | as_body_trimmed
}

# .what = the web url of a pull, from its json; empty when github sends none
# .why  = every verb shows the url; one named read, not a jq filter per verb
as_pull_url_from_json() {
  jq -r '.html_url // ""'
}

# .what = check a --to path: empty (no file), or an untracked file path inside this repo
# .why  = get writes the one file it names; a path outside the repo, a directory, or a
#         file git tracks is refused before any gh call, so a typo cannot clobber work
check_pull_field_file_arg() {
  local to="$1" root abs
  [[ -z "$to" ]] && return 0
  root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail_comment_constraint "--to needs a git repo at the cwd" "run it from inside the repo"
  abs="$(realpath -m -- "$to")"
  [[ "$abs" == "$root/"* ]] || fail_comment_constraint "--to must name a path inside this repo, got '$to'" "--to ./.temp/body.md"
  [[ -d "$abs" ]] && fail_comment_constraint "--to names a directory, not a file: '$to'" "--to ./.temp/body.md"
  git -C "$root" ls-files --error-unmatch -- "$abs" >/dev/null 2>&1 &&
    fail_comment_constraint "--to names a file git tracks; get never overwrites one: '$to'" "--to ./.temp/body.md"
  return 0
}

# .what = write a pull field, bare, into a file; its parent dir is made if absent
# .why  = a round trip through a file carries the exact text: no rhx header, no
#         shell redirect; set --from reads it back as is
set_pull_field_into_file() {
  local text="$1" to="$2"
  mkdir -p -- "$(dirname -- "$to")"
  printf '%s\n' "$text" >"$to"
}

# .what = a pull's state, from its json: open, closed, or merged
# .why  = github reports a merged pull as closed with a merged_at stamp; a set
#         plan names which, since a merged title is already the squash header
as_pull_state_from_json() {
  jq -r 'if (.merged_at // null) != null then "merged" else (.state // "") end'
}

# .what = the login that opened a pull, from its json; empty when github sends none
# .why  = a set writes only a pull its own credential opened (check_pull_by_self)
as_pull_author_from_json() {
  jq -r '.user.login // ""'
}

# .what = the caller's command under another credential, in plan
# .why  = a pull opened under the other --auth is the caller's own; the hint
#         names the exact command that previews the set under it
# .note = args: the skill, the --auth value, then the argv the verb received
as_pull_cmd_under_auth() {
  local skill="$1" auth="$2"
  shift 2
  local args=() skip=0 arg
  for arg in "$@"; do
    if [[ "$skip" == "1" ]]; then
      skip=0
      continue
    fi
    case "$arg" in
      --auth) skip=1; continue ;;
      --auth=*) continue ;;
    esac
    args+=("$arg")
  done
  echo "$(as_comment_cmd_in_mode "$skill" plan "${args[@]}") --auth $auth"
}

# .what = refuse a set on a pull its credential did not open
# .why  = a driver sets its own pull (the wish); a pull a human or another login
#         opened is theirs to word. the comment verbs refuse a foreign comment the
#         same way (is_author_self), so the family holds one ownership rule
# .note = args: the pull json, the skill, a prefix for the hint command (a stdin
#         pipe, or empty), then the argv the verb received. runs before the
#         verdict, so a plan never shows green for an apply it refuses. on a pass it
#         stamps PULL_WRITE_PR, which set_one_gh_pull_field demands before it writes
PULL_WRITE_PR=""
check_pull_by_self() {
  local pull="$1" skill="$2" prefix="$3" author who
  shift 3
  author="$(printf '%s' "$pull" | as_pull_author_from_json)"
  is_author_self "$author" && { PULL_WRITE_PR="$COMMENT_PR"; return 0; }
  who="${author:-its author}"
  fail_comment_constraint "$COMMENT_REPO#$COMMENT_PR was opened by ${author:-an unknown login}, not by $COMMENT_LOGIN ($COMMENT_AUTH)" \
    "a set writes only a pull its own credential opened" \
    "${prefix}$(as_pull_cmd_under_auth "$skill" "$(as_auth_other "$COMMENT_AUTH")" "$@")   # if $who is that login"$'\n'"ask $who to set it; this credential may not"
}

# .what = the repair line: each strip the set made, then the footer append
# .why  = the plan and the apply tree name what the set changed in the caller's body
# .note = args: each repair, as reported by get_all_pr_body_repairs
as_pull_repair_summary() {
  local repair summary=""
  for repair in "$@"; do summary+="$repair; "; done
  printf '%s' "${summary}appended the seaturtle footer"
}

# .what = text indented under a tree branch, blank tails dropped from each line
# .why  = a get or a plan shows a body inside its tree; the indent is the branch
# .note = args: the indent to prefix each line with
as_tree_indented_text() {
  local indent="$1"
  sed -e "s/^/$indent/" -e 's/ *$//'
}

# .what = write one field of pull N from a file; prints the response json
# .why  = the write and its failure classification live beside the read. a 422
#         names the field github refused, with the fix for that field (fulcrum F8).
#         a write with no ownership pass for this pull fails loud: a verb that skips
#         check_pull_by_self cannot reach the PATCH
set_one_gh_pull_field() {
  local field="$1" pr="$2" value_file="$3" fix_422="$4"
  local endpoint="repos/$COMMENT_REPO/pulls/$pr" err out rc=0 detail
  [[ -n "$PULL_WRITE_PR" && "$PULL_WRITE_PR" == "$pr" ]] ||
    fail_comment_malfunction "set_one_gh_pull_field: no ownership pass for $COMMENT_REPO#$pr" "check_pull_by_self must pass for this pull before a write"
  err="$(mktemp)"
  out="$(jq -n --arg f "$field" --rawfile v "$value_file" '{($f): $v}' | run_gh_as_auth api --method PATCH "$endpoint" --input - 2>"$err")" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] && { printf '%s' "$out"; return 0; }
  if [[ "$detail" == *"(HTTP 422)"* ]]; then
    local detail_lines=()
    mapfile -t detail_lines <<<"$detail"
    fail_comment_constraint "github refused the $field of $COMMENT_REPO#$pr" "${detail_lines[@]/#/detail: }" "$fix_422"
  fi
  fail_gh_call "PATCH $endpoint ($field)" "$detail"
}