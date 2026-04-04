### .rule = prefer-wet-over-dry

#### .what
prefer duplication over premature abstraction — keep code **wet** until patterns emerge

#### .why

**wrong abstractions are expensive**
- a bad abstraction is harder to change than duplicated code
- duplicated code can be edited independently; a shared abstraction couples all callers
- to remove a wrong abstraction requires touch of every consumer
- the cost of the wrong abstraction >> the cost of duplication

**patterns must be discovered, not predicted**
- you cannot know the right abstraction until you see the pattern 3+ times
- each instance reveals constraints and variations
- premature abstraction locks in assumptions before you have evidence
- duplication preserves flexibility to learn

**duplication is obvious; bad abstractions hide**
- duplicated code is visible and irritates — it begs to be fixed when the time is right
- a wrong abstraction looks like "good code" — it hides in plain sight
- you will refactor duplication eventually; you may never notice a bad abstraction

#### .the rule of three

wait for **3+ usages across different contexts** before you extract an abstraction:

| usages | action |
|--------|--------|
| 1 | write it inline |
| 2 | copy-paste is fine — note the duplication |
| 3+ | now consider abstraction — the pattern is real |

#### .what **wet** means

> **w**rite **e**verything **t**wice
> (tolerate duplication until patterns emerge)

it's not "never abstract" — it's "don't abstract yet"

#### .examples

##### 👍 good — tolerate duplication

```ts
// file: sendInvoice.ts
const sendInvoice = async (input: { invoice: Invoice }, context: Context) => {
  context.log.info('send invoice', { invoiceId: input.invoice.id });
  await context.emailService.send({
    to: input.invoice.customer.email,
    subject: `Invoice ${input.invoice.number}`,
    body: renderInvoiceEmail(input.invoice),
  });
};

// file: sendReceipt.ts
const sendReceipt = async (input: { receipt: Receipt }, context: Context) => {
  context.log.info('send receipt', { receiptId: input.receipt.id });
  await context.emailService.send({
    to: input.receipt.customer.email,
    subject: `Receipt ${input.receipt.number}`,
    body: renderReceiptEmail(input.receipt),
  });
};

// 👍 similar structure, but details differ
// 👍 wait until a third case reveals the true pattern
// 👍 maybe the abstraction is "sendTransactionalEmail"
// 👍 maybe the abstraction is "notifyCustomer"
// 👍 we don't know yet — and that's fine
```

##### 👎 bad — premature abstraction

```ts
// 👎 extracted too early, now every document type must fit this shape
const sendDocument = async <T extends { id: string; customer: Customer }>(
  input: { document: T; type: 'invoice' | 'receipt' | 'quote' },
  context: Context,
) => {
  context.log.info(`send ${input.type}`, { id: input.document.id });
  await context.emailService.send({
    to: input.document.customer.email,
    subject: getSubject(input.document, input.type), // now we need a switch
    body: renderEmail(input.document, input.type),   // another switch
  });
};

// 👎 what happens when quotes need CC recipients?
// 👎 what happens when invoices need attachments?
// 👎 the abstraction fights every new requirement
```

#### .signals you abstracted too early

- the abstraction has a `type` parameter with a switch inside
- you keep add of optional parameters for "special cases"
- new features require modify of the shared code
- you find yourself in workaround of the abstraction
- the abstraction name is vague (`handleItem`, `processItem`, `doAction`)

#### .when to abstract

- 3+ concrete usages exist
- the pattern is stable (not in active change)
- the abstraction has a clear, specific name
- the abstraction reduces total code (not just moves it)
- you can articulate what varies vs what's shared

#### .enforcement
- premature abstraction (< 3 usages) = **NITPICK**
- abstraction that requires type switches or many optional params = **BLOCKER**

#### .mantra

> duplication is far cheaper than the wrong abstraction
> — sandi metz

#### .exception: readability abstraction

wet-over-dry applies to *reuse* abstraction — wait for 3+ usages before extract.

but *readability* abstraction triggers immediately:
- if you have to decode it to understand it, extract it now
- even single-use transforms warrant extraction if they improve readability
- see: `rule.forbid.decode-friction-in-orchestrators`

| type | trigger | when |
|------|---------|------|
| readability abstraction | decode-cost | immediate |
| reuse abstraction | duplication | wait for 3+ |

#### .see also
- `rule.forbid.io-as-domain-objects` — inline over extract for single-use shapes
- `rule.require.single-responsibility` — when you do abstract, keep it focused
- `rule.forbid.inline-decode-friction` — readability abstraction rule
