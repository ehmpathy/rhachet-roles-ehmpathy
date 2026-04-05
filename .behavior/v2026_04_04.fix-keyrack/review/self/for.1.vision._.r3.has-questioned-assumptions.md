# review r3: has-questioned-assumptions

third pass. deeper reflection on each assumption.

## assumption 1: rhachet/keyrack SDK exists and works

**evidence:** human stated it explicitly

**what if wrong?** we'd discover at implementation. low risk — human is the authority here.

**counterexample:** none. human built rhachet.

**why it holds:** human is the source of truth for rhachet capabilities. trust but verify at implementation.

## assumption 2: TypeScript is the right place for keyrack logic

**what we assume:** TypeScript `guardBorder.onWebfetch.ts` should call keyrack SDK

**evidence:** human said "if typescript, use sdk"

**what if shell is better?** keyrack.operations.sh pattern works. proven. shell can export env vars before node runs.

**did wisher say this?** human said: "i forget if its a typescript skill or a shell skill. if shell, use cli. if typescript, use sdk"

**reality check:** `posttooluse.guardBorder.onWebfetch.sh` is shell but delegates to TypeScript via `node -e "..."`. so:
- shell wrapper = shell skill? → use CLI
- or TypeScript code = typescript skill? → use SDK

**why it holds:** the actual logic runs in TypeScript. shell wrapper is just a launcher. TypeScript should use SDK. but vision now shows both options so human can choose.

## assumption 3: XAI_API_KEY belongs in env.prep

**what we assume:** same env as EHMPATHY_SEATURTLE_GITHUB_TOKEN

**evidence:** extant keyrack.yml has github token in env.prep

**what if wrong?** XAI is used for border guard. border guard runs in all environments. maybe env.all is correct.

**did wisher say this?** no. inferred from pattern.

**counterexample:** github token is for push operations in CI/deploy contexts. XAI is for WebFetch in development sessions. different contexts.

**why it holds — or doesn't:** unclear. vision now asks human to decide between prep and all.

## assumption 4: keyrack works in PostToolUse hook context

**what we assume:** keyrack SDK can be called from within a Claude Code hook

**evidence:** none. git.commit.push uses CLI, not SDK.

**what if wrong?** hooks have constrained environments. keyrack SDK might need tty or interactive features.

**counterexample:** the SDK just makes HTTP calls to a daemon. should work in any context.

**why it might hold:** keyrack daemon runs separately. SDK is just an HTTP client. no tty needed.

**why it might not:** unknown constraints in hook environment. need to test.

**conclusion:** can't know without test. vision notes this uncertainty.

## assumption 5: rename is the right scope

**what we assume:** rename EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN

**evidence:** human requested it. name has _PROD_ but lives in env.prep.

**what if wrong?** rename could break other systems that reference the key.

**counterexample:** keyrack keys are per-owner. other repos define their own keys.

**did wisher say this?** yes, explicitly: "lets drop the _PROD_ from the ehmpathy seaturtle key"

**why it holds:** human requested. name is inaccurate. scope appears contained to this repo.

## summary

| assumption | confidence | evidence |
|------------|------------|----------|
| SDK exists | high | human stated |
| TypeScript uses SDK | high | human guidance |
| env.prep | medium | pattern from github token; human to decide |
| keyrack works in hooks | medium | theory says yes; need test |
| rename is safe | high | human requested; scope appears contained |

all assumptions either have human confirmation or are flagged as questions in the vision.
