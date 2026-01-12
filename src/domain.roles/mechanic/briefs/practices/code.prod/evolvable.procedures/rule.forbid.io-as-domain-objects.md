### .tactic = contracts:inline-io

#### .what
forbid domain objects for procedure inputs and outputs; declare them inline on the procedures they belong to

#### .why
- **inputs and outputs are contracts, not domain concepts**
  - domain objects represent things that exist in the problem domain (Customer, Invoice, RocketShip)
  - input/output shapes are implementation details of a procedure's interface
  - to conflate the two pollutes the domain model with transient structural types

- **locality maximizes maintainability**
  - the contract lives where it's used — no need to jump to another file
  - changes to a procedure's interface stay contained to one location
  - refactors are simpler when the type isn't referenced elsewhere

- **premature abstraction is harmful**
  - most input/output shapes are unique to their procedure
  - to extract them to domain objects suggests reuse that rarely materializes
  - this creates unnecessary indirection and cognitive overhead

- **domain objects carry semantic weight**
  - `DomainLiteral`, `DomainEntity`, `DomainEvent` have meaning: identity, uniqueness, lifecycle
  - input/output types have none of these characteristics
  - misuse of domain objects dilutes their purpose

#### .where
- applies to all procedure declarations in `domain.operations/`, `contract/`, and `access/`
- especially enforced when tempted to create `*Input`, `*Output`, `*Args`, `*Result` domain objects

#### .how

##### 👍 required
- declare input types inline: `(input: { invoice: Invoice; customer: Customer })`
- declare return types inline: `): Promise<{ success: boolean; invoice: Invoice }>`
- use domain objects as **properties** within inline types, not as the type itself

##### 👎 forbidden
- `class SendInvoiceInput extends DomainLiteral<...>`
- `interface GenerateReportOutput { ... }` in a separate file
- `type SyncCustomerArgs = { ... }` outside the procedure file

#### .exceptions
- **truly reused shapes** (3+ procedures across different modules) may be extracted to a named `type` (not a domain object)
- **sdk/api boundaries** may define explicit request/response types when required by external contracts
- **event payloads** that represent domain events should be `DomainEvent` (they represent something that happened, not a procedure contract)

#### .examples

##### 👍 positive
```ts
/**
 * .what = sends an invoice to the customer
 * .why = triggers the billing workflow and notifications
 */
export const sendInvoice = async (
  input: { invoice: Invoice; customer: Customer; notify: boolean },
  context: { emailService: EmailService },
): Promise<{ sent: boolean; sentAt: string | null }> => {
  // ...
};
```

```ts
/**
 * .what = generates a monthly report for a customer
 * .why = provides a billing summary for accounting
 */
export const generateMonthlyReport = async (
  input: { customerId: string; month: string; year: number },
  context: { reportDao: ReportDao },
): Promise<{ report: Report; generatedAt: string }> => {
  // ...
};
```

##### 👎 negative
```ts
// 👎 input as domain object — SendInvoiceInput is not a domain concept
interface SendInvoiceInput {
  invoice: Invoice;
  customer: Customer;
  notify: boolean;
}
class SendInvoiceInput extends DomainLiteral<SendInvoiceInput> implements SendInvoiceInput {}

export const sendInvoice = async (input: SendInvoiceInput, context: Context) => { ... };
```

```ts
// 👎 output as separate type — pollutes type namespace with transient shapes
type GenerateReportResult = {
  report: Report;
  generatedAt: string;
};

export const generateMonthlyReport = async (input: {...}): Promise<GenerateReportResult> => { ... };
```

```ts
// 👎 args file pattern — fragments the contract across files
// file: generateReport.args.ts
export interface GenerateReportArgs { ... }

// file: generateReport.ts
import { GenerateReportArgs } from './generateReport.args';
```

#### .enforcement
- domain objects for input/output shapes = **BLOCKER**
- separate `*Input`, `*Output`, `*Args`, `*Result` files = **BLOCKER**
- extracted types for single-use shapes = **BLOCKER**

#### .links
- see also: `args:inline-input`, `arch:domain-driven-design`, `codestyle:single-responsibility`
