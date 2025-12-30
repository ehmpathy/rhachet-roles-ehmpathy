### .tactic = contracts:no-io-interfaces

#### .what
forbid separate `interface` or `type` declarations for procedure inputs and outputs; declare them inline

#### .why
- **procedure contracts belong with procedures**
  - an input/output shape is meaningless without its procedure
  - separation fragments comprehension across files
  - the reader must now track two locations instead of one

- **interfaces suggest reuse that doesn't exist**
  - `interface SendInvoiceInput` implies it's used elsewhere — it almost never is
  - this creates false abstraction that clutters the type namespace
  - each procedure's contract is typically unique to that procedure

- **inline types are self-evident**
  - the full contract is visible at the definition site
  - no need to cmd+click or hover to understand the shape
  - changes are immediately visible in context

- **the `*Input/*Output` file explosion is harmful**
  - projects that extract interfaces often end up with:
    - `sendInvoice.ts`
    - `sendInvoice.input.ts`
    - `sendInvoice.output.ts`
  - three files for one procedure is excessive fragmentation

#### .where
- applies to all procedure declarations
- especially enforced in `domain.operations/`, `contract/`, and `access/`

#### .how

##### ✅ required
- declare input types inline on the procedure signature
- declare return types inline on the procedure signature
- use domain objects as **properties** within inline types when appropriate

##### ❌ forbidden
- `interface DoThingInput { ... }` declarations
- `interface DoThingOutput { ... }` declarations
- `type DoThingArgs = { ... }` declarations
- `type DoThingResult = { ... }` declarations
- separate `*.input.ts` or `*.output.ts` files

#### .exceptions
- **sdk public contracts**: exported sdk functions may define explicit request/response interfaces for api documentation
- **shared shapes used 3+ times**: extract to a named `type` only if genuinely reused across multiple unrelated procedures
- **generic utilities**: functions like `map<T, R>(input: T): R` that are intentionally abstract

#### .examples

##### ✅ positive
```ts
/**
 * .what = syncs customer phone from external provider
 * .why = keeps local records current with source of truth
 */
export const syncCustomerPhone = async (
  input: { customerId: string; provider: 'whodis' | 'twilio' },
  context: { customerDao: CustomerDao; log: LogMethods },
): Promise<{ updated: boolean; phoneBefore: string | null; phoneAfter: string | null }> => {
  // contract is fully visible here
};
```

```ts
/**
 * .what = calculates invoice total from line items
 * .why = centralizes price logic with tax handling
 */
export const calculateInvoiceTotal = (
  input: { lineItems: LineItem[]; taxRate: number; discountPercent?: number },
): { subtotal: number; tax: number; total: number } => {
  // input and output shapes are clear at a glance
};
```

##### ❌ negative
```ts
// ⛔ separate interface for input
interface SyncCustomerPhoneInput {
  customerId: string;
  provider: 'whodis' | 'twilio';
}

// ⛔ separate interface for output
interface SyncCustomerPhoneOutput {
  updated: boolean;
  phoneBefore: string | null;
  phoneAfter: string | null;
}

export const syncCustomerPhone = async (
  input: SyncCustomerPhoneInput,
  context: Context,
): Promise<SyncCustomerPhoneOutput> => { ... };
```

```ts
// ⛔ type aliases for single-use shapes
type CalculateTotalArgs = {
  lineItems: LineItem[];
  taxRate: number;
};

type CalculateTotalResult = {
  subtotal: number;
  tax: number;
  total: number;
};

export const calculateInvoiceTotal = (input: CalculateTotalArgs): CalculateTotalResult => { ... };
```

```ts
// ⛔ file fragmentation pattern
// file: syncCustomerPhone.input.ts
export interface SyncCustomerPhoneInput { ... }

// file: syncCustomerPhone.output.ts
export interface SyncCustomerPhoneOutput { ... }

// file: syncCustomerPhone.ts
import { SyncCustomerPhoneInput } from './syncCustomerPhone.input';
import { SyncCustomerPhoneOutput } from './syncCustomerPhone.output';
```

#### .enforcement
- separate `*Input`/`*Output`/`*Args`/`*Result` interfaces or types = **BLOCKER**
- separate input/output files = **BLOCKER**
- extracted types for single-use shapes = **BLOCKER**

#### .links
- see also: `contracts:inline-io`, `args:inline-input`, `codestyle:single-responsibility`
