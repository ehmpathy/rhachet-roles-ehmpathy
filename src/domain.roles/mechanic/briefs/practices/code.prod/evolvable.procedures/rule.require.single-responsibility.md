### .tactic = codestyle:single-responsibility

#### .what
enforce that every code file and procedure has a singular, clearly-defined responsibility

#### .why
- makes code easier to locate, understand, and test
- ensures separation of concerns between logic, validation, and orchestration
- prevents files from bloat with unrelated logic or creep concerns

#### .rules

👍 required
- every file must export **exactly one** named procedure
- filename must match the exported procedure
- all logic in the file must directly support the procedure's **domain intent**
- runtime typechecks are only allowed **if** the file's sole purpose is validation

👎 forbidden
- more than one exported procedure per file
- co-located validation, parse, or orchestration logic alongside domain logic
- runtime type assertions or guards inside general-purpose logic
- dead code, TODOs, or unrelated comments in the file
- guards that apply redundant runtime typechecks (we trust typescript)


#### .examples

**👍 good**
```ts
// getCustomerInvoices.ts
/**
 * .what = retrieves all invoices for a given customer
 * .why = isolates domain logic for invoice lookup by customer
 */
export const getCustomerInvoices = ({ customerId }: { customerId: string }) => {
  return invoiceDao.findMany({ customerId });
};
```



**👎 bad**
```ts
// customerUtils.ts
// utility file that contains many things

export const getCustomerInvoices = (...) => { ... }

export const validateCustomer = (...) => { ... }  // 👎 multiple responsibilities

// random comment about edge cases — 👎 unrelated noise

```


**👎 bad**
```ts
// getCustomerInvoices.ts
export const getCustomerInvoices = ({ customerId }: { customerId: string }) => {
  if (typeof customerId !== 'string')  // 👎 redundant runtime check
    throw new Error('bad id');

  return invoiceDao.findMany({ customerId });
};
```

