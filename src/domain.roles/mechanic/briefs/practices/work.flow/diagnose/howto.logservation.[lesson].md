# howto: debug via logservation

## .what

debug defects by targeted tests with temporary logs — not debuggers or ad-hoc CLI commands.

## .why

| approach | feedback loop | side effects |
|----------|---------------|--------------|
| debugger | slow, manual steps | no test coverage |
| ad-hoc CLI | slow, manual verification | no test coverage |
| logservation | fast, automated | test coverage as byproduct |

logservation gives you:
- rapid feedback loop (run test, see logs, iterate)
- test coverage that persists after fix
- bisection to narrowest broken operation
- proof the fix works (test passes)

## .the pattern

1. **identify the narrowest domain operation** that contains the defect
2. **write a test** that targets that operation with the input that fails
3. **add temporary `console.log`** statements in the code path
4. **run the test** and observe the logs
5. **track down the broken expectation** via log output
6. **fix the defect** in the code
7. **verify the test passes** (proof fix works)
8. **remove the temporary logs**
9. **keep the test** (coverage persists)

## .example

```typescript
// step 1-2: write targeted test
given('[case1] defect scenario', () => {
  when('[t0] the operation is called', () => {
    then('it produces expected output', async () => {
      const result = await computeInvoiceTotal({
        lineItems: [{ amount: 100 }, { amount: -50 }], // the case that fails
      });
      expect(result.total).toBe(50);
    });
  });
});
```

```typescript
// step 3: add temporary logs in the code
export const computeInvoiceTotal = (input: { lineItems: LineItem[] }) => {
  console.log('input:', input); // temporary
  const total = input.lineItems.reduce((sum, item) => {
    console.log('item:', item, 'sum so far:', sum); // temporary
    return sum + item.amount;
  }, 0);
  console.log('total:', total); // temporary
  return { total };
};
```

```bash
# step 4: run the test
npm run test:unit -- computeInvoiceTotal.test.ts
```

```
# step 5: observe logs, find the bug
input: { lineItems: [ { amount: 100 }, { amount: -50 } ] }
item: { amount: 100 } sum so far: 0
item: { amount: -50 } sum so far: 100
total: 50
# aha! the logic is correct, the test expectation was wrong
```

## .when to use

- any defect where behavior differs from expectation
- integration failures (narrow to the operation that fails)
- race conditions (logs reveal order)
- data transformation bugs (logs reveal intermediate state)

## .benefits over debugger

| debugger | logservation |
|----------|--------------|
| requires IDE setup | works anywhere |
| manual steps | automated iteration |
| state disappears after session | logs persist in terminal |
| no artifact | test remains as coverage |
| slow context switch | fast feedback loop |

## .key insight

> you never need a debugger because the fastest path to fix a defect is: write a test that fails, add logs to understand why, fix the code, keep the test.

the test is both your diagnostic tool AND your proof of fix.
