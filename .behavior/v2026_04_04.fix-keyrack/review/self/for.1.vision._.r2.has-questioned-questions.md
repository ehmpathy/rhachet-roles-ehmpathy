# review: has-questioned-questions

triage of open questions in the vision.

## question 1: SDK vs CLI

**can be answered via logic?** yes.

human said: "if shell, use cli. if typescript, use sdk"

the border guard is TypeScript code (`guardBorder.onWebfetch.ts`). the shell wrapper (`posttooluse.guardBorder.onWebfetch.sh`) is just a launcher.

**answer:** use SDK. this is a TypeScript skill.

**triage:** [answered]

## question 2: env.prep vs env.all

**can be answered via logic?** partially.

- github token is in env.prep → used for push/release operations
- XAI key is for border guard → runs whenever WebFetch is called

**what context does mechanic run in?** development sessions. not CI. not prod deployment.

**but wait:** keyrack env isn't about deploy stage. it's about credential scope:
- env.prod = production credentials
- env.prep = pre-production credentials
- env.test = test credentials

XAI_API_KEY is a real API key with real costs. it's not a test key. so it belongs in env.prod or env.prep.

**can't answer:** need human to clarify. does "prep" mean "for development use" or "pre-production environment"?

**triage:** [wisher]

## question 3: rename the github token

**can be answered via logic?** yes.

human explicitly said: "lets drop the _PROD_ from the ehmpathy seaturtle key"

**answer:** yes, rename EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN

**scope check needed:** should grep for references before rename.

**triage:** [answered] (but scope check is [research])

## summary

| question | triage | answer |
|----------|--------|--------|
| SDK vs CLI | [answered] | use SDK (TypeScript skill) |
| env.prep vs env.all | [wisher] | need human input |
| rename token | [answered] | yes, human requested |
| rename scope | [research] | grep for references |

## fixes to apply

update vision questions section with triage markers.
