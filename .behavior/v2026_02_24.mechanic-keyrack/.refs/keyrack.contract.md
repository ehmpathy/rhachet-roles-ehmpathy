# keyrack contract

## .what

`rhachet keyrack get` fetches secrets from the host manifest and outputs JSON.

## .why

- skills need api keys and tokens at runtime
- keys should not be hardcoded or committed
- keyrack provides secure, declarative key access

## .trust model

enforced via explicit `extends` in root keyrack:

```yaml
# .agent/keyrack.yml (root repo keyrack)
extends:
  - .agent/repo=ehmpathy/role=mechanic/keyrack.yml
```

- repo owner explicitly opts into which role keyracks to trust
- `keyrack get` only fetches keys from extended specs
- keyrack must be unlocked first (human action required)

## .usage

```bash
# in roles repo: init the spec (validates, prepares for distribution)
rhachet keyrack init --at src/domain.roles/mechanic/keyrack.yml

# in consumer repo: fetch key (reads from root keyrack, which extends role keyracks)
EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$(./node_modules/.bin/rhachet keyrack get --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN --json | jq -r '.key.secret')
```

## .contract

### init

run in the roles repo to prepare the spec for distribution:

```bash
rhachet keyrack init --at src/domain.roles/mechanic/keyrack.yml
```

this:
- validates the keyrack.yml schema
- ensures keys are resolvable from declared sources
- prepares for distribution (build → dist, then symlinked to `.agent/` in consumer repos)

### get

```
rhachet keyrack get --key <KEY_NAME>
```

| arg | required | description |
|-----|----------|-------------|
| `--key` | yes | name of the key to fetch |

reads from root keyrack (`.agent/keyrack.yml`), which extends role keyracks.

### output

with `--json`: JSON object with key metadata and value

```json
{
  "slug": "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN",
  "key": {
    "secret": "ghp_xxxx...",
    "grade": "prod"
  },
  "source": { "vault": "os.keychain", "mech": "REPLICA" },
  "env": "prod",
  "org": "ehmpathy"
}
```

without `--json`: raw value only (for direct assignment)

exit codes:
- `0` — success, export statement on stdout
- `2` — error (key not found, keyrack not unlocked, etc.)

### keyrack.yml schema

```yaml
# .agent/repo=ehmpathy/role=mechanic/keyrack.yml
org: ehmpathy
env.prod:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
env.test:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
```

the beauty of this design:
- **portable**: spec declares key names, not storage locations
- **secretive**: no storage details leak into committed files
- **lookup at runtime**: keyrack fetches from host manifest

## .integration

### git.commit.push.sh

before the token guard, fetch from keyrack:

```bash
# fetch token from keyrack
EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$(./node_modules/.bin/rhachet keyrack get --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN --json | jq -r '.key.secret')
```

keyrack is the source of truth — no fallback, no `|| true`. errors propagate with actionable messages.

## .todo

- [ ] implement `rhachet keyrack init` in rhachet core
- [ ] implement `rhachet keyrack get` in rhachet core
- [x] create `src/domain.roles/mechanic/keyrack.yml` with key spec
- [ ] add EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN to mechanic keyrack
- [ ] update `git.commit.push.sh` to fetch from keyrack
