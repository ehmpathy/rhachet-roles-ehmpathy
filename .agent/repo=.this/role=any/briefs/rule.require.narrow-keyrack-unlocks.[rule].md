# rule.require.narrow-keyrack-unlocks

## .what

skills must unlock only the specific keys they need via `--key` flag, not the entire keyrack.

## .why

broad keyrack unlock causes hangs:
- aws.config keys require browser sso auth
- if skill only needs os.secure key (no browser auth), it still waits
- narrow unlock skips keys the skill doesn't need
- skills run without human intervention

## .pattern

### narrow unlock (required)

```bash
rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN
```

### broad unlock (forbidden for skills)

```bash
# forbidden: unlocks ALL keys, hangs on aws.config sso
rhx keyrack unlock --owner ehmpath --env prep
```

## .exception

`git.repo.test` may use broad unlock because integration tests may need any credential declared in keyrack.yml.

## .examples

### good

```bash
# git.commit.push.sh - only needs github token
rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN
```

### bad

```bash
# forbidden: unlocks all keys (aws.config keys too)
rhx keyrack unlock --owner ehmpath --env prep
```

## .enforcement

- broad unlock in skill (except git.repo.test) = blocker
- skill without `--key` flag = blocker

