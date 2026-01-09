### .rule = require-hook-wrapper-pattern

#### .what
wrap procedures with hooks via composition, not inline decoration

#### .pattern
```ts
const _procedureName = (input: {...}, context: {...}) => {
  // implementation
};

export const procedureName = withHook(_procedureName);
```

#### .why

this pattern minimizes code diffs when hooks are added, changed, or removed:

- **add a hook** → 1 line changes (the export line)
- **remove a hook** → 1 line changes (the export line)
- **change hook order** → 1 line changes (the export line)

the alternative — inline wrapping at the function declaration — causes the entire function body to shift indentation, which produces noisy diffs that obscure the actual change.

#### .examples

##### ✅ good — wrapper pattern

```ts
/**
 * .what = sends an invoice to the customer
 * .why = triggers billing workflow
 */
const _sendInvoice = async (
  input: { invoice: Invoice },
  context: { log: LogMethods },
): Promise<{ sent: boolean }> => {
  // implementation stays clean and unindented
  context.log.info('sending invoice', { invoiceId: input.invoice.id });
  return { sent: true };
};

export const sendInvoice = withLogTrail(_sendInvoice);
```

##### ✅ good — multiple hooks composed

```ts
const _processPayment = async (
  input: { payment: Payment },
  context: { log: LogMethods },
): Promise<{ success: boolean }> => {
  // implementation
};

// hooks compose right-to-left: withRetry runs first, then withLogTrail
export const processPayment = withLogTrail(
  withRetry(_processPayment, { maxAttempts: 3 }),
);
```

##### ⛔ bad — inline decoration

```ts
// ⛔ adding/removing the wrapper shifts the entire function body
export const sendInvoice = withLogTrail(async (
  input: { invoice: Invoice },
  context: { log: LogMethods },
): Promise<{ sent: boolean }> => {
  // every line here will show as "changed" in the diff
  // when the hook is added or removed
  context.log.info('sending invoice', { invoiceId: input.invoice.id });
  return { sent: true };
});
```

#### .diff comparison

when adding `withLogTrail` to an existing function:

**wrapper pattern diff (clean):**
```diff
- export const sendInvoice = _sendInvoice;
+ export const sendInvoice = withLogTrail(_sendInvoice);
```

**inline pattern diff (noisy):**
```diff
- export const sendInvoice = async (
+ export const sendInvoice = withLogTrail(async (
    input: { invoice: Invoice },
    context: { log: LogMethods },
  ): Promise<{ sent: boolean }> => {
    context.log.info('sending invoice', { invoiceId: input.invoice.id });
    return { sent: true };
- };
+ });
```

the wrapper pattern produces a 1-line diff; the inline pattern touches every line of the function.

#### .naming

- prefix the unwrapped procedure with `_` (e.g., `_sendInvoice`)
- export the wrapped version without prefix (e.g., `sendInvoice`)
- this signals that `_sendInvoice` is internal and should not be imported directly

#### .enforcement
inline hook decoration = **BLOCKER**
