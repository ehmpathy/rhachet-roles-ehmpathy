#!/usr/bin/env bash
######################################################################
# .what = shared operations for git.pull.comment.get | set | del
#
# .why  = the three verbs share one home-org fence, one auth path, one
#         endpoint map, one body shape, one key marker, and one hash. each
#         is held once here, so the three verbs cannot drift apart
#
# usage:
#   source "$SKILL_DIR/git.pull.comment.operations.sh"
#
# guarantee:
#   - sources only; runs naught on its own beyond `exec 3>&1`
#   - every gh call names --method; every list call uses --paginate
#   - every gh call goes through a communicator here; the verbs never call gh
#   - every refusal prints to stdout AND stderr (rule.require.skill-output-streams),
#     even when raised inside a $(...) capture; under --output json, stdout
#     holds one json object and stderr the tree
######################################################################

COMMENT_SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .why = reuse, not copy: the --auth vocab (AUTH_DEFAULT, AUTH_VALID_VALUES,
#        get_auth_who_label) and, through it, keyrack.operations.sh
#        (fetch_github_token, is_gh_auth_failure) — the path git.commit.push proved.
#        git.release and git.repo.get source git.commit the same way
# shellcheck source=../git.commit/git.commit.operations.sh
source "$COMMENT_SKILL_DIR/../git.commit/git.commit.operations.sh"
# .why = reuse the shared output leaves (emit_both, print_turtle_header,
#        print_tree_start, print_coconut_hint, is_arg_in_enum)
# shellcheck source=../git.commit/output.sh
source "$COMMENT_SKILL_DIR/../git.commit/output.sh"

# .why = fd 3 holds the real stdout, so a refusal raised inside a $(...)
#        capture still reaches the caller's terminal rather than a variable
exec 3>&1

# the fleet writes to github only inside its home orgs; a machine-user token
# that can reach any repo makes this list the one guard. the list is read from
# the machine, never hardcoded: see get_all_home_orgs
ORGS_HOME=()

# a key is a short lowercase slug, so its marker parses one way only
COMMENT_KEY_PATTERN='^[a-z0-9][a-z0-9._-]{0,63}$'

# the key marker: a hidden html comment at the tail of a keyed comment.
# two grammars, each held once: STRIP finds a marker anywhere, so set removes
# every stray one; CLAIM finds only a marker on its own last line, so a marker
# typed or quoted mid-body never claims a key
COMMENT_KEY_MARKER_REGEX='<!-- rhx:git.pull.comment key=([a-z0-9][a-z0-9._-]*) -->'
# .note = jq's regex runs in perl syntax, where ^ anchors the string start, not a
#         line; so the claim names its line start as (?:^|\n), its end as \s*\z
COMMENT_KEY_CLAIM_REGEX='(?:^|\n)<!-- rhx:git.pull.comment key=([a-z0-9][a-z0-9._-]*) -->\s*\z'

# jq defs every comment transformer shares; each call passes --arg re and --arg login
# .why = one definition of "the key of a comment" and "an author is me", so
#        get, set, and del cannot disagree on either
COMMENT_JQ_DEFS='
  def key_of: [(.body // "") | match($re; "g") | .captures[0].string] | last;
  def is_login_self($author): ($author // "") as $a
    | $a == $login or $a == ($login + "[bot]") or ($a + "[bot]") == $login;
'

######################################################################
# dispatch: `rhx git.pull.<noun> <verb>` routes to `git.pull.<noun>.<verb>.sh`
######################################################################

# .what = route `rhx git.pull.<noun> <verb> ...` to the verb's own skill
# .why  = the wish names the tree as `git.pull.comment get`; each verb is also
#         its own skill (`rhx git.pull.comment.get`), so both forms run one code
# .note = args: the noun's dir, the noun's skill name, its verbs (comma list),
#         then the caller's argv; rhachet's --skill/--repo/--role drop out
dispatch_git_pull_verb() {
  local dir="$1" skill="$2" verbs="$3"
  shift 3
  local verb="" rest=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skill|--repo|--role) shift 2 ;;
      *)
        if [[ -z "$verb" ]]; then
          verb="$1"
          shift
          continue
        fi
        rest+=("$1")
        shift ;;
    esac
  done
  local verb_list="${verbs//,/ | }"
  [[ -n "$verb" ]] || fail_comment_constraint "a verb is required; the verbs are $verb_list" "rhx $skill ${verbs%%,*} --help"
  if [[ "$verb" == "help" || "$verb" == "--help" || "$verb" == "-h" ]]; then
    echo "usage: $skill <$verb_list> [flags]"
    echo ""
    echo "verbs:"
    local one
    for one in ${verbs//,/ }; do
      printf '  %-28s %s\n' "$one" "rhx $skill $one --help, for its flags"
    done
    echo ""
    echo "options:"
    printf '  %-28s %s\n' "--help, -h" "show this help"
    exit 0
  fi
  [[ ",$verbs," == *",$verb,"* ]] || fail_comment_constraint "unknown verb '$verb'; the verbs are $verb_list" "rhx $skill --help"
  # via bash, so the route never rests on a file's execute bit
  exec bash "$dir/$skill.$verb.sh" "${rest[@]}"
}

######################################################################
# refusals: one shape, both streams
######################################################################

# the caller's --output; a refusal speaks it too (set_comment_output)
COMMENT_OUTPUT="tree"

# .what = set COMMENT_OUTPUT, once --output passed its check
# .why  = a json caller must parse one json object on every exit, refusals included
set_comment_output() {
  COMMENT_OUTPUT="$1"
}

# .what = a json array of the args, one string each
# .why  = a refusal's detail and fix lines ride into its json form as arrays
# .note = each arg is one line (a detail leaf or a fix command), so a newline
#         splits them safely; jq reads a NUL as the end of its input
as_json_array_of_args() {
  if [[ "$#" == "0" ]]; then
    echo '[]'
    return 0
  fi
  printf '%s\n' "$@" | jq -R '.' | jq -sc '.'
}

# .what = the 🥥 hint of a refusal: the label owns its options, one branch each
# .why  = depth means ownership (rule.forbid.treestruct-indented-text-as-children):
#         the label is no step of its own, and two options must never read as
#         two steps. two or more options name the choice in the label
print_comment_hint() {
  local affordance="$1"
  shift
  local total=$# index=0 option
  [[ "$total" -gt 1 ]] && affordance="$affordance, pick one"
  echo ""
  echo "🥥 did you know?"
  echo "   └─ $affordance"
  for option in "$@"; do
    index=$((index + 1))
    if [[ "$index" -eq "$total" ]]; then
      echo "      └─ $option"
      continue
    fi
    echo "      ├─ $option"
  done
}

# .what = the caller's own command, with the named --mode in place of any --mode
# .why  = a plan's hint names the exact command that applies it, so a paste runs
#         the write the plan showed; rhachet's own --skill/--repo/--role drop out
# .note = args: the verb (or a full git.pull.* skill name), the mode, then the
#         argv the verb received
as_comment_cmd_in_mode() {
  local verb="$1" mode="$2"
  shift 2
  local skill="$verb"
  [[ "$skill" == git.* ]] || skill="git.pull.comment.$verb"
  local out=("rhx" "$skill") skip=0 arg
  for arg in "$@"; do
    if [[ "$skip" == "1" ]]; then
      skip=0
      continue
    fi
    case "$arg" in
      --mode | --skill | --repo | --role) skip=1; continue ;;
      --mode=* | --skill=* | --repo=* | --role=*) continue ;;
    esac
    out+=("$(printf '%q' "$arg")")
  done
  echo "${out[*]} --mode $mode"
}

# .what = render one refusal: a header, detail leaves, then a 🥥 hint with the fixes
# .why  = every refusal of the family shares this one shape. under --output json,
#         stdout gets one json object and stderr the tree, so a json caller parses
#         every exit while a human still reads the tree
# .note = args: class, message, hint affordance, then the NAMES of two arrays —
#         the detail lines and the fix commands (either may be empty)
emit_comment_refusal() {
  local class="$1" message="$2" affordance="$3"
  local -n refusal_details_ref="$4"
  local -n refusal_fixes_ref="$5"
  local glyph="✋" block i last
  [[ "$class" == "MalfunctionError" ]] && glyph="💥"
  block="$glyph $class: $message"
  last=$((${#refusal_details_ref[@]} - 1))
  for i in "${!refusal_details_ref[@]}"; do
    if [[ "$i" == "$last" ]]; then
      block+=$'\n'"   └─ ${refusal_details_ref[$i]}"
      continue
    fi
    block+=$'\n'"   ├─ ${refusal_details_ref[$i]}"
  done
  [[ "${#refusal_fixes_ref[@]}" == "0" ]] || block+=$'\n'"$(print_comment_hint "$affordance" "${refusal_fixes_ref[@]}")"

  # tree: both streams
  if [[ "$COMMENT_OUTPUT" != "json" ]]; then
    emit_both "$block" >&3
    return 0
  fi

  # json: the object on stdout, the tree on stderr
  printf '%s\n' "$block" >&2
  jq -n --arg class "$class" --arg message "$message" \
    --argjson details "$(as_json_array_of_args "${refusal_details_ref[@]}")" \
    --argjson fixes "$(as_json_array_of_args "${refusal_fixes_ref[@]}")" \
    '{ error: { class: $class, message: $message, details: $details, fixes: $fixes } }' >&3
}

# .what = refuse as a constraint (caller must fix), exit 2
# .why  = the common refusal: one message, its detail lines, its fixes
# .note = args: the message, then detail lines; the last arg is the fix. a fix
#         with newlines holds alternatives, one per line, each its own branch
fail_comment_constraint() {
  local message="$1"
  shift
  local fixes=()
  mapfile -t fixes <<<"${!#}"
  local details=("${@:1:$(($# - 1))}")
  emit_comment_refusal ConstraintError "$message" "to fix it" details fixes
  exit 2
}

# .what = fail as a malfunction (system must fix), exit 1
# .why  = a gh failure shows its raw detail, so the on-call can read the cause;
#         where a next move exists, the hint names it and the state it leaves
# .note = args: the message, the detail (newline-split), then the next moves
fail_comment_malfunction() {
  local message="$1"
  local detail="${2:-}"
  local lines=() fixes=("${@:3}")
  [[ -z "$detail" ]] || mapfile -t lines <<<"$detail"
  emit_comment_refusal MalfunctionError "$message" "next" lines fixes
  exit 1
}

######################################################################
# input checks (pure, before any gh call)
######################################################################

# .what = is this arg a --flag with no value after it?
# .why  = every --flag of the family but --help takes a value; `shift 2` past the
#         last arg would kill a verb under set -e with exit 1 and no message,
#         and a next arg that is itself a --flag would be swallowed as the value
is_flag_without_value() {
  local arg="$1" left="$2" next="$3"
  [[ "$arg" == --* && "$arg" != "--" && "$arg" != "--help" ]] || return 1
  [[ "$left" -lt 2 || "$next" == --* ]]
}

# .what = refuse a --flag whose value is absent, or is the next --flag
# .why  = a typo exits 2 and names the fix, never a silent exit 1
# .note = a verb splits `--flag=value` into two args before this check
# .note = args after the skill name: the flags this verb knows; an unknown
#         flag skips this check, so it reads "unknown arg", never "needs a value"
check_flag_has_value() {
  local arg="$1" left="$2" next="$3" skill="$4"
  is_arg_in_enum "$arg" "${@:5}" || return 0
  if is_flag_without_value "$arg" "$left" "$next"; then
    fail_comment_constraint "$arg needs a value" "rhx $skill --help   # lists each flag and its value"
  fi
}

# .what = check --pr is a pull request number, when given
# .why  = a bad --pr refuses before any gh call, never as a 404 later; an absent
#         --pr is fine, since set_comment_pr finds the cwd branch's open pull
check_pr_number() {
  local pr="$1" skill="$2"
  [[ -z "$pr" ]] && return 0
  [[ "$pr" =~ ^[0-9]+$ ]] || fail_comment_constraint "--pr must be a pull request number, got '$pr'" "rhx $skill --pr 69 ...   # or omit --pr, for the open pull of the cwd branch"
}

# .what = check --id pairs with --kind issue|review; the kind is never guessed
# .why  = issue and review ids live on two endpoints; a guess could hit the wrong one
check_comment_id_kind() {
  local id="$1" kind="$2" skill="$3"
  [[ "$id" =~ ^[0-9]+$ ]] || fail_comment_constraint "--id must be a numeric comment id, got '${id:-<none>}'" "rhx git.pull.comment.get --pr <n>   # lists the ids"
  [[ "$kind" == "issue" || "$kind" == "review" ]] || fail_comment_constraint "--id needs --kind issue|review, got '${kind:-<none>}'; the kind is never guessed" "rhx $skill ... --id $id --kind issue|review"
}

# .what = check a key is a short slug
# .why  = the marker must parse one way only, and a slug cannot close the html comment
check_comment_key() {
  local key="$1"
  [[ "$key" =~ $COMMENT_KEY_PATTERN ]] || fail_comment_constraint "--key must be a lowercase slug (a-z 0-9 . _ -, up to 64), got '$key'" "--key round-2-status"
}

# .what = check --mode
# .why  = a typo in --mode must never fall through to a write
check_mode_arg() {
  is_arg_in_enum "$1" plan apply || fail_comment_constraint "--mode must be plan or apply, got '$1'" "--mode plan (the default)"
}

# .what = check --output
# .why  = a caller that parses json must never receive a tree by a typo
check_output_arg() {
  is_arg_in_enum "$1" tree json || fail_comment_constraint "--output must be tree or json, got '$1'" "--output tree (the default)"
}

# .what = check --auth against the vocabulary git.commit.push uses
# .why  = one --auth vocabulary across the mechanic's github verbs
check_auth_arg() {
  is_arg_in_enum "$1" "${AUTH_VALID_VALUES[@]}" || fail_comment_constraint "--auth must be $(get_enum_choice_list "${AUTH_VALID_VALUES[@]}"), got '$1'" "--auth $AUTH_DEFAULT (the default)"
}

######################################################################
# repo: derive from git, then fence — both before any gh call
######################################################################

# .what = the cwd's origin url, or empty when the repo has no origin
# .why  = --in is optional; the cwd's origin names the repo in the common case
# .note = git config exits 1 when the key is absent — the one allowlisted failure
get_git_origin_url() {
  local url rc=0
  url="$(git config --get remote.origin.url)" || rc=$?
  [[ "$rc" == "0" || "$rc" == "1" ]] || fail_comment_malfunction "git config could not read remote.origin.url" "exit: $rc" \
    "rerun with --in <owner/name>, which skips the origin read"
  printf '%s' "$url"
}

# .what = owner/name from a github remote url, or empty
# .why  = ssh, ssh://, and https remotes all name one repo
as_repo_slug_from_remote_url() {
  local url="$1" repo=""
  [[ "$url" =~ ^git@github\.com:([^/]+/[^/]+)$ ]] && repo="${BASH_REMATCH[1]}"
  [[ "$url" =~ ^ssh://git@github\.com/([^/]+/[^/]+)$ ]] && repo="${BASH_REMATCH[1]}"
  [[ "$url" =~ ^https://([^@/]+@)?github\.com/([^/]+/[^/]+)$ ]] && repo="${BASH_REMATCH[2]}"
  echo "${repo%.git}"
}

# .what = the home orgs of this machine: each ~/git/<org>/ dir that holds a
#         clone whose origin is a github repo of that same org, lowercased
# .why  = the orgs a human cloned into ~/git/<org>/ are the orgs they work in;
#         the origin check drops a holder dir (e.g. ~/git/more/) that is no org
# .note = a dir whose name opens with _ or . is a holder (e.g. _worktrees), never an org
get_all_home_orgs() {
  local root="$HOME/git" dir org config
  [[ -d "$root" ]] || return 0
  for dir in "$root"/*/; do
    org="$(basename "$dir")"
    [[ "$org" == _* || "$org" == .* ]] && continue
    for config in "$dir"*/.git/config; do
      [[ -f "$config" ]] || continue
      if grep -qiE "url *= *.*github\.com[:/]$org/" "$config"; then
        echo "${org,,}"
        break
      fi
    done
  done
}

# .what = set ORGS_HOME from the machine, once
# .why  = the fence and the help both read it; one read serves both
set_home_orgs() {
  [[ "${#ORGS_HOME[@]}" == "0" ]] || return 0
  mapfile -t ORGS_HOME < <(get_all_home_orgs)
}

# .what = refuse a repo whose owner sits outside the home orgs
# .why  = a machine-user token can reach any repo; this fence is the one guard.
#         github owners are case-blind, so the compare is too
check_comment_repo_in_home_orgs() {
  local repo="$1" owner allowed
  owner="${repo%%/*}"
  set_home_orgs
  [[ "${#ORGS_HOME[@]}" != "0" ]] || fail_comment_constraint "no home orgs: no clone under ~/git/<org>/ has a github origin of that org" "home: $HOME" "clone a repo of the target org into ~/git/<org>/<repo>, then rerun"
  for allowed in "${ORGS_HOME[@]}"; do
    [[ "${owner,,}" == "$allowed" ]] && return 0
  done
  fail_comment_constraint "owner '$owner' is outside the home orgs" "${ORGS_HOME[@]/#/home org: }" "target a repo in one of those orgs, via --in <owner/name>"
}

# .what = set COMMENT_REPO: --in if given, else the cwd's origin; then fence it
# .why  = every gh call below reads COMMENT_REPO, so it is set and fenced once
COMMENT_REPO=""
set_comment_repo() {
  local repo_in="$1" skill="$2"
  COMMENT_REPO="$repo_in"
  [[ -n "$COMMENT_REPO" ]] || COMMENT_REPO="$(as_repo_slug_from_remote_url "$(get_git_origin_url)")"
  [[ "$COMMENT_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || fail_comment_constraint "no repo: --in <owner/name> absent, and the cwd has no github origin" "rhx $skill --in ehmpathy/<repo> ..."
  check_comment_repo_in_home_orgs "$COMMENT_REPO"
}

# .what = the target flags a fix command needs to reach this run's target
# .why  = a hint the caller copies must read the same repo, under the same
#         credential, from any cwd; `--pr N` alone reads the cwd's repo
# .note = auth arg: as-human adds `--auth as-human`; `none` omits it, for a
#         fix that names its own --auth. as-ehmpath is the default, so unsaid
as_comment_cmd_target() {
  local pr="$1" auth="${2:-$COMMENT_AUTH}" out=""
  [[ -n "$pr" ]] && out="--pr $pr"
  [[ -n "$COMMENT_REPO" ]] && out="$out --in $COMMENT_REPO"
  [[ "$auth" == "as-human" ]] && out="$out --auth as-human"
  echo "$out"
}

######################################################################
# auth: one credential per run
# .note = COMMENT_AUTH, COMMENT_TOKEN, COMMENT_LOGIN are set once, in order
#         (set_comment_auth, then set_comment_login); every reader asserts
#         its global is set, so a reorder fails loud, never silent
######################################################################

COMMENT_TOKEN=""
COMMENT_TOKEN_SOURCE="keyrack"
COMMENT_AUTH=""
COMMENT_LOGIN=""

# .what = fetch the credential for --auth, before any gh call
# .why  = as-ehmpath reads the ehmpath keyrack token; as-human uses the
#         ambient `gh auth login`. an absent token refuses in plan too,
#         since plan reads under the same credential
# .note = a token the env already holds wins: ci's keyrack firewall and
#         `rhx git.repo.test` export EHMPATHY_SEATURTLE_GITHUB_TOKEN (env test),
#         so the real-api case reads the token its grant supplies. else the
#         token comes from keyrack env prep (fetch_github_token), so the fix names prep
set_comment_auth() {
  COMMENT_AUTH="$1"
  [[ "$COMMENT_AUTH" == "as-human" ]] && return 0

  # the env's token, when present
  if [[ -n "${EHMPATHY_SEATURTLE_GITHUB_TOKEN:-}" ]]; then
    COMMENT_TOKEN="$EHMPATHY_SEATURTLE_GITHUB_TOKEN"
    COMMENT_TOKEN_SOURCE="env"
    return 0
  fi

  # fetch_github_token prints the token, or an empty line plus a cause on stderr;
  # a nonzero exit means the fetch itself broke — a malfunction, not an absence
  local err_file cause rc=0
  err_file="$(mktemp)"
  COMMENT_TOKEN="$(fetch_github_token 2>"$err_file")" || rc=$?
  cause="$(head -n 1 "$err_file")"
  rm -f "$err_file"
  [[ "$rc" == "0" ]] || fail_comment_malfunction "the keyrack token fetch broke" "exit: $rc"$'\n'"cause: ${cause:-<none>}" \
    "rerun the same command; if it breaks again, run rhx keyrack status --owner ehmpath to see the keyrack's state"
  [[ -n "$COMMENT_TOKEN" ]] && return 0

  # three alternatives, one per state of the token; each names when it applies,
  # as a shell comment, so a paste of the chosen line still runs. the one the
  # cause points at leads: "not found" means the token was never set
  local details=("cause: ${cause:-keyrack returned no token}")
  local fix_unlock="rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN   # the token is set, but locked"
  local fix_fill="rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN   # a human, where the token was never set"
  local fix_human="rerun with --auth as-human   # post under your own gh login instead"
  local fixes=("$fix_unlock" "$fix_fill" "$fix_human")
  [[ "${cause,,}" == *"not found"* ]] && fixes=("$fix_fill" "$fix_unlock" "$fix_human")
  emit_comment_refusal ConstraintError "ehmpath keyrack token not available" \
    "to fix it, by the state of the token" details fixes
  exit 2
}

# .what = run gh under the chosen credential
# .why  = as-human strips any ambient GH_TOKEN / GITHUB_TOKEN, so a stale
#         token in the shell can never stand in for the human's login.
#         the same split as git.commit.push.sh run_gh
run_gh_as_auth() {
  [[ -n "$COMMENT_AUTH" ]] || fail_comment_malfunction "gh ran before set_comment_auth" "a verb must set the credential before any gh call"
  if [[ "$COMMENT_AUTH" == "as-human" ]]; then
    env -u GH_TOKEN -u GITHUB_TOKEN gh "$@"
    return
  fi
  GH_TOKEN="$COMMENT_TOKEN" gh "$@"
}

# .what = the label of the credential, in git.commit.push's words
# .why  = every tree names who acts, so a human sees whose name a write carries;
#         an env token names its env var, so it never reads as the keyrack's
get_comment_auth_label() {
  if [[ "$COMMENT_AUTH" == "as-ehmpath" && "$COMMENT_TOKEN_SOURCE" == "env" ]]; then
    echo "as-ehmpath (env EHMPATHY_SEATURTLE_GITHUB_TOKEN)"
    return 0
  fi
  get_auth_who_label "$COMMENT_AUTH"
}

# .what = is this gh failure a 404?
# .why  = absence is a verdict; it must match gh's exact status suffix, never a
#         loose "Not Found" that other errors could carry
is_gh_not_found() {
  [[ "$1" == *"(HTTP 404)"* ]]
}

# .what = classify a failed gh call: auth or 403 → exit 2 with a fix; else exit 1
# .why  = a credential problem is the caller's to fix; a retry helps only a
#         malfunction. a rate-limit 403 is transient, so it stays a malfunction
fail_gh_call() {
  local what="$1" detail="$2"
  # the first line, read in-shell: a pipe to head could die of SIGPIPE under pipefail
  local first="${detail%%$'\n'*}"
  if is_gh_auth_failure "$detail"; then
    # github refused the token's value, so an unlock would hand back the same one
    local fix="rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --refresh   # a human: set a token github accepts"$'\n'"rerun with --auth as-human   # post under your own gh login instead"
    # an env token wins over the keyrack, so a keyrack refill alone would not change it
    [[ "$COMMENT_TOKEN_SOURCE" == "env" ]] && fix="unset EHMPATHY_SEATURTLE_GITHUB_TOKEN, then rerun   # the env token wins over the keyrack"$'\n'"rerun with --auth as-human   # post under your own gh login instead"
    [[ "$COMMENT_AUTH" == "as-human" ]] && fix="gh auth login"
    fail_comment_constraint "github refused the credential ($COMMENT_AUTH) on $what" "detail: $first" "$fix"
  fi
  if [[ "$detail" == *"HTTP 403"* && "${detail,,}" != *"rate limit"* ]]; then
    fail_comment_constraint "github forbade $what under $COMMENT_AUTH" "detail: $first" "check the credential can act on $COMMENT_REPO"$'\n'"rerun with --auth $(as_auth_other "$COMMENT_AUTH")"
  fi
  # a 404 that reaches here hit a write or a list: the target went absent, or is unseen
  if is_gh_not_found "$detail"; then
    fail_comment_constraint "github answered 404 on $what: the target is absent, or $COMMENT_AUTH cannot see it" "detail: $first" "check --pr, --in, and --id"$'\n'"rerun with --auth $(as_auth_other "$COMMENT_AUTH")"
  fi
  # a 422 is a payload github refuses, e.g. a body past its size cap
  if [[ "$detail" == *"(HTTP 422)"* ]]; then
    # every line gh printed, since github names the refused field past the first
    local detail_lines=()
    mapfile -t detail_lines <<<"$detail"
    fail_comment_constraint "github refused the payload on $what" "${detail_lines[@]/#/detail: }" \
      "edit the body file so github accepts it, then rerun the same command   # the size cap is checked before any write, so a 422 is the content"
  fi
  # a rate limit or a 5xx is transient: each verb is idempotent, so a rerun is safe
  local retry="rerun the same command after a pause: get, set, and del are each safe to rerun"
  [[ "${detail,,}" == *"rate limit"* ]] && retry="rerun the same command once the rate limit resets (gh api rate_limit shows when): get, set, and del are each safe to rerun"
  fail_comment_malfunction "gh api failed on $what" "$detail" "$retry"
}

######################################################################
# communicators: the only gh calls of the family
# .note = callers capture these in $(...); a refusal inside still reaches
#         the terminal via fd 3, and the caller propagates its exit code
######################################################################

# .what = the login of the current credential
# .why  = graphql viewer works for every token kind; REST GET /user 403s
#         for a ghs_ app installation token (keyrack.operations.sh)
# .note = graphql rides on POST, yet this is a read: get and plan still make
#         this one call, since the author check needs the login before a verdict
get_one_gh_viewer_login() {
  local err out rc=0 detail login
  err="$(mktemp)"
  out="$(run_gh_as_auth api graphql --method POST -f 'query=query { viewer { login } }' 2>"$err")" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] || fail_gh_call "the read of the current login" "$detail"
  login="$(printf '%s' "$out" | jq -r '.data.viewer.login // empty')"
  [[ -n "$login" ]] || fail_comment_malfunction "graphql viewer returned no login" "response: $out"$'\n'"state: no read or write ran" \
    "rerun the same command; if it fails again, check the credential: gh auth status for as-human, rhx keyrack status --owner ehmpath for as-ehmpath"
  printf '%s' "$login"
}

# .what = read one resource; prints its json, or returns 3 when absent (404)
# .why  = absent is a verdict (del no-op, del confirm), not a failure
get_one_gh_resource() {
  local endpoint="$1" err out rc=0 detail
  err="$(mktemp)"
  out="$(run_gh_as_auth api --method GET "$endpoint" 2>"$err")" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] && { printf '%s' "$out"; return 0; }
  is_gh_not_found "$detail" && return 3
  fail_gh_call "GET $endpoint" "$detail"
}

# .what = read a paginated list as one json array
# .why  = a key match on page one alone would miss a twin on page two
get_all_gh_resources() {
  local endpoint="$1" err out rc=0 detail
  err="$(mktemp)"
  out="$(run_gh_as_auth api --method GET --paginate "$endpoint" 2>"$err")" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] || fail_gh_call "GET $endpoint" "$detail"
  printf '%s' "$out" | jq -cs 'map(if type == "array" then . else [.] end) | add // []'
}

# .what = the thread state of every review comment on pr N, as a json map
#         { "<review comment id>": "open" | "resolved" }
# .why  = rest lists every review comment, resolved threads included, yet only
#         graphql holds a thread's resolution; get names it per row, so a reader
#         sees both open and resolved threads, and which is which
get_all_review_thread_states() {
  local pr="$1" owner="${COMMENT_REPO%%/*}" name="${COMMENT_REPO#*/}" err out rc=0 detail
  local query='query($owner: String!, $name: String!, $pr: Int!, $endCursor: String) {
    repository(owner: $owner, name: $name) { pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved comments(first: 100) { nodes { databaseId } } }
      } } } }'
  err="$(mktemp)"
  out="$(run_gh_as_auth api graphql --method POST --paginate -f query="$query" -F owner="$owner" -F name="$name" -F pr="$pr" 2>"$err")" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] || fail_gh_call "graphql reviewThreads of $COMMENT_REPO#$pr" "$detail"
  printf '%s' "$out" | jq -cs '
    [ .[] | .data.repository.pullRequest.reviewThreads.nodes[]?
      | (if .isResolved then "resolved" else "open" end) as $state
      | .comments.nodes[] | { key: "\(.databaseId)", value: $state } ]
    | from_entries'
}

# .what = write one resource (POST or PATCH) with a body file; prints the response json
# .why  = the write and its failure classification live in one place, beside the reads
set_one_gh_resource() {
  local method="$1" endpoint="$2" body_file="$3" err out rc=0 detail
  err="$(mktemp)"
  out="$(as_comment_payload_from_file "$body_file" | run_gh_as_auth api --method "$method" "$endpoint" --input - 2>"$err")" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] || fail_gh_call "$method $endpoint" "$detail"
  printf '%s' "$out"
}

# .what = delete one resource; returns 3 when it is already absent (404)
# .why  = the delete and its failure classification live beside the reads and writes.
#         a 404 here means another run deleted it first, which del reads as converged
del_one_gh_resource() {
  local endpoint="$1" err rc=0 detail
  err="$(mktemp)"
  run_gh_as_auth api --method DELETE "$endpoint" >/dev/null 2>"$err" || rc=$?
  detail="$(cat "$err")"
  rm -f "$err"
  [[ "$rc" == "0" ]] && return 0
  is_gh_not_found "$detail" && return 3
  fail_gh_call "DELETE $endpoint" "$detail"
}

# .what = set COMMENT_LOGIN to the current credential's login
# .why  = a key matches only the current login's comments; every verb needs it
set_comment_login() {
  COMMENT_LOGIN="$(get_one_gh_viewer_login)" || exit $?
}

# .what = set COMMENT_PR: --pr if given, else the one open pull of the cwd branch
# .why  = the common case is "comment on the pull of the branch i stand on", so a
#         bare call targets it; a guess is never made: a detached HEAD, a repo
#         other than the cwd's origin, or zero or two open pulls each refuse
# .note = a global, never a $(...) capture, so a refusal here stops the verb
COMMENT_PR=""
set_comment_pr() {
  local pr_in="$1" repo_in="$2" skill="$3" branch origin owner pulls numbers count
  COMMENT_PR="$pr_in"
  [[ -n "$COMMENT_PR" ]] && return 0

  # the cwd branch must sit on the target repo, else its pull is not on it
  origin="$(as_repo_slug_from_remote_url "$(get_git_origin_url)")"
  [[ -z "$repo_in" || "${repo_in,,}" == "${origin,,}" ]] || fail_comment_constraint "--pr is required with --in $repo_in: the cwd branch sits on '${origin:-no github origin}', not on that repo" "rhx $skill --pr <n> --in $repo_in ..."
  branch="$(git symbolic-ref --quiet --short HEAD)" || fail_comment_constraint "--pr is absent, and the cwd has no branch to find a pull for (detached HEAD)" "rhx $skill --pr <n> ..."

  # the open pulls whose head is this branch, in the repo's own owner
  owner="${COMMENT_REPO%%/*}"
  pulls="$(get_all_gh_resources "repos/$COMMENT_REPO/pulls?state=open&head=$owner:$branch")" || exit $?
  numbers="$(printf '%s' "$pulls" | jq -r '.[].number')"
  count="$(get_count_of_comments "$pulls")"
  [[ "$count" == "0" ]] && fail_comment_constraint "--pr is absent, and branch '$branch' has no open pull on $COMMENT_REPO" "rhx $skill --pr <n> ...   # name the pull"
  [[ "$count" == "1" ]] || fail_comment_constraint "--pr is absent, and branch '$branch' has $count open pulls on $COMMENT_REPO" "open pulls: ${numbers//$'\n'/, }" "rhx $skill --pr <n> ...   # name one"
  COMMENT_PR="$numbers"
}

# .what = refuse when pr N is not visible to the credential
# .why  = github answers 404 both for an absent comment and for a repo the token
#         cannot see. a visible pr proves the 404 meant absent, so del never
#         reports "absent — no-op" for a comment it simply could not read
check_pr_visible() {
  local pr="$1" rc=0
  get_one_gh_resource "repos/$COMMENT_REPO/pulls/$pr" >/dev/null || rc=$?
  [[ "$rc" == "3" ]] && fail_comment_constraint "pull request $COMMENT_REPO#$pr is absent, or $COMMENT_LOGIN ($COMMENT_AUTH) cannot see it" "check --pr and --in"$'\n'"rerun with --auth $(as_auth_other "$COMMENT_AUTH")"
  [[ "$rc" == "0" ]] || exit "$rc"
}

# .what = refuse an absent target, once the pr proves visible
# .why  = a 404 names absence only when the credential can see the pr; else the
#         refusal names visibility, so a caller never debugs the wrong cause
# .note = args: the pr, then the args of fail_comment_constraint
fail_comment_absent() {
  local pr="$1"
  shift
  check_pr_visible "$pr"
  fail_comment_constraint "$@"
}

# .what = refuse when id N is absent as --kind, yet a comment of the other kind on pr N
# .why  = a wrong --kind 404s just like an absent comment; del must never report
#         "absent — no-op" for a comment that still stands under the other kind
check_comment_kind_not_swapped() {
  local pr="$1" kind="$2" id="$3" other="issue" found rc=0
  [[ "$kind" == "issue" ]] && other="review"
  found="$(get_one_gh_resource "$(get_comment_endpoint "$COMMENT_REPO" "$other" "$id")")" || rc=$?
  [[ "$rc" == "3" ]] && return 0
  [[ "$rc" == "0" ]] || exit "$rc"
  is_comment_on_pr "$found" "$pr" || return 0
  fail_comment_constraint "no $kind comment $id, but $other comment $id sits on $COMMENT_REPO#$pr" "pass --kind $other"
}

# .what = refuse when the --reply-to parent is absent, or sits on another pr
# .why  = a thread that does not exist holds no reply; set, get, and del each
#         refuse it, so del never reports "absent — no-op" for a typo
check_reply_parent_on_pr() {
  local pr="$1" reply_to="$2" parent rc=0
  parent="$(get_one_gh_resource "$(get_comment_endpoint "$COMMENT_REPO" review "$reply_to")")" || rc=$?
  [[ "$rc" == "3" ]] && fail_comment_absent "$pr" "no review comment $reply_to on $COMMENT_REPO for --reply-to" "rhx git.pull.comment.get $(as_comment_cmd_target "$pr")   # lists the ids"
  [[ "$rc" == "0" ]] || exit "$rc"
  is_comment_on_pr "$parent" "$pr" || fail_comment_constraint "review comment $reply_to is not on $COMMENT_REPO#$pr" "rhx git.pull.comment.get $(as_comment_cmd_target "$pr")   # lists the ids"
}

######################################################################
# comment transformers (pure)
######################################################################

# .what = the endpoint of one comment, by kind
# .why  = github keeps issue comments and review comments on two endpoints
get_comment_endpoint() {
  local repo="$1" kind="$2" id="$3"
  if [[ "$kind" == "issue" ]]; then
    echo "repos/$repo/issues/comments/$id"
    return 0
  fi
  echo "repos/$repo/pulls/comments/$id"
}

# .what = is this author the current credential's login?
# .why  = a key matches only the current login's comments, never another author's
# .note = an app token's viewer may read 'slug' while its comments read
#         'slug[bot]'; both name one identity (COMMENT_JQ_DEFS is_login_self)
is_author_self() {
  [[ -n "$COMMENT_LOGIN" ]] || fail_comment_malfunction "author check ran before set_comment_login" "a verb must read the login first"
  jq -en --arg re "$COMMENT_KEY_MARKER_REGEX" --arg login "$COMMENT_LOGIN" --arg author "$1" \
    "$COMMENT_JQ_DEFS"' is_login_self($author)' >/dev/null
}

# .what = did the robot write this comment? its body opens with 🐢
# .why  = git.pull.comment.set prefixes every body it writes with 🐢 and no flag
#         omits it, so a body without it was typed by a human, whatever the login
# .note = the caller checks the author first; this reads the body alone
is_comment_by_robot() {
  local body
  body="$(printf '%s' "$1" | jq -j '.body // ""')"
  [[ "$body" == "🐢"* ]]
}

# .what = does this comment json sit on pr N?
# .why  = an id is repo-wide; --pr must not let a write land on another pr
is_comment_on_pr() {
  local json="$1" pr="$2"
  printf '%s' "$json" | jq -e --arg pr "$pr" '
    ((.issue_url // "") | test("/issues/" + $pr + "$"))
    or ((.pull_request_url // "") | test("/pulls/" + $pr + "$"))
  ' >/dev/null
}

# .what = the root id of the review thread that a review comment sits in
# .why  = github threads every reply under the thread root, a reply to a reply
#         included; so a reply key is scoped to the root, never to the id named
# .note = github's replies endpoint takes a top-level review comment id only
#         ("replies to replies are not supported"), so set posts to the root,
#         and every reply it makes carries the root as in_reply_to_id
get_thread_root_id() {
  local list="$1" reply_to="$2"
  printf '%s' "$list" | jq -r --argjson id "$reply_to" '(map(select(.id == $id))[0].in_reply_to_id) // $id'
}

# .what = the comments of a list that reply within one review thread
# .why  = a reply key is scoped to its thread; a match in another thread is another comment
get_replies_in_thread() {
  local list="$1" reply_to="$2" root
  root="$(get_thread_root_id "$list" "$reply_to")"
  printf '%s' "$list" | jq -c --argjson id "$root" 'map(select(.in_reply_to_id == $id))'
}

# .what = the comments of a github list that carry a key, split by author: { own, foreign }
# .why  = set and del both match a key, then refuse a twin or a foreign holder;
#         one split serves both, so they cannot match a key two ways
get_key_matches() {
  local list="$1" key="$2"
  [[ -n "$COMMENT_LOGIN" ]] || fail_comment_malfunction "key match ran before set_comment_login" "a verb must read the login first"
  printf '%s' "$list" | jq -c --arg re "$COMMENT_KEY_CLAIM_REGEX" --arg login "$COMMENT_LOGIN" --arg key "$key" \
    "$COMMENT_JQ_DEFS"'
    map(select(key_of == $key))
    | { own: map(select(is_login_self(.user.login))), foreign: map(select(is_login_self(.user.login) | not)) }'
}

# .what = how many comments a list holds
# .why  = the verbs branch on 0, 1, or more matches
get_count_of_comments() {
  printf '%s' "$1" | jq 'length'
}

# .what = the first comment of a list, as compact json
# .why  = after the twin guard, a match list holds at most one own comment
get_first_comment() {
  printf '%s' "$1" | jq -c '.[0]'
}

# .what = the id of the newest comment of a list
# .why  = a twin refusal names the newest twin as the one to delete
get_latest_comment_id() {
  printf '%s' "$1" | jq -r 'sort_by(.created_at) | last | .id'
}

# .what = one line per comment of a list: kind, id, author, and creation time
# .why  = a twin refusal names every twin, so the human sees which to keep;
#         issue and review ids are separate sequences, so each row names its kind
# .note = reads .user.login (raw github json) or .author (get's shaped rows)
get_comment_id_lines() {
  printf '%s' "$1" | jq -r --arg kind "$2" '.[] | "\($kind) comment \(.id) by \(.user.login // .author // "?"), created \(.created_at // "?")"'
}

# .what = the other --auth value
# .why  = a foreign-held key is often the caller's own comment under the other credential
as_auth_other() {
  [[ "$1" == "as-human" ]] && { echo "as-ehmpath"; return 0; }
  echo "as-human"
}

# .what = refuse when the current login holds a key twice
# .why  = a twin is never guessed between, by any verb; it reads only .id and
#         .created_at, so raw github json and get's shaped rows both fit
check_key_has_no_twin() {
  local own="$1" key="$2" kind="$3" pr="$4" own_count twin_lines
  own_count="$(get_count_of_comments "$own")"
  [[ "$own_count" -gt 1 ]] || return 0
  # refuse a twin: read each, then delete the newest by --id, one at a time
  local latest fixes id
  mapfile -t twin_lines < <(get_comment_id_lines "$own" "$kind")
  latest="$(get_latest_comment_id "$own")"
  fixes=""
  while IFS= read -r id; do
    fixes+="rhx git.pull.comment.get $(as_comment_cmd_target "$pr") --id $id --kind $kind   # read it first"$'\n'
  done < <(printf '%s' "$own" | jq -r 'sort_by(.created_at) | .[].id')
  fixes+="rhx git.pull.comment.del $(as_comment_cmd_target "$pr") --id $latest --kind $kind --mode apply   # the newest goes: the oldest is the one a reader already linked to"
  fail_comment_constraint "key '$key' matches $own_count comments by $COMMENT_LOGIN on $COMMENT_REPO#$pr" "${twin_lines[@]}" "$fixes"
}

# .what = refuse a key match that is a twin, or held only by another author
# .why  = set and del share both refusals; a twin is never guessed between, and a
#         foreign-held key is never adopted nor read as absent
# .note = verb is set or del; it shapes the fix the foreign refusal names
check_key_matches_claimable() {
  local matches="$1" key="$2" kind="$3" pr="$4" verb="$5"
  local own foreign own_count foreign_count
  own="$(printf '%s' "$matches" | jq -c '.own')"
  foreign="$(printf '%s' "$matches" | jq -c '.foreign')"
  own_count="$(get_count_of_comments "$own")"
  foreign_count="$(get_count_of_comments "$foreign")"

  check_key_has_no_twin "$own" "$key" "$kind" "$pr"

  # refuse a key another author holds, when none is own
  if [[ "$own_count" == "0" && "$foreign_count" != "0" ]]; then
    local holder holder_id other fix
    holder="$(get_first_comment "$foreign" | jq -r '.user.login // "?"')"
    holder_id="$(get_first_comment "$foreign" | jq -r '.id')"
    other="$(as_auth_other "$COMMENT_AUTH")"
    # each option on its own line; the holder may be a third party, not the caller's other credential
    fix="rhx git.pull.comment.del $(as_comment_cmd_target "$pr" none) --id $holder_id --kind $kind --auth $other   # if $holder is that login: plan, then add --mode apply"
    [[ "$verb" == "set" ]] && fix="rerun with --auth $other   # if $holder is that login"$'\n'"$fix, then rerun"
    fix="$fix"$'\n'"pick another --key"
    fail_comment_key_is_foreign "$key" "$pr" "$holder" "$holder_id" "$kind" "$fix"
  fi
  return 0
}

# .what = refuse a key that another author holds, and name the holder
# .why  = get, set, and del share one refusal for "key K is held by H, not by me",
#         so a foreign-held key reads one way across the family; each verb names its own fix
fail_comment_key_is_foreign() {
  local key="$1" pr="$2" holder="$3" holder_id="$4" kind="$5" fix="$6"
  fail_comment_constraint "key '$key' on $COMMENT_REPO#$pr is held by $holder, not by $COMMENT_LOGIN ($COMMENT_AUTH)" "held by: $kind comment $holder_id" "$fix"
}

######################################################################
# body shape: trim, prefix, marker, payload, hash
######################################################################

# .what = a body with \r dropped and tail newlines trimmed
# .why  = github rewrites line ends; the hash must compare text, not line ends
as_body_trimmed() {
  local body
  body="$(tr -d '\r')"
  printf '%s' "$body"
}

# .what = the 🐢 prefix, never doubled
# .why  = text read back from `get` already wears the prefix; a re-set must converge
as_body_prefixed() {
  local body
  body="$(cat)"
  if [[ "$body" == "🐢"* ]]; then
    printf '%s' "$body"
    return 0
  fi
  printf '🐢 %s' "$body"
}

# .what = the key marker for a key
# .why  = a hidden html comment holds the key, so the rendered comment shows none
as_key_marker() {
  printf '<!-- rhx:git.pull.comment key=%s -->' "$1"
}

# .what = the key a body carries, or empty
# .why  = the key is the comment's one address for an upsert
# .note = only a marker on the last line claims: set appends its marker last,
#         so a stray marker earlier in the text can never claim the comment
as_key_from_body() {
  jq -Rsr --arg re "$COMMENT_KEY_CLAIM_REGEX" '[match($re; "g") | .captures[0].string] | last // empty'
}

# .what = a body with every key marker removed, then trimmed
# .why  = text piped back from `get` carries its marker; set strips it before
#         it appends the one marker the --key names, so a body never holds two
as_body_unmarked() {
  jq -Rsr --arg re "$COMMENT_KEY_MARKER_REGEX" 'gsub($re; "")' | as_body_trimmed
}

# .what = the github write payload, { "body": <file text> }
# .why  = github's comment and pull endpoints both take the text as .body
as_comment_payload_from_file() {
  jq -n --rawfile body "$1" '{body: $body}'
}

# .what = sha256 of stdin, as a bare hex digest
# .why  = linux ships sha256sum, macos ships shasum; both give one digest
as_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | cut -d' ' -f1
    return 0
  fi
  shasum -a 256 | cut -d' ' -f1
}

# .what = sha256 of a json resource's trimmed .body
# .why  = set compares the read-back hash to the sent hash, so a write is proven
as_sha256_of_json_body() {
  jq -j '.body // ""' | as_body_trimmed | as_sha256
}

# .what = the byte count of stdin, as a bare number
# .why  = the tree shows a size beside the hash, so a human can spot an empty write
as_bytes_count() {
  wc -c | tr -d ' '
}

# .what = the character count of stdin, as a bare number
# .why  = github caps a comment or pr body by characters, not bytes
as_chars_count() {
  jq -Rs 'length'
}

# .what = refuse a body over github's cap, before any write
# .why  = a plan must never show green for an apply github would refuse with a 422
COMMENT_BODY_CHARS_MAX=65536
check_body_under_cap() {
  local chars="$1"
  ((chars <= COMMENT_BODY_CHARS_MAX)) || fail_comment_constraint "the body holds $chars characters; github caps a comment or pr description at $COMMENT_BODY_CHARS_MAX" "trim the body"$'\n'"split it across two keyed comments"
}

# .what = bytes of a json resource's trimmed .body
# .why  = the current body and the read-back body report their size one way
as_bytes_of_json_body() {
  jq -j '.body // ""' | as_body_trimmed | as_bytes_count
}
