# rule.require.test-coverage-by-grain

## .what

test coverage requirements vary by operation grain:

| grain | minimum test scope | why |
|-------|-------------------|-----|
| **transformer** | unit test | pure, no deps, fast |
| **communicator** | integration test | i/o, real or fake deps |
| **orchestrator** | integration test | composition, side effects |
| **contract** | acceptance test + snapshots | visual diff, regression detection |

## .why

each grain has different verification needs:

- **transformers** are pure — unit tests verify logic without mocks
- **communicators** are i/o boundaries — integration tests verify real connections
- **orchestrators** compose — integration tests verify the workflow
- **contracts** face humans — acceptance tests + snapshots catch visual regressions

## .the rules

### transformers → unit tests

transformers are pure. unit tests verify computation.

```typescript
// computeInvoiceTotal.test.ts
describe('computeInvoiceTotal', () => {
  given('[case1] line items with amounts', () => {
    when('[t0] total is computed', () => {
      then('sums correctly', () => {
        const result = computeInvoiceTotal({
          lineItems: [{ amount: 100 }, { amount: 50 }],
        });
        expect(result).toBe(150);
      });
    });
  });
});
```

### communicators → integration tests

communicators are raw i/o boundaries. integration tests verify auth + connection + response.

```typescript
// sdkStripe.integration.test.ts
describe('sdkStripe.setCustomer', () => {
  given('[case1] valid stripe customer payload', () => {
    when('[t0] api is called', () => {
      then('customer is created in stripe', async () => {
        const result = await sdkStripe.setCustomer({
          email: 'test@example.com',
          name: 'Test User',
        });
        expect(result.id).toContain('cus_');
      });
    });
  });
});
```

### orchestrators → integration tests

orchestrators compose. integration tests verify the workflow end-to-end.

```typescript
// syncCustomerFromStripe.integration.test.ts
describe('syncCustomerFromStripe', () => {
  given('[case1] customer exists in stripe', () => {
    when('[t0] sync is called', () => {
      then('customer is updated locally', async () => {
        const result = await syncCustomerFromStripe(
          { stripeCustomerId: 'cus_123' },
          context,
        );
        expect(result.synced).toBe(true);
      });
    });
  });
});
```

### contracts → acceptance tests + snapshots

contracts face humans. acceptance tests + snapshots catch regressions.

```typescript
// createInvoice.acceptance.test.ts
describe('POST /invoices', () => {
  given('[case1] valid invoice payload', () => {
    when('[t0] endpoint is called', () => {
      const response = useThen('request succeeds', async () =>
        request(app).post('/invoices').send(validPayload),
      );

      then('response matches snapshot', () => {
        expect(response.body).toMatchSnapshot();
      });

      then('status is 201', () => {
        expect(response.status).toBe(201);
      });
    });
  });
});
```

## .why snapshots for contracts

snapshots enable visual diff in PRs:

- **regressions** — unexpected changes surface immediately
- **additions** — new fields are visible for review
- **format changes** — structure shifts are obvious

especially critical for:
- **CLIs** — output format affects human workflows
- **UX** — response shape affects frontend
- **SDKs** — public API affects consumers
- **APIs** — contract changes affect integrations

## .enforcement

| grain | absent coverage | severity |
|-------|-----------------|----------|
| transformer | no unit test | nitpick |
| communicator | no integration test | blocker |
| orchestrator | no integration test | nitpick |
| contract | no acceptance test | blocker |
| contract | no snapshot | blocker |

## .see also

- `define.domain-operation-grains` — the three grains (architect)
- `rule.require.snapshots.[lesson]` — why snapshots matter
- `rule.forbid.remote-boundaries` — unit vs integration distinction
