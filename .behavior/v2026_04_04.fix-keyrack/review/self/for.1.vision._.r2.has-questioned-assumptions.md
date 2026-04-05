# review r2: has-questioned-assumptions

on second look, I found issues I missed in r1.

## issue found: env assumption is backwards

in r1 I assumed `env.prod` was inferred. but looking at the extant keyrack.yml:

```yaml
env.prep:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
```

the github token is in `env.prep`, not `env.prod`. so XAI_API_KEY should likely be in `env.prep` too — or possibly `env.all` since border guard runs in all environments.

**fix:** update vision to ask: should XAI_API_KEY be in `env.prep` (like the github token) or `env.all`?

## issue found: SDK vs CLI decision made without evidence

I assumed SDK is better because human mentioned it. but:

1. keyrack.operations.sh uses CLI, not SDK
2. git.commit.push uses shell + CLI pattern
3. shell hooks have tty/stdin constraints

**what if CLI is intentional?** hooks run in constrained environments. CLI may be safer because it spawns a separate process with full access.

**fix:** should verify why extant skills use CLI. if there's a reason, SDK might not work. need to test or ask.

## issue found: vision claims "same pattern as git.commit.push" — is it?

vision says "same pattern as git.commit.push". but git.commit.push uses:

```bash
token=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
  --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN \
  --env prep \
  --allow-dangerous \
  --json 2>&1)
```

this is CLI, not SDK. if border guard uses SDK, it's a *different* pattern.

**fix:** vision should clarify: either use CLI (same pattern) or SDK (new pattern). can't claim consistency while doing something different.

## issue found: rename scope not assessed

vision mentions rename but doesn't assess scope. a rename requires:
1. update keyrack.yml
2. update keyrack.operations.sh
3. update any tests that reference the key
4. possibly update keyrack vault (where the secret is stored)

**fix:** need to grep for all references before claiming rename is "low priority". could be larger than expected.

## fixes applied to vision

| issue | how fixed |
|-------|-----------|
| env assumption | updated all `env prod` references to `env prep`; added open question about prep vs all |
| SDK vs CLI | added both options (A: SDK, B: CLI) to contract section; added decision question |
| "same pattern" claim | clarified that SDK is new pattern, CLI matches git.commit.push |
| rename scope | added note to grep for scope before rename |

## updated assumptions table

| assumption | r1 status | r2 status |
|------------|-----------|-----------|
| SDK exists | confirmed | confirmed |
| SDK works in hooks | needs test | needs test — CLI may be intentional |
| env.prod is right | needs clarification | likely env.prep or env.all |
| shell wrapper needed | keep | keep |
| rename is safe | likely safe | needs scope check via grep |
