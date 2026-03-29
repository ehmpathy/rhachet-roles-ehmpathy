# self-review r9: has-play-test-convention

## question

are journey test files named correctly?

## analysis

### journey tests in this behavior

this behavior is preventive, not reactive. there are no journey tests (`.play.test.ts`).

### tests added

| file | type | convention |
|------|------|------------|
| `postcompact.trust-but-verify.integration.test.ts` | integration | ✓ `.integration.test.ts` |

### why no journey tests

journey tests (`.play.test.ts`) are for end-to-end user scenarios derived from repros artifacts. this behavior:

1. has no repros artifact (preventive, not reactive)
2. tests the hook in isolation (integration test)
3. does not simulate a full user journey

### what was tested instead

the integration test verifies:
- hook receives PostCompact stdin format
- hook emits expected reminder text
- hook exits with code 0

this is sufficient because:
- the hook is a simple stdout emitter
- no complex user journey to simulate
- the critical path is already tested in isolation

## why it holds

no journey tests are required for this behavior. the integration test covers the hook contract. the `.play.test.ts` convention does not apply because there is no user journey to replay — the behavior is preventive.

