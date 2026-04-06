# review: has-questioned-assumptions

## assumption 1: rhachet/keyrack exports a usable SDK

**what do we assume?** that `import { keyrack } from 'rhachet/keyrack'` works and provides `keyrack.get()`

**evidence:** human stated "rhachet exports from 'rhachet/keyrack' a full keyrack sdk"

**what if opposite?** if SDK doesn't exist or has different API, we'd need to use CLI via shell or spawn

**did wisher say this?** yes, explicitly

**verdict:** holds. human confirmed SDK exists.

## assumption 2: keyrack.get() works in PostToolUse hook context

**what do we assume?** that keyrack SDK can be called from within a Claude Code hook

**evidence:** none. git.commit.push uses shell wrapper + CLI, not TypeScript + SDK

**what if opposite?** if keyrack SDK requires interactive prompts or tty access that hooks don't have, it would fail

**counterexample:** git.commit.push uses CLI via shell, not SDK. maybe there's a reason.

**verdict:** needs verification. should test keyrack SDK in hook context before commit. if it fails, fall back to CLI pattern like keyrack.operations.sh uses.

## assumption 3: XAI_API_KEY should be in env.prod

**what do we assume?** that prod is the right env for XAI_API_KEY

**evidence:** border guard runs during development (WebFetch in local sessions). prod might not be right.

**what if opposite?** if it should be env.all or env.test, we'd put it in wrong place

**did wisher say this?** no. we inferred it.

**verdict:** needs clarification. should ask human which env: prod, prep, test, or all?

## assumption 4: shell wrapper should remain

**what do we assume?** that the shell wrapper is needed

**evidence:** Claude Code hooks can be TypeScript directly (via `node -e "import(...).then(...)"`). shell wrapper just adds a layer.

**what if opposite?** if we could register TypeScript directly as hook, shell wrapper is unnecessary

**counterexample:** current shell wrapper sources apikeys.env. after fix, it omits credential logic entirely.

**verdict:** keep shell wrapper for now. it provides flexibility for future credential logic. but note this as potential cleanup.

## assumption 5: rename is safe

**what do we assume?** that rename of EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN won't break external systems

**evidence:** the key is used in keyrack.operations.sh and referenced in keyrack.yml

**what if opposite?** if other repos or systems reference this key name, rename would break them

**counterexample:** keyrack keys are per-owner (ehmpath). other repos would have their own keyrack.yml.

**verdict:** likely safe, but should grep for the key name across repos before rename. low priority.

## summary

| assumption | status |
|------------|--------|
| SDK exists | confirmed by human |
| SDK works in hooks | needs test |
| env.prod is right | needs clarification |
| shell wrapper needed | keep for now |
| rename is safe | likely safe, verify first |
