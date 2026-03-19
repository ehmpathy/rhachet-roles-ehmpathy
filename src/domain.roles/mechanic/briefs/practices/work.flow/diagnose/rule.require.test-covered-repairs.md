# rule.require.test-covered-repairs

## .what

every defect fix must include a test that covers the defect. no exceptions.

## .why

a fix without a test is a lesson lost:
- the same defect can recur
- no proof the fix works
- no documentation of the edge case
- future refactors may reintroduce the bug

a fix with a test institutionalizes the lesson:
- defect cannot recur (test catches it)
- proof the fix works (test passes)
- edge case is documented (test describes scenario)
- future refactors are protected (regression test)

## .the rule

| scenario | required |
|----------|----------|
| bug fix | test that fails before fix, passes after |
| edge case discovered | test that covers the edge case |
| production incident | test that reproduces the incident |
| code review feedback | test if feedback reveals untested path |

## .pattern

```typescript
// the test documents the defect and proves the fix
given('[case1] invoice with negative line item', () => {
  // .note = this case caused PROD-1234 where totals were wrong
  when('[t0] total is computed', () => {
    then('negative amounts are subtracted correctly', () => {
      const result = computeInvoiceTotal({
        lineItems: [{ amount: 100 }, { amount: -25 }],
      });
      expect(result.total).toBe(75);
    });
  });
});
```

## .workflow

1. defect is discovered
2. write test that reproduces defect (test fails)
3. fix the code
4. test passes (proof of fix)
5. commit both fix and test together

## .antipattern

```bash
# bad: fix without test
git commit -m "fix(invoice): handle negative line items"
# no test = lesson lost, defect can recur
```

```bash
# good: fix with test
git commit -m "fix(invoice): handle negative line items

- added test for negative amount edge case
- fixes PROD-1234"
# test = lesson institutionalized
```

## .benefits

| without test | with test |
|--------------|-----------|
| "i think i fixed it" | "the test proves i fixed it" |
| defect may recur | defect cannot recur |
| edge case forgotten | edge case documented |
| refactor risk | refactor safety |

## .enforcement

- defect fix without test = blocker
- production incident fix without regression test = blocker
