# self-review r4: has-preserved-test-intentions (deeper analysis)

## test changes in this PR

### modification 1: hook count assertion

**before:**
```typescript
then('onBrain.onTool contains at least 6 hooks', () => {
  expect(
    ROLE_MECHANIC.hooks?.onBrain?.onTool?.length,
  ).toBeGreaterThanOrEqual(6);
});
```

**after:**
```typescript
then('onBrain.onTool contains at least 7 hooks', () => {
  expect(
    ROLE_MECHANIC.hooks?.onBrain?.onTool?.length,
  ).toBeGreaterThanOrEqual(7);
});
```

**analysis:**
- intention before: verify role has at least 6 onTool hooks
- intention after: verify role has at least 7 onTool hooks
- **is this a weakened assertion?** no. 7 > 6. the bar is raised, not lowered.
- **why did the count change?** we added forbid-test-background hook, so the minimum increases.
- **verdict:** intention preserved (strengthened).

### addition 1: new hook test

```typescript
then('forbid-test-background hook is present and targets Bash', () => {
  const hook = findHook('forbid-test-background');
  expect(hook).toBeDefined();
  expect(hook?.filter?.what).toEqual('Bash');
  expect(hook?.filter?.when).toEqual('before');
});
```

**analysis:**
- this is new, not a modification
- follows the same pattern as extant hook tests (e.g., forbid-sedreplace-special-chars)
- verifies: hook extant, targets Bash, fires before
- **verdict:** n/a (new code, no prior intention to preserve)

## forbidden patterns checked

| pattern | found | evidence |
|---------|-------|----------|
| weakened assertions | no | count changed 6 → 7 (stricter) |
| removed test cases | no | only addition, no removal |
| changed expected values to match broken output | no | count change reflects real addition |
| deleted tests that fail | no | no tests deleted |

## why it holds

the only modification is the count assertion, which became stricter (7 > 6). the new test was added, not modified from prior code. no extant test intentions were altered.

## gaps found

none.
