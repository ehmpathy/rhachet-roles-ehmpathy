# rule.require.acceptance.blackbox

## .what

acceptance tests (`.acceptance.test.ts`) must test against contract boundaries only. the test subject must be invoked through public contract interfaces.

## .why

- **contracts are the promise** — acceptance tests verify the contract works as advertised
- **internals change** — implementation details shift; contracts remain stable
- **external users see contracts** — test what they actually use
- **tight coupling kills** — tests coupled to internals break on refactors

## .scope

applies to `.acceptance.test.ts` files

## .the rules

### test subject: contract only

the operation under test must be invoked through `@/contract/`:

```ts
// good — test via contract endpoint
import { createInvoice } from '@/contract/api/createInvoice';

describe('POST /invoices', () => {
  given('[case1] valid invoice payload', () => {
    when('[t0] endpoint is called', () => {
      then('invoice is created', async () => {
        const response = await request(app)
          .post('/invoices')
          .send(validPayload);
        expect(response.status).toBe(201);
      });
    });
  });
});
```

```ts
// bad — test via internal operation
import { generateInvoice } from '@/domain.operations/generateInvoice';

describe('generateInvoice', () => {
  it('creates invoice', async () => {
    const result = await generateInvoice({ customer }, context);
    // this is an integration test, not acceptance
  });
});
```

### setup: internals allowed

use of internals to prepare test scenarios is allowed:

```ts
// good — internals for setup
import { daoCustomer } from '@/access/daos/daoCustomer';

describe('GET /invoices/:id', () => {
  given('[case1] invoice exists', () => {
    const scene = useBeforeAll(async () => {
      // setup via internals is fine
      const customer = await daoCustomer.upsert({ name: 'Test' });
      const invoice = await daoInvoice.upsert({ customerId: customer.id });
      return { invoice };
    });

    when('[t0] endpoint is called', () => {
      then('invoice is returned', async () => {
        // test via contract
        const response = await request(app).get(`/invoices/${scene.invoice.id}`);
        expect(response.status).toBe(200);
      });
    });
  });
});
```

### verification: internals allowed for side effects

verify internal state after contract invocation is allowed:

```ts
// good — verify internal side effects
describe('POST /invoices', () => {
  given('[case1] valid payload', () => {
    when('[t0] endpoint is called', () => {
      const response = useThen('request succeeds', async () =>
        request(app).post('/invoices').send(validPayload),
      );

      then('invoice record exists in database', async () => {
        // verify internal state via dao
        const invoice = await daoInvoice.findByRef({ id: response.body.id });
        expect(invoice).toBeDefined();
        expect(invoice.status).toBe('DRAFT');
      });
    });
  });
});
```

## .summary

| phase | internal access | contract access |
|-------|-----------------|-----------------|
| setup (given) | allowed | allowed |
| action (when) | forbidden | required |
| verify (then) | allowed | allowed |

the **action** must go through the contract. setup and verify can use internals.

## .enforcement

| violation | severity |
|-----------|----------|
| action via internal operation in acceptance test | blocker |
| import from `domain.operations/` for test subject | blocker |
| direct dao call as test subject | blocker |

## .see also

- `rule.forbid.acceptance.mocks` — acceptance tests must not mock
- `rule.forbid.integration.mocks` — integration tests also forbid mocks
- `rule.require.test-coverage-by-grain` — contracts require acceptance tests
- `rule.forbid.unit.remote-boundaries` — unit tests must not cross boundaries

---

> acceptance tests verify the contract.
> if you bypass the contract, you verify what users never touch.
