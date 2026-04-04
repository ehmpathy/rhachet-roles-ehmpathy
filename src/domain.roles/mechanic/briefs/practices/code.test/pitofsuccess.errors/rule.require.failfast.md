# rule.require.failfast

## .what

tests that lack required resources must fail fast, not skip silently.

## .why

absent resource = unacceptable. if a test cannot run its intended behavior, it must fail loud.

## .pattern

### 👎 bad — failhide

```ts
if (!hasApiKey) {
  return; // test passes without verification
}
```

### 👍 good — failfast

```ts
// caller must fix (ConstraintError)
if (!hasApiKey) {
  throw new ConstraintError('API key required for this test', {
    hint: 'run: source .agent/repo=.this/role=any/skills/use.apikeys.sh',
  });
}

// server must fix (MalfunctionError)
if (!dbConnection) {
  throw new MalfunctionError('test database unavailable', {
    host: process.env.DB_HOST,
    hint: 'check if test db container is up',
  });
}
```

## .error classes

| who fixes | class | exit code | test example |
|-----------|-------|-----------|--------------|
| caller | ConstraintError | 2 | API key not configured |
| server | MalfunctionError | 1 | test database down |

## .enforcement

- silent skip on absent resource = blocker
