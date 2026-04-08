# self-review r6: has-pruned-backcompat

## deeper backwards compat analysis

### current onStop hooks (from research)

```typescript
onStop: [
  {
    command: 'pnpm run --if-present fix',
    timeout: 'PT30S',
  },
],
```

### new onStop hooks (from blueprint)

```typescript
onStop: [
  {
    command: 'pnpm run --if-present fix',
    timeout: 'PT30S',
  },
  {
    command: './node_modules/.bin/rhx git.repo.test --what lint',
    timeout: 'PT60S',
  },
],
```

### is this additive or replacement?

this is **additive**:
- old fix hook: preserved
- new lint hook: added after fix

no old behavior is removed. no backwards compat needed.

### what the wish means by "current lint hook"

the wish says "our current onStop lint hook is a bit jank". but the research shows no lint hook in onStop, only a fix hook.

possible interpretations:
1. the "lint hook" is somewhere else (not in getMechanicRole.ts)
2. the wish refers to lint that runs as part of `pnpm run fix`
3. the wish is about a planned lint hook that doesn't work well

for the blueprint, this doesn't matter. we add a new, well-designed lint hook. the old behavior (whatever it is) is not removed.

### backwards compat verdict

| concern | analysis | compat needed? |
|---------|----------|----------------|
| fix hook | preserved | no |
| lint hook | additive | no |
| .log directory | findsert | no |
| permissions | additive | no |

## verdict

this is an additive change. no backwards compatibility concerns apply because no old behavior is removed or modified.
