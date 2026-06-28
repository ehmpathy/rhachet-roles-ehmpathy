# rule.forbid.magic-values

## .what

forbid magic strings, numbers, and literals scattered in code. use enums and named constants instead.

## .why

magic values are maintenance hazards:
- no single source of truth — same value repeated, drift inevitable
- no searchability — grep for `'PENDING_REVIEW'` misses `'pending_review'`
- no type safety — typo compiles fine, fails at runtime
- no documentation — what does `5000` mean?

named constants and enums solve all of these.

## .examples

### bad — magic values

```ts
const processPayment = async (payment: Payment, context: Context) => {
  if (payment.method === 'STRIPE_CARD') {           // magic string
    await context.stripe.charge(payment);
  } else if (payment.method === 'STRIPE_ACH') {     // magic string
    await context.stripe.achTransfer(payment);
  }

  await context.paymentDao.update({
    id: payment.id,
    status: payment.amount > 10000 ? 'PENDING_REVIEW' : 'COMPLETED',  // magic strings + number
  });

  if (payment.amount > 5000) {                      // magic number
    await context.slack.notify('#high-value-payments', `Payment: ${payment.id}`);
  }
};
```

### good — enums and constants

```ts
enum PaymentMethod {
  STRIPE_CARD = 'STRIPE_CARD',
  STRIPE_ACH = 'STRIPE_ACH',
  PAYPAL = 'PAYPAL',
}

enum PaymentStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  COMPLETED = 'COMPLETED',
}

const HIGH_VALUE_THRESHOLD = 5000;
const REVIEW_THRESHOLD = 10000;

const processPayment = async (payment: Payment, context: Context) => {
  if (payment.method === PaymentMethod.STRIPE_CARD) {
    await context.stripe.charge(payment);
  } else if (payment.method === PaymentMethod.STRIPE_ACH) {
    await context.stripe.achTransfer(payment);
  }

  const status = payment.amount > REVIEW_THRESHOLD
    ? PaymentStatus.PENDING_REVIEW
    : PaymentStatus.COMPLETED;

  await context.paymentDao.update({ id: payment.id, status });

  if (payment.amount > HIGH_VALUE_THRESHOLD) {
    await context.slack.notify('#high-value-payments', `Payment: ${payment.id}`);
  }
};
```

## .exceptions

- test fixtures with one-off values
- error messages (strings are fine)
- log messages
- 0, 1, -1 in obvious contexts (array index, increment)

## .enforcement

magic value in production code = blocker
