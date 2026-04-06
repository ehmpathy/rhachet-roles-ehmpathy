# review r3: has-questioned-assumptions

surface and question all technical assumptions in the blueprint.

## assumption 1: keyrack SDK exists and works

**what we assume:** `import { keyrack } from 'rhachet/keyrack'` exists and returns `{ status, secret }`.

**what if false?** TypeScript compilation would fail. implementation would be blocked.

**evidence:** human stated "rhachet exports a keyrack SDK from 'rhachet/keyrack'". trust human on API availability.

**risk level:** low. human confirmed.

**mitigation:** verify import works at implementation time.

## assumption 2: keyrack.get() returns grant with status field

**what we assume:** `grant.status === 'locked'` is a valid check.

**what if false?** locked check would not work. user would see cryptic error.

**evidence:** blueprint contracts section shows this pattern. human suggested similar pattern in wish.

**risk level:** low. human provided the pattern.

**mitigation:** verify actual SDK response shape at implementation time.

## assumption 3: env.prep is correct environment

**what we assume:** XAI_API_KEY should be in env.prep, not env.prod or env.all.

**what if wrong?** keyrack would look in wrong bucket. credential would not be found.

**evidence:** human confirmed "use env.prep" in vision.

**risk level:** none. human confirmed.

## assumption 4: owner is 'ehmpath' not 'ehmpathy'

**what we assume:** `keyrack.get({ owner: 'ehmpath' })` is correct.

**what if false?** credential would not be found.

**evidence:** briefs state "owner is ehmpath, not ehmpathy. ehmpath is a subdomain of ehmpathy".

**risk level:** none. documented in briefs.

## assumption 5: 43 files contain the token name

**what we assume:** sedreplace will find EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN in 43 files.

**what if wrong?** some files would be missed or extra files would be changed.

**evidence:** research document enumerated files via grep. count may have changed since research.

**risk level:** low. sedreplace plan mode will show actual matches before apply.

**mitigation:** run sedreplace in plan mode first. verify count matches.

## assumption 6: shell hook runs TypeScript file

**what we assume:** `posttooluse.guardBorder.onWebfetch.sh` delegates to `guardBorder.onWebfetch.ts` which handles credentials.

**what if false?** credential would not be available to border guard.

**evidence:** research document citation shows shell hook runs `node ... guardBorderOnWebfetch()`.

**risk level:** low. code path verified in research.

## assumption 7: process.env.XAI_API_KEY is sufficient for downstream

**what we assume:** after `process.env.XAI_API_KEY = grant.secret`, downstream code can use the credential.

**what if false?** downstream code might read env var before we set it.

**evidence:** blueprint codepath shows credential fetch happens first in guardBorderOnWebfetch(), before stdin read and brain setup.

**risk level:** low. codepath order is explicit.

## assumption 8: exit(2) is correct for locked state

**what we assume:** exit code 2 signals "constraint error" (caller must fix).

**what if wrong?** caller might retry instead of prompt user.

**evidence:** brief `rule.require.exit-code-semantics` states exit 2 = "constraint error".

**risk level:** none. documented standard.

## assumption 9: keyrack.ehmpath.sh REQUIRED_KEYS controls init prompts

**what we assume:** keys in REQUIRED_KEYS array are prompted in keyrack init flow.

**what if false?** XAI_API_KEY would not be prompted.

**evidence:** research citation [7] shows REQUIRED_KEYS array used in keyrack init flow.

**risk level:** low. verified in research.

## issues found

none. all assumptions are either:
1. confirmed by human
2. documented in briefs
3. verified in research
4. mitigated by plan mode verification

## why this holds

| assumption | evidence source |
|------------|-----------------|
| SDK exists | human statement |
| grant.status | human-provided pattern |
| env.prep | human confirmation |
| owner: ehmpath | documented brief |
| 43 files | research grep (verify in plan) |
| shell → TypeScript | research citation |
| env var order | codepath order |
| exit(2) | documented standard |
| REQUIRED_KEYS | research citation |

no assumptions without evidence. all evidence is traceable.

## lesson

the junior (me) made assumptions based on:
1. human statements (trusted)
2. documentation (trusted)
3. research citations (verified)

no assumptions based on habit or intuition.
