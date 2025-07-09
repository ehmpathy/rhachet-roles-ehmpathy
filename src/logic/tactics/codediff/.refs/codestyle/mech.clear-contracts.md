
.tactic = mech:contract-before-implementation

.what = declare the shape and expectations of behavior (the contract) before writing its implementation

.why:
- forces clarity about what is being built and why
- prevents premature optimization and over-engineering
- creates a shared agreement for both the builder and consumer
- enables parallel work (e.g., backend + frontend, or logic + UI)

.scope:
- applies to procedures, stitched flows, and any domain mechanisms
- applies at both macro (API endpoint, service) and micro (function, component) levels

.how:
- always begin with a **procedure type** that defines:
  - function signature or interface
  - expected inputs and output shape
  - error modes and invariants
  - why it exists (motivation or business rule)

.examples:

✅ good
    // domain/procedures/sendInvoice.ts

    /**
     * .what = sends an invoice to the customer and marks it as sent
     * .why = required for customer billing compliance and automation
     */
    export const sendInvoice = async ({
      invoice,
      customer,
    }: {
      invoice: Invoice;
      customer: Customer;
    }): Promise<{ success: true }> => {
      // ...
    };

❌ bad
    // logic/sendInvoice.ts

    export const sendInvoice = async (invoice, customer) => {
      // suddenly starts doing 4 things and mutates stuff randomly
    };

.enforcement:
- if a PR implements logic without any visible contract: **blocker**
- if types are vague or inferred (e.g. `any`, `unknown`): **blocker**
- if behavior differs from contract or lacks a test: **blocker**

