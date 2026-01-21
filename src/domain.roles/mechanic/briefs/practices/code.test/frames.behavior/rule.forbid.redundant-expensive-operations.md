# rule.forbid.redundant-expensive-operations

## .what

forbid calling the same expensive operation multiple times across sibling `then` blocks

## .why

- wastes test execution time (often 2x-10x slower)
- wastes resources (api calls, database queries, network i/o)
- increases flakiness risk (more calls = more failure points)
- violates DRY principle in test code
- masks the true cost of the test suite

## .scope

- integration tests with api calls
- tests with database operations
- tests with network requests
- tests with expensive computation
- any operation that takes >10ms or costs money

## .detection

look for patterns where the same async operation appears in multiple sibling `then` blocks:

```ts
// 👎 BLOCKER - same expensive call in each then block
when('[t0] operation is executed', () => {
  then('it returns expected output', async () => {
    const result = await expensiveOperation({ input }); // call 1
    expect(result.output).toBeDefined();
  });

  then('it returns expected metrics', async () => {
    const result = await expensiveOperation({ input }); // call 2 (redundant!)
    expect(result.metrics.tokens).toBeGreaterThan(0);
  });

  then('it returns expected cost', async () => {
    const result = await expensiveOperation({ input }); // call 3 (redundant!)
    expect(result.cost.total).toBeDefined();
  });
});
```

## .fix

use `useThen` to call the operation once and share the result:

```ts
// 👍 good - single call, shared result
when('[t0] operation is executed', () => {
  const result = useThen('it succeeds', async () =>
    expensiveOperation({ input }),
  );

  then('it returns expected output', () => {
    expect(result.output).toBeDefined();
  });

  then('it returns expected metrics', () => {
    expect(result.metrics.tokens).toBeGreaterThan(0);
  });

  then('it returns expected cost', () => {
    expect(result.cost.total).toBeDefined();
  });
});
```

## .also forbidden

using `let` declarations to share results between blocks:

```ts
// 👎 BLOCKER - let mutation pattern
let result: Result;
when('[t0] operation is executed', () => {
  then('it succeeds', async () => {
    result = await expensiveOperation({ input }); // side effect via let
    expect(result).toBeDefined();
  });

  then('it returns expected output', () => {
    expect(result.output).toBeDefined(); // depends on side effect
  });
});
```

fix with `useThen`:

```ts
// 👍 good - no let, no side effects
when('[t0] operation is executed', () => {
  const result = useThen('it succeeds', async () =>
    expensiveOperation({ input }),
  );

  then('it returns expected output', () => {
    expect(result.output).toBeDefined();
  });
});
```

## .enforcement

- redundant expensive operations in sibling `then` blocks = **BLOCKER**
- `let` declarations used to share async results = **BLOCKER**

## .see also

- `rule.prefer.useThen-and-useWhen-for-shared-results` — the solution pattern
