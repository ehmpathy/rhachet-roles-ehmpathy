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
    --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN \
    --allow-dangerous \
    --json 2>&1) || keyrack_exit=$?

  if [[ $keyrack_exit -eq 0 ]]; then
    token=$(echo "$keyrack_output" | jq -r '.grant.key.secret // empty')
  else
    # fallback: unlock ehmpath keyrack and retry
    "$repo_root/node_modules/.bin/rhachet" keyrack unlock \
      --owner ehmpath --prikey "$HOME/.ssh/ehmpath" --env all >/dev/null 2>&1 || true

    local fallback_exit=0
    local fallback_output
    fallback_output=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
      --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN \
      --owner ehmpath \
      --allow-dangerous \
      --json 2>&1) || fallback_exit=$?

    if [[ $fallback_exit -eq 0 ]]; then
      token=$(echo "$fallback_output" | jq -r '.grant.key.secret // empty')
    fi
  fi

  echo "$token"
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
    echo "   ├─ run: rhx keyrack unlock --owner ehmpath --prikey ~/.ssh/ehmpath --env all" >&2
    echo "   └─ then retry this command" >&2
    exit 1
  fi

  echo "$token"
}
