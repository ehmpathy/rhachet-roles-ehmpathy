# self-review r10: has-play-test-convention

## question

are journey test files named correctly?

## analysis

### verify: are journey tests in the right location?

no journey tests exist for this behavior. the behavior is preventive — it prevents blind trust in compaction summaries. there is no user journey to replay because:

1. **no repros artifact** — preventive behaviors have no incident to replay
2. **no user interaction** — the hook fires automatically on compaction
3. **no decision points** — the hook just emits text and exits

### verify: do they have the `.play.` suffix?

not applicable — no journey tests required.

### verify: if not supported, is the fallback convention used?

the test file uses `.integration.test.ts` suffix which is the correct convention for:
- isolated hook execution tests
- stdin/stdout contract verification
- exit code verification

### test file inventory

| file | convention | correct? |
|------|------------|----------|
| `postcompact.trust-but-verify.integration.test.ts` | `.integration.test.ts` | ✓ yes |

## why it holds

the `.play.test.ts` convention is for journey tests that replay user scenarios. this behavior has no user journey — it emits a reminder automatically. the integration test convention (`.integration.test.ts`) is the correct choice for hook contract verification. no convention violation found.

