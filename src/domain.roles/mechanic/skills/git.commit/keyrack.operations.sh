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
# seaturtle identities — single source of truth
#
# .what = the two commit-author identities a token can map to
# .why  = derive, predicate, and verify all reference these; one place to
#         update keeps them in sync (e.g. after an app rename)
#
# the app bot:
#   verified: gh api users/ehm-a-seaturtle[bot]  → id 295111357, type Bot
#             graphql viewer under a ghs_ token  → login ehm-a-seaturtle[bot], databaseId 295111357
#   the numeric id is the stable anchor github uses to link a commit to the
#   bot account (via the noreply email), so the squash collapses contributors
#   even if the app display name changes; the id survives app renames.
######################################################################

# standard seaturtle (turtle user / PAT) — also the fail-safe default
SEATURTLE_STANDARD_NAME="seaturtle[bot]"
SEATURTLE_STANDARD_EMAIL="seaturtle@ehmpath.com"

# app installation bot
SEATURTLE_APP_BOT_NAME="ehm-a-seaturtle[bot]"
SEATURTLE_APP_BOT_ID="295111357"
SEATURTLE_APP_BOT_EMAIL="${SEATURTLE_APP_BOT_ID}+${SEATURTLE_APP_BOT_NAME}@users.noreply.github.com"

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
#   ghs_*                  app installation token  → app bot
#   ghp_* / github_pat_*   personal access token   → standard seaturtle (turtle user)
#   empty / unknown        fail-safe               → standard seaturtle
#
# usage: IFS=$'\t' read -r name email < <(get_one_seaturtle_identity "$token")
# returns: "<name>\t<email>" on stdout
######################################################################
get_one_seaturtle_identity() {
  local token="${1:-}"

  # app installation token → app bot
  if [[ "$token" == ghs_* ]]; then
    printf '%s\t%s\n' "$SEATURTLE_APP_BOT_NAME" "$SEATURTLE_APP_BOT_EMAIL"
    return 0
  fi

  # pat (classic or fine-grained) or empty/unknown → standard
  printf '%s\t%s\n' "$SEATURTLE_STANDARD_NAME" "$SEATURTLE_STANDARD_EMAIL"
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

  [[ "$name" == "$SEATURTLE_STANDARD_NAME" || "$name" == "$SEATURTLE_APP_BOT_NAME" ]]
}

######################################################################
# assert_token_identity_in_sync
#
# .what = fail loud if an app token's live bot account does not match the
#         app-bot identity we hardcode for it
# .why  = the "2 contributors on squash" guarantee depends on the commit
#         author email carrying the SAME bot user id github uses when the
#         app opens the PR. if the token is swapped for a different app
#         (different bot id), the squash would silently show a 3rd
#         contributor. fail fast on a proven mismatch instead.
#
# scope:
#   - only app tokens (ghs_) carry an app-bot identity to verify
#   - graphql `viewer` is the reliable whoami for ghs_ tokens
#     (REST /user 403s for installation tokens — verified)
#   - a probe that cannot run (no gh, no network) does NOT block: the
#     guarantee is broken only by a WRONG id, and the push guard is a
#     backstop on the author name
#
# usage: assert_token_identity_in_sync "$token"
# returns: exit 0 if in sync (or not verifiable), exit 1 on proven mismatch
######################################################################
assert_token_identity_in_sync() {
  local token="${1:-}"

  # only app tokens carry an app-bot identity to verify
  [[ "$token" == ghs_* ]] || return 0

  # skip if gh is unavailable — do not block commits on a missing probe tool
  command -v gh >/dev/null 2>&1 || return 0

  # whoami: graphql viewer resolves the bot account for a ghs_ token
  local viewer_json
  viewer_json=$(GH_TOKEN="$token" gh api graphql \
    -f query='query { viewer { login databaseId } }' 2>/dev/null || echo "")

  # if the probe could not run (network, etc), do not block
  [[ -n "$viewer_json" ]] || return 0

  local actual_login actual_id
  actual_login=$(echo "$viewer_json" | jq -r '.data.viewer.login // empty')
  actual_id=$(echo "$viewer_json" | jq -r '.data.viewer.databaseId // empty')

  # if the probe returned an unparseable body, do not block on an unknowable id
  [[ -n "$actual_id" ]] || return 0

  # fail loud on a proven mismatch — emit to stderr (this is a guard error)
  if [[ "$actual_id" != "$SEATURTLE_APP_BOT_ID" || "$actual_login" != "$SEATURTLE_APP_BOT_NAME" ]]; then
    {
      echo "error: github token identity out of sync with the expected app bot"
      echo "  expected: $SEATURTLE_APP_BOT_NAME (id $SEATURTLE_APP_BOT_ID)"
      echo "  actual:   ${actual_login:-<unknown>} (id ${actual_id:-<unknown>})"
      echo ""
      echo "the commit-author email hardcodes the expected bot id; if the token"
      echo "maps to a different bot, the squash-merge would show a 3rd contributor."
      echo "fix the token, or update the seaturtle identities in keyrack.operations.sh."
    } >&2
    return 1
  fi

  return 0
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
