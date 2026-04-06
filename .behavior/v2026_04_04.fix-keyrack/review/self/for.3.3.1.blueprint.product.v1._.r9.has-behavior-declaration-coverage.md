# review r9: has-behavior-declaration-coverage

deeper review. question whether any implicit requirements were missed.

## re-read the wish

from wish:

> 1. XAI_API_KEY absent from keyrack.yml
> 2. border guard uses hardcoded apikeys.env path
> 3. TypeScript CLI should use keyrack SDK

these are the three problems. blueprint addresses all three.

but the wish also says:

> rhachet exports a keyrack SDK from 'rhachet/keyrack' that should be used

**question:** does blueprint specify the import path?

**answer:** yes. contracts section shows `import { keyrack } from 'rhachet/keyrack'`.

## re-read the vision for implicit requirements

### implicit: error message format

**vision shows:**
```
🔐 XAI_API_KEY locked

run: rhx keyrack unlock --owner ehmpath --env prep
```

**blueprint contracts section shows:**
```typescript
console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
```

**matches?** yes. exact same format.

### implicit: proceed with content inspection after unlock

**vision timeline:**
```
4. if unlocked: proceed with content inspection
```

**blueprint codepath tree:**
```
├─ [+] if unlocked: set process.env.XAI_API_KEY for downstream
├─ [○] read stdin
├─ [○] setup brain context
├─ [○] decide via webfetch adapter
└─ [○] output and exit
```

**matches?** yes. after credential set, the rest of the flow proceeds unchanged.

### implicit: keyrack init must prompt for XAI_API_KEY

**vision says:**
> keyrack.yml lists required keys — humans know what to fill

**criteria says:**
> sothat humans know what to fill via keyrack fill

**question:** does blueprint update keyrack.ehmpath.sh REQUIRED_KEYS?

**blueprint filediff tree:**
```
├─ [~] keyrack.ehmpath.sh
│     └─ rename token in REQUIRED_KEYS, add XAI_API_KEY
```

**covered?** yes. explicitly mentioned.

## re-read criteria for edge cases

### criteria usecase.1: "border guard inspects content via grok"

**question:** does blueprint change the content inspection logic?

**blueprint codepath tree:**
```
├─ [○] read stdin
├─ [○] setup brain context
├─ [○] decide via webfetch adapter
└─ [○] output and exit
```

`[○]` means unchanged. the inspection logic remains intact.

**covered?** yes. blueprint only changes credential fetch, not inspection.

### criteria usecase.2: exit code 2

**question:** is exit code 2 clearly specified?

**blueprint contracts section:**
```typescript
process.exit(2);
```

**covered?** yes. exact exit code specified.

### criteria usecase.4: "one unlock command enables all"

**question:** does blueprint ensure both keys are in same env?

**blueprint keyrack.yml section:**
```
env.prep:
├─ [~] EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN
└─ [+] XAI_API_KEY
```

**covered?** yes. both keys under env.prep.

## question each filediff entry

### filediff: keyrack.yml

**requirement source:** wish problem #1, criteria exchange.2

**covered?** yes.

### filediff: keyrack.ehmpath.sh

**requirement source:** implicit (keyrack init must know about new key)

**covered?** yes.

### filediff: posttooluse.guardBorder.onWebfetch.sh

**requirement source:** vision "shell wrapper omits credential logic"

**covered?** yes.

### filediff: guardBorder.onWebfetch.ts

**requirement source:** wish problem #2, #3, vision SDK usage

**covered?** yes.

### filediff: rename files (43)

**requirement source:** vision "rename... fixes this inconsistency", human "hard criteria"

**covered?** yes.

## implicit requirements not in criteria

### implicit: test updates

blueprint test coverage section lists:
- keyrack.ehmpath.integration.test.ts
- git.commit.push.integration.test.ts
- git.commit.set.integration.test.ts
- git.release.*.integration.test.ts

these update token references for rename. correct approach.

### implicit: snapshot regeneration

blueprint lists:
- `__snapshots__/git.commit.push.integration.test.ts.snap`

snapshots must regenerate after token rename. correct approach.

## gaps found

none.

every explicit requirement from vision and criteria maps to blueprint content.

every implicit requirement (keyrack init, test updates, snapshots) is addressed.

## why this holds

the blueprint provides complete coverage because:

1. **explicit requirements** — all three wish problems addressed in summary
2. **vision details** — error format, exit code, flow preserved
3. **criteria usecases** — all four covered with trace to blueprint sections
4. **criteria exchanges** — both SDK call and keyrack.yml changes documented
5. **implicit requirements** — REQUIRED_KEYS update, test updates, snapshots all listed

no omitted requirements found.

