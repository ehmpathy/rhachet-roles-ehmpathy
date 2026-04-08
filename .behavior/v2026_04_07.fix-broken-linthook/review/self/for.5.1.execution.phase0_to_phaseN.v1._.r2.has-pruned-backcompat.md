# self-review r2: has-pruned-backcompat

## deep review

paused. took a breath. re-read the code with fresh eyes.

## line-by-line review of git.repo.test.sh

### argument handle

```bash
--skill|--repo|--role)
  shift 2
  ;;
```

this ignores rhachet-passed args. not backwards compat — just standard rhachet skill pattern.

### npm test:lint execution

runs `npm run test:lint`. this is the standard npm command pattern used across all ehmpathy repos. not a shim for old behavior — this is the canonical lint command.

### exit code semantics

| code | semantic |
|------|----------|
| 0 | passed |
| 1 | malfunction (npm error) |
| 2 | constraint (lint failed) |

these are the standard rhachet exit code semantics. not backwards compat — just adherence to the established pattern.

### output functions

sources `output.sh` for turtle vibes. uses direct echo for tree leaves where output.sh functions don't match needed signature. not backwards compat — just use of available tools.

## line-by-line review of getMechanicRole.ts

### the hook replacement

```typescript
// before
{
  command: 'pnpm run --if-present fix',
  timeout: 'PT30S',
},

// after
{
  command: './node_modules/.bin/rhx git.repo.test --what lint',
  timeout: 'PT60S',
},
```

the old hook is **replaced**, not kept alongside. no fallback. no "try new, if fail try old" pattern.

## did we sneak in any backwards compat?

| concern | present | reason |
|---------|---------|--------|
| keep old fix hook | no | replaced per wish |
| fallback to pnpm fix | no | not requested |
| support both old and new | no | not requested |
| deprecated alias | no | not requested |
| gradual migration | no | not requested |

## conclusion

no backwards compatibility added. the implementation is a clean replacement:
- old hook removed
- new skill added
- no shims, no fallbacks, no "just in case" code

the wish was explicit: "replace the extant pnpm run if present fix bs" and "it should be removed after this change".

done exactly that.
