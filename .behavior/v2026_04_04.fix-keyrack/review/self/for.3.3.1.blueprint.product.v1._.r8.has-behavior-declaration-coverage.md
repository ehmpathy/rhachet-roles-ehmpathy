# review r8: has-behavior-declaration-coverage

verify blueprint covers all requirements from vision and criteria.

## vision requirements coverage

### requirement: add XAI_API_KEY to keyrack.yml

**vision says:** keyrack.yml lists required keys — humans know what to fill

**blueprint covers:**
- summary point #1: "add `XAI_API_KEY` to mechanic keyrack.yml"
- keyrack.yml section: `[+] XAI_API_KEY`

**covered?** yes.

### requirement: replace apikeys.env with keyrack SDK

**vision says:** use SDK (option A). human said "if typescript, use sdk"

**blueprint covers:**
- summary point #2: "replace hardcoded apikeys.env with keyrack SDK"
- codepath tree: `[-] if (!process.env.XAI_API_KEY)` → `[+] keyrack.get()`
- contracts section: full SDK usage code

**covered?** yes.

### requirement: rename token (remove _PROD_)

**vision says:** rename to `EHMPATHY_SEATURTLE_GITHUB_TOKEN` fixes this inconsistency

**blueprint covers:**
- summary point #3: "rename ... across all files"
- keyrack.yml section: `[~] EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN`
- rename scope section: lists 43 files

**covered?** yes.

### requirement: shell wrapper omits credential logic

**vision says:** shell wrapper omits credential logic entirely

**blueprint covers:**
- codepath tree for posttooluse.guardBorder.onWebfetch.sh:
  ```
  ├─ [-] source ~/.config/rhachet/apikeys.env
  └─ [○] exec node ... guardBorderOnWebfetch()
  ```

**covered?** yes.

### requirement: emit unlock instructions

**vision says:** if locked: emit unlock instructions, exit 2

**blueprint covers:**
- codepath tree: `[+] if locked: emit unlock instructions, exit(2)`
- contracts section:
  ```typescript
  if (grant.status === 'locked') {
    console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
    process.exit(2);
  }
  ```

**covered?** yes.

### requirement: use env.prep

**vision says:** XAI_API_KEY in `env.prep` (confirmed)

**blueprint covers:**
- contracts section: `env: 'prep'`
- keyrack.yml section: under `env.prep:`

**covered?** yes.

## criteria coverage

### usecase.1: fetch XAI_API_KEY from keyrack

**criteria says:**
```
then border guard fetches XAI_API_KEY from keyrack
  sothat credential is available without hardcoded paths
```

**blueprint covers:**
- codepath tree: `[+] const xaiKey = await keyrack.get({ key: 'XAI_API_KEY', ... })`
- contracts section: SDK call with key: 'XAI_API_KEY'

**covered?** yes.

### usecase.2: emit unlock instructions, exit 2

**criteria says:**
```
then border guard emits unlock instructions
  sothat mechanic knows how to unblock
then border guard exits with code 2
  sothat WebFetch is blocked until unlocked
```

**blueprint covers:**
- contracts section shows both console.error with unlock instructions AND process.exit(2)

**covered?** yes.

### usecase.3: renamed token

**criteria says:**
```
then keyrack fetches EHMPATHY_SEATURTLE_GITHUB_TOKEN
  sothat the token name is consistent (no _PROD_ in prep env)
```

**blueprint covers:**
- rename scope section: sedreplace for the rename
- filediff tree: all affected files listed

**covered?** yes.

### usecase.4: one unlock for all skills

**criteria says:**
```
then XAI_API_KEY is available
...
then EHMPATHY_SEATURTLE_GITHUB_TOKEN is available
  sothat one unlock command enables all keyrack-dependent skills
```

**blueprint covers:**
- keyrack.yml section: both keys under `env.prep`
- implicit: same owner (ehmpath), same env (prep) = one unlock

**covered?** yes.

### exchange.1: keyrack.get call

**criteria says:**
```
when guardBorder.onWebfetch.ts calls keyrack.get({ key: 'XAI_API_KEY', owner: 'ehmpath', env: 'prep' })
```

**blueprint covers:**
- contracts section: exact call shown with key, owner, env

**covered?** yes.

### exchange.2: keyrack.yml declares both keys

**criteria says:**
```
then contains XAI_API_KEY under env.prep
then contains EHMPATHY_SEATURTLE_GITHUB_TOKEN under env.prep (renamed)
```

**blueprint covers:**
- keyrack.yml section shows both:
  ```
  env.prep:
  ├─ [~] EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN
  └─ [+] XAI_API_KEY
  ```

**covered?** yes.

## coverage summary

| vision requirement | blueprint section | covered |
|-------------------|-------------------|---------|
| add XAI_API_KEY | summary, keyrack.yml | yes |
| use keyrack SDK | summary, codepath, contracts | yes |
| rename token | summary, rename scope | yes |
| shell omits credentials | codepath tree | yes |
| unlock instructions | contracts | yes |
| use env.prep | contracts, keyrack.yml | yes |

| criteria | blueprint section | covered |
|----------|-------------------|---------|
| usecase.1 | codepath, contracts | yes |
| usecase.2 | contracts | yes |
| usecase.3 | rename scope | yes |
| usecase.4 | keyrack.yml | yes |
| exchange.1 | contracts | yes |
| exchange.2 | keyrack.yml | yes |

## issues found

none. all requirements from vision and criteria are addressed in blueprint.

## why this holds

every requirement maps to a blueprint section:
1. summary provides overview of all three changes
2. filediff tree shows which files change
3. codepath tree shows what changes in each file
4. contracts section provides exact code
5. rename scope lists all files for bulk rename

no requirements were skipped or forgotten.

