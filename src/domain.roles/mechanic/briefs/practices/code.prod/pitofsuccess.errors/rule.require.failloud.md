# rule.require.failloud

## .what

errors must use proper error classes with full context.

## .why

- enables immediate diagnosis without debug sessions
- distinguishes caller-must-fix from server-must-fix
- exit codes enable automated retry decisions

## .error classes

| who fixes | class | exit code |
|-----------|-------|-----------|
| caller | ConstraintError | 2 |
| server | MalfunctionError | 1 |

## .pattern

### 👎 bad — error without context

```ts
throw new Error('failed');
```

### 👍 good — failloud

```ts
// caller must fix
throw new ConstraintError('customer lacks phone', {
  customerId,
  hint: 'add phone via setCustomerPhone',
});

// server must fix
throw new MalfunctionError('database connection failed', {
  host,
  error: originalError.message,
});
```

## .enforcement

- error without proper class = blocker
- error without context = blocker

## .see also

- `rule.require.qualified-error-headers` — the class must be NAMED in the header a human
  reads, not merely thrown in code
- `rule.require.exit-code-semantics` — the exit code each class carries
