# review r5: has-pruned-backcompat

examine each change for backwards compatibility concerns.

## backwards compatibility analysis

### change 1: token rename

**change:** EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN

**backcompat concern:** external systems or scripts might reference the old token name.

**did wisher request backcompat?** no. human said "hard criteria... propogated throughout all skills".

**should we add backcompat?** no. explicit instruction to rename everywhere. no mention of old name preservation.

**potential issue:** if old name is used in:
- CI/CD pipelines
- external scripts
- other repos

**analysis:** the token is used within this repo only. research showed 43 files, all in src/. no external references found.

**verdict:** no backcompat needed. rename is complete.

### change 2: remove apikeys.env source

**change:** shell hook no longer sources `~/.config/rhachet/apikeys.env`

**backcompat concern:** users with apikeys.env would have a dead config file.

**did wisher request backcompat?** no. vision said "shell wrapper omits credential logic entirely".

**should we add backcompat?** no. explicit instruction to remove. keyrack is the new path.

**potential issue:** users who have apikeys.env but not keyrack setup would break.

**analysis:** this is intentional. keyrack is the new standard. apikeys.env was a legacy approach.

**verdict:** no backcompat needed. migration to keyrack is the goal.

### change 3: keyrack SDK in TypeScript

**change:** guardBorder.onWebfetch.ts uses keyrack.get() instead of process.env.XAI_API_KEY check.

**backcompat concern:** code that relied on env var set externally would break.

**did wisher request backcompat?** no. vision said to use keyrack.

**should we add backcompat?** no. keyrack.get() sets process.env.XAI_API_KEY for downstream. same result, different source.

**analysis:** downstream code sees same env var. source changed from manual env to keyrack. transparent to callers.

**verdict:** no backcompat concern. behavior preserved.

### change 4: XAI_API_KEY in keyrack.yml

**change:** add XAI_API_KEY to env.prep

**backcompat concern:** none. this is additive.

**verdict:** no backcompat concern.

### change 5: REQUIRED_KEYS update

**change:** add XAI_API_KEY to REQUIRED_KEYS in keyrack.ehmpath.sh

**backcompat concern:** keyrack init will now prompt for XAI_API_KEY.

**is this a break?** no. prompts are additive. users who already have XAI_API_KEY in keyrack would not be affected.

**verdict:** no backcompat concern.

## backwards compat items found

none explicitly in blueprint.

## potential backcompat we did NOT add (correctly)

1. **alias for old token name** — we did not add an alias like `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$EHMPATHY_SEATURTLE_GITHUB_TOKEN`. this would be YAGNI.

2. **fallback to apikeys.env** — we did not keep a fallback like "if keyrack fails, try apikeys.env". this would undermine the migration.

3. **deprecation warnings** — we did not add warnings like "old token name detected, please update". not requested.

## why this holds

all changes were explicitly requested:
- rename: human said "hard criteria"
- remove apikeys.env: vision said "omits entirely"
- keyrack SDK: vision said "border guard checks keyrack"

no "to be safe" backcompat was added. no assumptions about external consumers.

## lesson

backcompat is a feature. features must be requested. we did not assume backcompat was needed because:
1. wisher did not mention it
2. scope is internal to this repo
3. migration to keyrack is the explicit goal
