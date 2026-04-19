# self-review r2: has-zero-test-skips (fresh read)

## read the test file line by line

read getMechanicRole.test.ts lines 50-58:

```typescript
const findHook = (name: string) =>
  hooks.find((h) => h.command.includes(name));

then('forbid-test-background hook is present and targets Bash', () => {
  const hook = findHook('forbid-test-background');
  expect(hook).toBeDefined();
  expect(hook?.filter?.what).toEqual('Bash');
  expect(hook?.filter?.when).toEqual('before');
});
```

## verification

| check | result |
|-------|--------|
| `.skip()` in new test | not found |
| `.only()` in new test | not found |
| `if (!credentials) return` pattern | not found (no credentials needed) |
| test executed | yes, 13 tests passed |

## why it holds

1. **line 53 uses `then()` not `then.skip()`.** the test is a standard `then()` block.

2. **no early returns or guards.** the test body has three assertions, no conditional bypasses.

3. **no credentials required.** the hook reads JSON from stdin, no external auth.

4. **test ran and passed.** `rhx git.repo.test --what unit --scope getMechanicRole` showed 13 tests passed.

## gaps found

none. the new test has no skips.
