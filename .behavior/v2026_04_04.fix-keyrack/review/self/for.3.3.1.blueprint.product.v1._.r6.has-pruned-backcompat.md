# review r6: has-pruned-backcompat

sixth pass. dig deeper into backcompat implications.

## the core question

"did we add backwards compatibility that was not requested?"

opposite question: "did we REMOVE backwards compatibility without permission?"

## change-by-change deep dive

### token rename: potential external consumers

**the concern:** EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN might be used outside this repo.

**where could it be used?**
1. CI/CD pipelines in other repos
2. Documentation that references the token name
3. Human memory/muscle memory

**evidence from research:**
- grep found 43 files, all in `src/`
- no `.github/workflows` files reference this token by name (workflows use secrets, not direct token names)

**what if external repos use this token?**
- they would break
- but: human said "propogated throughout all skills" — implies this repo is the authoritative source
- if external repos used this token, they would reference the keyrack, not the token name directly

**verdict:** no external backcompat concern found.

### apikeys.env removal: migration impact

**the concern:** users with apikeys.env would have a dead file.

**who would be affected?**
- any human who previously set up `~/.config/rhachet/apikeys.env`

**what happens after change?**
1. shell hook no longer sources apikeys.env
2. TypeScript fetches from keyrack instead
3. apikeys.env becomes unused

**is this a break?**
- for WebFetch: yes, if user has apikeys.env but not keyrack setup
- for git.commit.push: already uses keyrack, not apikeys.env

**did we add backcompat for this?** no.

**should we?** no. vision said "omits entirely". migration to keyrack is intentional.

**should we flag as open question?** no. vision was explicit.

### keyrack SDK: behavior change

**the concern:** guardBorder.onWebfetch.ts behavior changes.

**before:**
1. shell sources apikeys.env → XAI_API_KEY in env
2. TypeScript checks process.env.XAI_API_KEY
3. if absent: error

**after:**
1. TypeScript calls keyrack.get()
2. if locked: error with unlock instructions
3. if unlocked: sets process.env.XAI_API_KEY

**behavior difference:**
- before: silent failure if apikeys.env absent
- after: actionable error with unlock instructions

**is this a backcompat break?** no. it's an improvement. more helpful error message.

**did we add backcompat?** no.

**should we?** no. the new behavior is strictly better.

## hidden backcompat we might have missed

### env var name change?

**question:** does any code check for a different env var name?

**analysis:** blueprint only changes how XAI_API_KEY is fetched, not its name. downstream code still sees `process.env.XAI_API_KEY`.

**backcompat concern:** none.

### keyrack owner change?

**question:** could keyrack owner affect backcompat?

**analysis:** blueprint uses `owner: 'ehmpath'`. this is the same owner used by git.commit.push. no change.

**backcompat concern:** none.

### keyrack env change?

**question:** could keyrack env affect backcompat?

**analysis:** blueprint uses `env: 'prep'`. vision confirmed this.

**backcompat concern:** none.

## backcompat items found

none explicitly or implicitly in blueprint.

## why this holds

1. **token rename** — contained to this repo, human explicitly requested
2. **apikeys.env removal** — vision explicitly said "omits entirely"
3. **keyrack SDK** — behavior improves, env var name unchanged

no assumptions about external consumers. no "to be safe" additions.

## lesson

backwards compatibility must be explicitly requested because:
1. it adds code complexity
2. it delays migration
3. it creates maintenance burden

none of these were requested. blueprint is correct to exclude backcompat.
