# github apps provision

this directory houses the declared GitHub Apps used by rhachet-roles-ehmpathy.

## structure

```
provision/github.apps/
├── readme.md                                   # this file
├── resources.ts                                # main declastruct resources file
└── resources.app.seaturtle-by-ehmpathy.ts      # app auth for mechanic role
```

## usage

### prerequisites

admin token via keyrack (one-time setup):
```bash
rhx keyrack set --owner admin --vault os.daemon --env prod --key GITHUB_TOKEN
```

requires `admin:org` scope (organization → administration → read and write).

### generate a plan

```bash
rhx keyrack unlock --owner admin --env prod --key GITHUB_TOKEN
npx declastruct plan --wish ./provision/github.apps/resources.ts --into ./provision/github.apps/.temp/plan.json
```

### apply the plan

```bash
npx declastruct apply --plan ./provision/github.apps/.temp/plan.json
```

## local usage (cli)

to get short-lived access tokens locally via your GitHub App credentials.

### bash function

add this function to your `~/.bashrc` or `~/.zshrc`:

```bash
# generates a short-lived github app installation access token (valid for 1 hour)
# usage: get_github_app_token <org> <app_id> <private_key>
get_github_app_token() {
  # prepare the jwt
  local ORG="$1" APP_ID="$2" PRIVATE_KEY="$3"
  local NOW=$(date +%s)
  local IAT=$((NOW - 60)) EXP=$((NOW + 600))
  local HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
  local PAYLOAD=$(echo -n "{\"iat\":${IAT},\"exp\":${EXP},\"iss\":\"${APP_ID}\"}" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
  local KEY_FILE=$(mktemp)
  echo -e "$PRIVATE_KEY" > "$KEY_FILE"
  local SIGNATURE=$(echo -n "${HEADER}.${PAYLOAD}" | openssl dgst -sha256 -sign "$KEY_FILE" 2>/dev/null | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
  rm -f "$KEY_FILE"
  if [[ -z "$SIGNATURE" ]]; then >&2 echo "error: failed to sign jwt (check private key format)"; return 1; fi

  # get the installation
  local JWT="${HEADER}.${PAYLOAD}.${SIGNATURE}"
  local INSTALLATION=$(curl -s -H "Authorization: Bearer $JWT" -H "Accept: application/vnd.github+json" "https://api.github.com/orgs/${ORG}/installation")
  local ERROR=$(echo "$INSTALLATION" | jq -r '.message // empty')
  if [[ -n "$ERROR" ]]; then >&2 echo "error: $ERROR"; return 1; fi

  # grab a token
  local INSTALLATION_ID=$(echo "$INSTALLATION" | jq '.id')
  local TOKEN_RESP=$(curl -s -X POST -H "Authorization: Bearer $JWT" -H "Accept: application/vnd.github+json" "https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens")
  local TOKEN=$(echo "$TOKEN_RESP" | jq -r '.token // empty')
  if [[ -z "$TOKEN" ]]; then >&2 echo "error: $(echo "$TOKEN_RESP" | jq -r '.message // "failed to get token"')"; return 1; fi

  # verify identity (output to stderr so it doesn't get captured in GITHUB_TOKEN=$(...) usage)
  local APP_SLUG=$(echo "$INSTALLATION" | jq -r '.app_slug')
  local REPOS=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/installation/repositories" | jq -r '[.repositories[].name] | join(", ") // empty')
  >&2 echo ""
  >&2 echo "🔑 authentication succeeded"
  >&2 echo "├─ as: ${APP_SLUG}[bot]"
  >&2 echo "├─ org: ${ORG}"
  >&2 echo "└─ repos: ${REPOS:-all}"
  >&2 echo ""
  echo "$TOKEN"
}
```

### 1password integration

store your GitHub App credentials in 1Password, then add aliases to your shell config:

```bash
# 1password item structure:
#   - item name: "github.app.seaturtle-by-ehmpathy"
#   - fields:
#     - app_id: "123456"
#     - app_private_key: "-----BEGIN RSA PRIVATE KEY-----\n..." (use literal `\n` instead of newlines)

# alias to export EHMPATHY_SEATURTLE_GITHUB_TOKEN with short-lived app token
alias use.github.ehmpathy.seaturtle='export EHMPATHY_SEATURTLE_GITHUB_TOKEN=$(get_github_app_token \
  ehmpathy \
  "$(op item get github.app.seaturtle-by-ehmpathy --fields label=app_id --format json | jq -r .value)" \
  "$(op item get github.app.seaturtle-by-ehmpathy --fields label=app_private_key --format json | jq -r .value)")'
```

usage:
```bash
# activate the token (valid for 1 hour)
use.github.ehmpathy.seaturtle

# now run commands that need EHMPATHY_SEATURTLE_GITHUB_TOKEN
npm run test:integration
```

## keyrack integration

the mechanic role uses keyrack to manage tokens. after provision:

1. store app credentials in keyrack:
   ```bash
   rhx keyrack set --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --env prep --vault os.secure
   ```

2. unlock in sessions:
   ```bash
   rhx keyrack unlock --owner ehmpath --env prep
   ```

the token is auto-fetched by `keyrack.operations.sh` when mechanic runs github commands.
