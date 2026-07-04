#!/usr/bin/env bash
######################################################################
# .what = show the github account identity a token maps to (whoami)
#
# .why  = an app installation token (ghs_) authors commits and opens PRs
#         as a bot user account. the "2 contributors on squash" guarantee
#         depends on the token mapping to the EXPECTED bot user id.
#         this skill probes which api endpoint reveals that identity, so
#         the git.commit failfast can be built on verified behavior.
#
# usage:
#   show.github.token.identity.sh                 # probe prep seaturtle token
#   show.github.token.identity.sh --env test      # probe a different env
#   show.github.token.identity.sh --token ghs_xxx # probe an explicit token
#
# guarantee:
#   - fetches EHMPATHY_SEATURTLE_GITHUB_TOKEN from keyrack unless --token given
#   - probes GET /user, graphql viewer, and /installation/repositories
#   - never prints the token secret
#   - fail-fast on errors
######################################################################

set -uo pipefail

# defaults
ENV="prep"
TOKEN=""

# parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --env)
      ENV="$2"
      shift 2
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: show.github.token.identity.sh [options]"
      echo ""
      echo "options:"
      echo "  --env ENV        keyrack env for the seaturtle token (default: prep)"
      echo "  --token TOKEN    probe an explicit token instead of keyrack"
      echo "  --help           show this help"
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

# fetch token from keyrack unless one was passed explicitly.
# reuse the proven fetch_github_token (handles owner fallback + json extraction),
# so this probe stays in sync with how git.commit actually fetches the token.
if [[ -z "$TOKEN" ]]; then
  OPERATIONS="$REPO_ROOT/src/domain.roles/mechanic/skills/git.commit/keyrack.operations.sh"
  if [[ -f "$OPERATIONS" ]]; then
    # shellcheck source=/dev/null
    source "$OPERATIONS"
    TOKEN=$(fetch_github_token)
  else
    KEYRACK_JSON=$("$REPO_ROOT/node_modules/.bin/rhachet" keyrack get \
      --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
      --owner ehmpath \
      --env "$ENV" \
      --allow-dangerous \
      --json 2>/dev/null || true)
    TOKEN=$(echo "$KEYRACK_JSON" | jq -r '.grant.key.secret // empty')
  fi
fi

# fail-fast if still no token
if [[ -z "$TOKEN" ]]; then
  echo "error: no token available (keyrack locked? run: rhx keyrack unlock --owner ehmpath --env $ENV --key EHMPATHY_SEATURTLE_GITHUB_TOKEN)" >&2
  exit 1
fi

echo "🐢 whoami under this token"
echo ""
echo "🐚 show.github.token.identity --env $ENV"
echo "   ├─ token: ${TOKEN:0:4}… (len=${#TOKEN})"
echo "   ├─ probe A: GET /user"
GH_TOKEN="$TOKEN" gh api -X GET /user --jq '"   │  └─ login=\(.login) id=\(.id) type=\(.type)"' 2>&1 | head -3 || echo "   │  └─ (failed — installation tokens often 403 here)"
echo "   ├─ probe B: graphql viewer"
GH_TOKEN="$TOKEN" gh api graphql -f query='query { viewer { login databaseId } }' --jq '"   │  └─ login=\(.data.viewer.login) databaseId=\(.data.viewer.databaseId)"' 2>&1 | head -3 || echo "   │  └─ (failed)"
echo "   └─ probe C: GET /installation/repositories"
GH_TOKEN="$TOKEN" gh api -X GET /installation/repositories --jq '"      └─ total=\(.total_count) (confirms installation token works)"' 2>&1 | head -3 || echo "      └─ (failed)"
