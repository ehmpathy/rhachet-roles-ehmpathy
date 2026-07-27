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
# FETCH_TOKEN_TIMEOUT bounds every keyrack call so a stalled daemon or
# unreachable network can never hang the caller. the vision requires that a
# keyrack outage fail fast (so the fallback stays reachable), and a hang is
# worse than a failure — `timeout` converts a stall into a bounded non-zero
# exit that flows into the same empty-token path as any other failure.
FETCH_TOKEN_TIMEOUT="${FETCH_TOKEN_TIMEOUT:-30}"

fetch_github_token() {
  local token=""

  # find repo root for rhachet path
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || repo_root="."

  # capture stdout and stderr SEPARATELY across every rhachet call. stdout must
  # stay pure json for jq; stderr (a warn line, deprecation notice, or error) is
  # held apart so it can never bleed into the json stream. a merged `2>&1` would
  # feed a non-json line into jq — even when rhachet exits 0 but emits a stray
  # note on stderr — so jq fails, the token reads empty, and a HEALTHY keyrack is
  # misreported as unavailable (or, under the caller's set -euo pipefail, the run
  # aborts with a raw jq error instead of the guide). streams kept apart keep the
  # json clean and preserve the guide path (rule.forbid.failhide,
  # rule.forbid.maintenance-hazards). the captured stderr is forwarded onward as
  # the guide cause when the fetch fails (see the surface note below the calls).
  local stderr_file
  stderr_file=$(mktemp)

  # try keyrack get with --json for proper extraction (time-bounded)
  local keyrack_exit=0
  local keyrack_stdout
  keyrack_stdout=$(timeout "$FETCH_TOKEN_TIMEOUT" "$repo_root/node_modules/.bin/rhachet" keyrack get \
    --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
    --env prep \
    --allow-dangerous \
    --json 2>>"$stderr_file") || keyrack_exit=$?

  # primary attempt: parse the token when the keyrack get succeeded
  if [[ $keyrack_exit -eq 0 ]]; then
    token=$(echo "$keyrack_stdout" | jq -r '.grant.key.secret // empty')
  fi

  # fallback (guarded on the SAME condition — no else, so the narrative stays
  # linear per rule.forbid.else-branches): only when the primary get failed,
  # unlock the ehmpath keyrack and retry, both calls time-bounded.
  if [[ $keyrack_exit -ne 0 ]]; then
    timeout "$FETCH_TOKEN_TIMEOUT" "$repo_root/node_modules/.bin/rhachet" keyrack unlock \
      --owner ehmpath --prikey "$HOME/.ssh/ehmpath" --env prep \
      --key EHMPATHY_SEATURTLE_GITHUB_TOKEN >/dev/null 2>>"$stderr_file" || true

    local fallback_exit=0
    local fallback_stdout
    fallback_stdout=$(timeout "$FETCH_TOKEN_TIMEOUT" "$repo_root/node_modules/.bin/rhachet" keyrack get \
      --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
      --owner ehmpath \
      --env prep \
      --allow-dangerous \
      --json 2>>"$stderr_file") || fallback_exit=$?

    # parse the retry token when the fallback get succeeded (guard-clause, no else)
    if [[ $fallback_exit -eq 0 ]]; then
      token=$(echo "$fallback_stdout" | jq -r '.grant.key.secret // empty')
    fi
  fi

  # forward the captured stderr as the cause the caller surfaces in its guide,
  # but ONLY when no token was reached (the recovery path stays quiet on the
  # normal unlock-then-retry). the callers (git.commit.push/set) wrap this call
  # with `2>"$TOKEN_FETCH_ERR_FILE"` specifically to diagnose a real keyrack
  # failure — network timeout, locked keyrack, daemon down — so discarding it
  # would hide the cause and collapse every failure into one generic guide
  # (rule.forbid.failhide, rule.forbid.behavior-hazards). the stderr is first
  # sanitized: sed drops ansi color sequences, tr drops the remaining control
  # chars (keep \t \n \r for a readable multi-line cause) — so it reads clean in
  # the guide tree AND stays valid once escape_json_string folds it into the
  # {"error":"..."} json path (a raw control char would break that parse).
  if [[ -z "$token" ]]; then
    sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g' "$stderr_file" \
      | tr -d '\000-\010\013\014\016-\037' >&2
  fi
  rm -f "$stderr_file"

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

  # fail loud on a proven mismatch. this is a malfunction-class guard (a token
  # that maps to the WRONG bot would silently add a 3rd squash contributor), so
  # the diagnosis rides BOTH streams — stdout for a human at the terminal or a
  # stdout-only consumer, stderr for log aggregation. the callers use this as a
  # bare `|| exit 2` guard, so if it spoke only to stderr the failure would read
  # as a silent-stdout dead end (rule.require.skill-output-streams: a failure
  # rides both streams). we build the message once, then echo it to each stream
  # (the portable dual-echo the codebase already uses in validate_enum_arg — `tee
  # /dev/stderr` is not portable to every spawned shell). plain text (not the json
  # guide shape) is intentional — a proven bot-id desync is a loud misconfiguration,
  # and a fail-loud diagnosis outranks format purity on this rare path.
  if [[ "$actual_id" != "$SEATURTLE_APP_BOT_ID" || "$actual_login" != "$SEATURTLE_APP_BOT_NAME" ]]; then
    local mismatch_msg
    mismatch_msg=$(
      echo "error: github token identity out of sync with the expected app bot"
      echo "  expected: $SEATURTLE_APP_BOT_NAME (id $SEATURTLE_APP_BOT_ID)"
      echo "  actual:   ${actual_login:-<unknown>} (id ${actual_id:-<unknown>})"
      echo ""
      echo "the commit-author email hardcodes the expected bot id; if the token"
      echo "maps to a different bot, the squash-merge would show a 3rd contributor."
      echo "fix the token, or update the seaturtle identities in keyrack.operations.sh."
    )
    echo "$mismatch_msg"
    echo "$mismatch_msg" >&2
    return 1
  fi

  return 0
}

