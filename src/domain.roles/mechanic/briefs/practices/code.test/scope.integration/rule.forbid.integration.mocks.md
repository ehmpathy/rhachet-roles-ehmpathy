# rule.forbid.integration.mocks

## .what

integration tests (`.integration.test.ts`) must not use mocks. mocks defeat the purpose of integration tests.

## .why

- **mocks lie** — they drift from real service behavior
- **mocks create false confidence** — tests pass but integration fails in prod
- **the point of integration tests is to verify the integration works**
- if you mock the integration, you verify only the mock

## .scope

applies to `.integration.test.ts` files

does NOT apply to:
- `.test.ts` (unit tests) — see `rule.forbid.unit.remote-boundaries`
- `.acceptance.test.ts` — see `rule.forbid.acceptance.mocks`

## .forbidden patterns

```ts
// sdkStripe.integration.test.ts — FORBIDDEN
jest.mock('stripe');

describe('sdkStripe.setCustomer', () => {
  it('creates customer', async () => {
    stripe.customers.create.mockResolvedValue({ id: 'cus_mock' });
    const result = await sdkStripe.setCustomer({ email: 'test@example.com' });
    expect(result.id).toBe('cus_mock'); // fake, proves only the mock works
  });
});
```

## .correct pattern

```ts
// sdkStripe.integration.test.ts — CORRECT
describe('sdkStripe.setCustomer', () => {
  given('[case1] valid customer payload', () => {
    when('[t0] api is called', () => {
      then('customer is created in stripe', async () => {
        const result = await sdkStripe.setCustomer({
          email: 'test@example.com',
          name: 'Test User',
        });
        expect(result.id).toContain('cus_'); // real stripe id
      });
    });
  });
});
```

## .exception: documented unavoidable mocks

mocks are allowed only when:
- the circumstance is clearly unavoidable (e.g., severe rate limits, prohibitive cost, no sandbox)
- the exception is documented inline where the mock is declared and used

```ts
// github.integration.test.ts
/**
 * .mock = github api
 * .why = github api has 60 req/hour unauthenticated, 5000 req/hour authenticated
 *        CI runs would exhaust quota within minutes
 * .real = real integration test exists in github.real.integration.test.ts
 *         run manually before release: GITHUB_REAL=1 npm run test:integration
 */
jest.mock('@/access/sdks/sdkGithub');
```

## .credential requirements

integration tests require real credentials. when credentials are absent:

- **do not skip silently** — use `ConstraintError` to fail fast
- **do not fake the credential** — the test must fail loud
- see `rule.require.failfast` in `pitofsuccess.errors/`

```ts
// good — fail fast
if (!process.env.STRIPE_API_KEY) {
  throw new ConstraintError('STRIPE_API_KEY required', {
    hint: 'run: rhx keyrack unlock --owner ehmpath --env test',
  });
}

// bad — silent skip
if (!process.env.STRIPE_API_KEY) {
  return; // test passes without verification
}
```

## .enforcement

| violation | severity |
|-----------|----------|
| mock without inline documentation | blocker |
| undocumented `jest.mock()` | blocker |
| silent credential bypass | blocker |

## .see also

- `rule.forbid.acceptance.mocks` — acceptance tests also forbid mocks
- `rule.forbid.unit.remote-boundaries` — unit tests must not cross boundaries
- `rule.require.test-coverage-by-grain` — grain determines test scope

---

> integration tests verify the integration works.
> if you mock the integration, you verify only your imagination.
