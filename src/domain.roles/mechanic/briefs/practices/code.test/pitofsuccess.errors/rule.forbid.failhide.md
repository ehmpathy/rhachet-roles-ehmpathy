# rule.forbid.failhide

## .what

tests must verify on every code path. silent pass-through is forbidden.

## .why

failhide tests create false confidence. a test that passes without verification is worse than no test.

## 👎 .forbidden patterns

| pattern | why forbidden |
|---------|---------------|
| `if (!cond) { expect(true).toBe(true) }` | fake verification |
| `if (!hasResource) { return }` | silent skip |
| `expect([0, 1, 2]).toContain(exitCode)` | accepts errors as valid |
| `expect.any(Object)` | avoids verification |
| `it('does x', () => {})` | empty body |
| `expect(result).toMatchSnapshot()` alone | snapshot without assertions |

## 👍 .legitimate alternatives

| use case | pattern |
|----------|---------|
| absent resource | `throw new ConstraintError(...)` |
| infra failure | `throw new MalfunctionError(...)` |
| snapshot with assertions | `expect(result.status).toBe('ok'); expect(result).toMatchSnapshot();` |

note: skips (`it.skip`, `given.runIf`, `then.skipIf`) are NOT alternatives — absent resource = unacceptable, always fail loud.

## .enforcement

- failhide pattern = blocker
