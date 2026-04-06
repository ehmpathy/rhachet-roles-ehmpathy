# review r3: has-questioned-questions

deeper reflection on the triage from r2.

## re-examining question 1: SDK vs CLI

**r2 said:** [answered] — use SDK because TypeScript skill

**on reflection:** is this actually answered? let me trace the human's words:

> "btw, rhachet exports from 'rhachet/keyrack' a full keyrack sdk"
> "i forget if its a typescript skill or a shell skill. if shell, use cli. if typescript, use sdk"

the human doesn't remember if it's shell or typescript. I concluded TypeScript because the logic is in `guardBorder.onWebfetch.ts`.

**but wait:** the *hook* is shell (`posttooluse.guardBorder.onWebfetch.sh`). the shell hook delegates to TypeScript.

**question:** is the skill type determined by the hook or the logic?

**answer via code:** looking at git.commit.push pattern — it's shell that calls keyrack CLI. the logic may be in TypeScript but the entry point is shell.

**refined answer:** the human said "if typescript, use sdk". the actual credential-fetching code will be in TypeScript (`guardBorder.onWebfetch.ts`). so SDK is correct.

**triage holds:** [answered]

## re-examining question 2: env.prep vs env.all

**r2 said:** [wisher] — need human input

**on reflection:** can I answer this via logic?

keyrack env semantics (from keyrack.yml structure):
- `env.all` = keys available in all environments
- `env.prod` = production keys
- `env.prep` = pre-production keys
- `env.test` = test keys

XAI_API_KEY is a real API key for grok. it costs real money. it's not a test mock.

**inference:** XAI_API_KEY should be in `env.prod` or `env.all`.

but github token is in `env.prep`. why? maybe because:
- prep is "safe to use in development"
- prod is "only for production deploys"

**can't determine:** the semantics aren't clear enough. [wisher] is correct.

**triage holds:** [wisher]

## re-examining question 3: rename

**r2 said:** [answered] yes rename; [research] grep for scope

**on reflection:** the rename is clearly requested. but the research note is valid — we should check scope before rename.

let me do the grep now to convert [research] to [answered]:

**triage update:** will do grep as part of this review.

## scope check for rename

files that reference EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:

1. `src/domain.roles/mechanic/keyrack.yml` — the declaration
2. `src/domain.roles/mechanic/skills/git.commit/keyrack.operations.sh` — the usage

that's it. scope is small. rename is safe.

**triage update:** [answered] — scope is 2 files, safe to rename

## updated summary

| question | r2 triage | r3 triage | notes |
|----------|-----------|-----------|-------|
| SDK vs CLI | [answered] | [answered] | confirmed via code analysis |
| env.prep vs env.all | [wisher] | [wisher] | semantics unclear, need human |
| rename | [answered]+[research] | [answered] | grep done, scope is 2 files |

## articulation: why each triage holds

### SDK vs CLI — why [answered] holds

the human's guidance was clear: "if typescript, use sdk". the credential-fetching code will be in TypeScript (`guardBorder.onWebfetch.ts`), not in the shell wrapper. therefore SDK is the correct choice.

**lesson:** when human gives conditional guidance, trace the code to determine which condition applies.

### env question — why [wisher] holds

attempted to derive the answer via logic but failed. keyrack env semantics are ambiguous:
- github token is in prep but it's a real token
- XAI key is real but should it be prod or prep?

the human defines the semantics. only they know the intent.

**lesson:** when semantics are defined by the human (not the system), mark as [wisher].

### rename — why [answered] holds after [research]

converted [research] to [answered] by doing the grep in this review pass. found only 2 files reference the key. scope is small, rename is safe.

**lesson:** do the research inline when feasible. converts [research] to [answered] immediately.

## fixes applied to vision

1. updated rename question from `[research] grep for scope` to include the result: `scope = 2 files`
2. updated contract section decision from "need to clarify" to "use SDK (option A)" — consistency with [answered] triage
3. surfaced [wisher] question to human — got answers:
   - SDK: confirmed
   - env.prep: confirmed
   - rename: confirmed
4. updated all questions to [answered] status
5. updated assumptions section to reflect confirmed decisions

## final state

all questions now [answered]. no [wisher] or [research] items remain. vision is ready for implementation.
