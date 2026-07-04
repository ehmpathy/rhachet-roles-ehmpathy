#!/usr/bin/env bash
######################################################################
# .what = shared keyrack operations for git skills
#
# .why  = single source of truth for token fetch logic
#         reused by git.commit.push, git.release, etc.
#
# usage:
#   source "$SKILL_DIR/../git.commit/keyrack.operations.bash"
#   TOKEN=$(fetch_github_token)
######################################################################

######################################################################
# fetch_github_token
# fetch GitHub token from keyrack with proper JSON extraction
#
# usage: TOKEN=$(fetch_github_token)
# returns: token string or empty if not available
# exits: 0 on success, 1 on failure (with error to stderr)
######################################################################
fetch_github_token() {
  local token=""
  local keyrack_output
  local keyrack_exit

  # find repo root for rhachet path
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || repo_root="."

  # try keyrack get with --json for proper extraction
  keyrack_exit=0
  keyrack_output=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
    --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
    --env prep \
    --allow-dangerous \
    --json 2>&1) || keyrack_exit=$?

  if [[ $keyrack_exit -eq 0 ]]; then
    token=$(echo "$keyrack_output" | jq -r '.grant.key.secret // empty')
  else
    # fallback: unlock ehmpath keyrack and retry
    "$repo_root/node_modules/.bin/rhachet" keyrack unlock \
      --owner ehmpath --prikey "$HOME/.ssh/ehmpath" --env prep \
      --key EHMPATHY_SEATURTLE_GITHUB_TOKEN >/dev/null 2>&1 || true

    local fallback_exit=0
    local fallback_output
    fallback_output=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
      --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
      --owner ehmpath \
      --env prep \
      --allow-dangerous \
      --json 2>&1) || fallback_exit=$?

    if [[ $fallback_exit -eq 0 ]]; then
      token=$(echo "$fallback_output" | jq -r '.grant.key.secret // empty')
    fi
  fi

  echo "$token"
}

######################################################################
# get_one_seaturtle_identity
# derive the seaturtle commit-author identity from a github token's kind
#
# .what = maps a token to the seaturtle author name + email that fits it
# .why  = github squash sets the squash-commit author to the PR opener.
#         to land 2 contributors (seaturtle + human) the commit author
#         must equal whoever opens the PR. opener identity follows the
#         token kind, so we derive the author from the token kind too.
#
# token kinds:
#   ghs_*                  app installation token  → alternative seaturtle (app bot)
#   ghp_* / github_pat_*   personal access token   → standard seaturtle (turtle user)
#   empty / unknown        fail-safe               → standard seaturtle
#
# usage: IFS=$'\t' read -r name email < <(get_one_seaturtle_identity "$token")
# returns: "<name>\t<email>" on stdout
######################################################################
get_one_seaturtle_identity() {
  local token="${1:-}"

  # standard seaturtle (turtle user / PAT) — also the fail-safe default
  local name_standard="seaturtle[bot]"
  local email_standard="seaturtle@ehmpath.com"

  # alternative seaturtle (app installation bot)
  # verified: gh api users/seaturtle-by-ehmpathy[bot] → id 295111357, type Bot
  # matches the squash author of app-opened PRs (e.g. declapract #509)
  local name_alternative="seaturtle-by-ehmpathy[bot]"
  local email_alternative="295111357+seaturtle-by-ehmpathy[bot]@users.noreply.github.com"

  # app installation token → alternative
  if [[ "$token" == ghs_* ]]; then
    printf '%s\t%s\n' "$name_alternative" "$email_alternative"
    return 0
  fi

  # pat (classic or fine-grained) or empty/unknown → standard
  printf '%s\t%s\n' "$name_standard" "$email_standard"
}

######################################################################
# is_one_seaturtle_identity_name
#
# .what = predicate: is this author name one of our seaturtle bots?
# .why  = push guard must accept commits from either identity
#         (standard seaturtle[bot] or the app bot), since
#         get_one_seaturtle_identity now picks based on token kind
#
# usage: if is_one_seaturtle_identity_name "$name"; then ...
# returns: exit 0 if name matches a known seaturtle identity, else 1
######################################################################
is_one_seaturtle_identity_name() {
  local name="${1:-}"

  # names must match those emitted by get_one_seaturtle_identity
  local name_standard="seaturtle[bot]"
  local name_alternative="seaturtle-by-ehmpathy[bot]"

  [[ "$name" == "$name_standard" || "$name" == "$name_alternative" ]]
}

######################################################################
# require_github_token
# fetch token and fail-fast with instructions if unavailable
#
# usage: TOKEN=$(require_github_token)
# returns: token string
# exits: 1 with instructions if token unavailable
######################################################################
require_github_token() {
  local token
  token=$(fetch_github_token)

  if [[ -z "$token" ]]; then
    echo "" >&2
    echo "🐢 bummer dude..." >&2
    echo "" >&2
    echo "🔐 github token not found" >&2
    echo "   ├─ run: rhx keyrack unlock --owner ehmpath --prikey ~/.ssh/ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN" >&2
    echo "   └─ then retry this command" >&2
    exit 1
  fi

  echo "$token"
}
