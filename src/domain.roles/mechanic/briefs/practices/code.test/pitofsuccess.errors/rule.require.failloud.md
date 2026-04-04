# rule.require.failloud

## .what

test errors must include actionable hints for resolution.

## .why

when a test fails due to absent resource or infra issue, the error should tell the developer exactly how to fix it.

## .error classes

| who fixes | class | exit code |
|-----------|-------|-----------|
| caller | ConstraintError | 2 |
| server | MalfunctionError | 1 |

## .pattern

### 👎 bad — error without context

```ts
throw new Error('test failed');
```

### 👍 good — failloud

```ts
// caller must fix — ConstraintError
throw new ConstraintError('API key required for this test', {
  hint: 'run: source .agent/repo=.this/role=any/skills/use.apikeys.sh',
  env: 'EHMPATHY_API_KEY',
});

// server must fix — MalfunctionError
throw new MalfunctionError('test database connection failed', {
  host: process.env.DB_HOST,
  error: originalError.message,
  hint: 'check docker-compose is up',
});
```

## .enforcement

- error without hint = nitpick
- error without context = blocker
