# rule.forbid.remote-boundaries

## .what

unit tests must not cross remote boundaries — if a test touches external resources, it is an integration test, not a unit test

## .why

- **unit tests verify atomic logic** — pure functions with injected dependencies
- **remote boundaries introduce flake** — network timeouts, file locks, db state
- **remote boundaries introduce latency** — disk i/o, connection overhead, query time
- **remote boundaries hide in mocks** — mocks create false confidence; the mock behaves differently than reality
- **test classification matters** — `npm run test:unit` must be fast, deterministic, and parallelizable

## .scope

applies to all files with `.test.ts` extension (unit tests)

does NOT apply to `.integration.test.ts` or `.acceptance.test.ts`

## .remote boundaries

a remote boundary is any resource external to the process memory:

| boundary | examples | why it's remote |
|----------|----------|-----------------|
| filesystem | `fs.readFile`, `fs.writeFile`, `path.resolve` with real paths | disk i/o, file locks, path differences across os |
| database | `pg.query`, `mysql.execute`, dao calls | connection state, query latency, data dependencies |
| network | `fetch`, `axios`, http clients, sdk calls | latency, availability, rate limits |
| environment | `process.env` reads, config files | varies across machines, ci vs local |
| time | `Date.now()`, `new Date()` | non-deterministic, timezone differences |
| randomness | `Math.random()`, `crypto.randomUUID()` | non-deterministic by definition |

## .how

### 👍 unit test — pure logic, injected dependencies

```ts
// computeInvoiceTotal.test.ts
describe('computeInvoiceTotal', () => {
  it('sums line items correctly', () => {
    const result = computeInvoiceTotal({
      lineItems: [
        { amount: 100 },
        { amount: 50 },
      ],
    });
    expect(result).toEqual(150);
  });
});
```

### 👍 unit test — dependency injection enables isolation

```ts
// sendInvoice.test.ts
describe('sendInvoice', () => {
  it('returns sent status when email succeeds', async () => {
    // inject a fake, not a mock of a real service
    const emailServiceFake = {
      send: async () => ({ success: true }),
    };

    const result = await sendInvoice(
      { invoice: exampleInvoice },
      { emailService: emailServiceFake },
    );

    expect(result.sent).toEqual(true);
  });
});
```

### 👎 bad — crosses filesystem boundary

```ts
// ❌ this is an integration test, not a unit test
describe('loadConfig', () => {
  it('reads config from disk', async () => {
    const config = await loadConfig({ path: './config.json' }); // fs access
    expect(config.apiKey).toBeDefined();
  });
});
```

### 👎 bad — crosses database boundary

```ts
// ❌ this is an integration test, not a unit test
describe('getUserById', () => {
  it('fetches user from database', async () => {
    const user = await getUserById({ id: '123' }, { dbConnection }); // db access
    expect(user.name).toEqual('alice');
  });
});
```

### 👎 bad — mocks hide the boundary (antipattern)

```ts
// ❌ mocks are an antipattern — they create false confidence
jest.mock('fs');
const fs = require('fs');

describe('loadConfig', () => {
  it('reads config', async () => {
    fs.readFile.mockResolvedValue('{"key": "value"}');
    const config = await loadConfig({ path: './config.json' });
    expect(config.key).toEqual('value');
    // 👎 this test passes but real fs.readFile behaves differently
    // 👎 the mock doesn't validate encode, error handler, path resolution
  });
});
```

## .what to do instead

| if your test needs... | then... |
|-----------------------|---------|
| filesystem access | move to `.integration.test.ts` |
| database queries | move to `.integration.test.ts` |
| network calls | move to `.integration.test.ts` |
| current time | inject a `clock` dependency with a fixed value |
| random values | inject a `random` dependency with a fixed seed |
| environment vars | inject config as a parameter |

## .the mock antipattern

mocks are forbidden because:

1. **mocks lie** — they return what you tell them, not what the real dependency returns
2. **mocks drift** — when the real dependency changes, the mock doesn't
3. **mocks hide bugs** — the test passes but production fails
4. **mocks test the mock** — you verify your mock setup, not your logic

### instead of mocks, use:

- **fakes** — simplified implementations that behave like the real dependency
- **dependency injection** — pass the dependency as a parameter
- **integration tests** — test the real dependency in `.integration.test.ts`

## .classification guide

| test characteristics | classification | file extension |
|---------------------|----------------|----------------|
| pure logic, no i/o, injected deps | unit | `.test.ts` |
| touches db, fs, network | integration | `.integration.test.ts` |
| exercises full system via contract | acceptance | `.acceptance.test.ts` |

## .enforcement

unit test that crosses remote boundary = **BLOCKER**

mock usage in unit tests = **BLOCKER**

---

> unit tests are fast, deterministic, and test logic in isolation.
> if it touches the outside world, it's not a unit test.
