# rule.forbid.acceptance.mocks

## .what

acceptance tests (`.acceptance.test.ts`) must not use mocks.

## .why

- **acceptance tests verify the full system** — mocks break that verification
- **mocks lie** — they drift from real service behavior
- **mocks create false confidence** — tests pass but system fails in prod
- **acceptance tests are the final gate** — they must reflect reality

## .scope

applies to `.acceptance.test.ts` files

does NOT apply to:
- `.test.ts` (unit tests) — see `rule.forbid.unit.remote-boundaries`
- `.integration.test.ts` — see `rule.forbid.integration.mocks`

## .forbidden patterns

```ts
// createInvoice.acceptance.test.ts — FORBIDDEN
jest.mock('@/access/sdks/sdkStripe');

describe('POST /invoices', () => {
  it('creates invoice', async () => {
    sdkStripe.chargeCustomer.mockResolvedValue({ id: 'ch_mock' });
    const response = await request(app).post('/invoices').send(payload);
    expect(response.status).toBe(201);
  });
});
```

## .correct pattern

```ts
// createInvoice.acceptance.test.ts — CORRECT
describe('POST /invoices', () => {
  given('[case1] valid invoice payload', () => {
    when('[t0] endpoint is called', () => {
      const response = useThen('request succeeds', async () =>
        request(app).post('/invoices').send(validPayload),
      );

      then('invoice is created', () => {
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
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
// invoice.acceptance.test.ts
/**
 * .mock = payment processor production api
 * .why = no sandbox environment available, real charges would occur
 * .real = manual acceptance test run quarterly with test card
 *         documented in docs/acceptance-tests.md
 */
jest.mock('@/access/sdks/sdkPaymentProcessor');
```

acceptance tests are the final gate — exceptions should be rare and well-justified.

## .credential requirements

acceptance tests require real credentials. when credentials are absent:

- **do not skip silently** — use `ConstraintError` to fail fast
- **do not fake the credential** — the test must fail loud

```ts
// good — fail fast
if (!process.env.STRIPE_API_KEY) {
  throw new ConstraintError('STRIPE_API_KEY required', {
    hint: 'run: rhx keyrack unlock --owner ehmpath --env test',
  });
}
```

## .enforcement

| violation | severity |
|-----------|----------|
| mock without inline documentation | blocker |
| undocumented `jest.mock()` | blocker |
| silent credential bypass | blocker |

## .see also

- `rule.require.acceptance.blackbox` — must test via contract
- `rule.forbid.integration.mocks` — integration tests also forbid mocks
- `rule.forbid.unit.remote-boundaries` — unit tests must not cross boundaries

---

> acceptance tests are the final gate.
> mocks at the gate let lies into production.
