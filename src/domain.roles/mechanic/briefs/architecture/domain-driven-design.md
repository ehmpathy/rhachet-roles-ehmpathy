.tactic = arch:domain-driven-design

.what = model all business logic using well-defined domain objects, procedures, and contracts — never loose bags of properties

.scope:
  - applies to all business logic, application services, types, data flows, and stateful modules
  - especially enforced within core domain folders and stitched procedures

.why:
  - ensures the system is built from **recognizable domain concepts**
  - improves correctness through **runtime validation**
  - enables identity comparison, change detection, and immutability by default
  - prevents "bag-of-words" logic and accidental complexity

.how:
  - always use `domain-objects` to model the domain
    - use `DomainLiteral<T>` for immutable value objects
    - use `DomainEntity<T>` when identity and lifecycle matter
    - use `DomainEvent<T>` for structured domain signals
  - **never** pass raw `{ prop1, prop2, ... }` bags across procedure boundaries
    - define and reuse domain objects instead
    - compose nested models with `.nested` and `.build`
  - distill your domain into:
    - **domain objects** = nouns (e.g. `Customer`, `Invoice`, `RocketShip`)
    - **domain procedures** = verbs (e.g. `generateInvoice`, `submitPayment`)
    - **domain contracts** = shapes of external interfaces or cross-context bridges
  - always prefer the most **specific and canonical domain object** for a given use case
    - if a `Customer`, `Invoice`, or `Quote` already exists, reuse it — don’t make a new shape
  - support **runtime validation** with schemas (Zod, Joi, Yup)
    - all domain objects with external inputs must be validated on instantiation
  - define `.unique` and `.updatable` fields for identity and change tracking
  - expose immutable behaviors using `.clone()` and `.build()` for safe updates
  - procedures with more than 2 scalar arguments representing **data** should be refactored to use a domain object
    - control/options args are acceptable when clearly scoped (e.g. `{ dryRun: true }`)

.enforcement:
  - code reviews must block untyped or loosely typed `{}` logic
  - procedures with more than 2 scalar arguments should be refactored to use domain objects
  - stitched routes and service layers must pass domain objects explicitly
  - tests should validate domain behavior, not just JSON shape
  - imports from `domain-objects` are required for any core domain concept

.examples:

  .positive:
    - `class Customer extends DomainEntity<Customer> implements Customer {}`
    - `new JobQuote({ customer, lineItems, total })`
    - `generateInvoice({ invoice: Invoice })` instead of `generateInvoice({ id, total, customerId })`
    - `LeadSource.build({ type: 'referral' })` with schema validation on instantiation
    - `customer.clone({ phone: '555-1234' })` for safe mutation

  .negative:
    - `{ name, email, address }` passed between modules without a domain object
    - `function updateUser(name, email, phone)` instead of `updateCustomerInfo(Customer)`
    - `type UserData = { ... }` duplicating `Customer` shape
    - storing JSON blobs that replicate existing domain models
    - `update()` method used on raw DTOs

.links:
  - see also: `name:ubiqlang`
  - library: https://www.npmjs.com/package/domain-objects
