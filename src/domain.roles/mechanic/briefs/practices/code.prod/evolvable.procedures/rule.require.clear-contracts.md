
.tactic = mech:contract-before-implementation

.what = declare the shape and expectations of behavior (the contract) before the implementation is written

.why:
- forces clarity about what to build and why
- prevents premature optimization and over-engineer
- creates a shared agreement for both the builder and consumer
- enables parallel work (e.g., backend + frontend, or logic + UI)

.scope:
- applies to procedures, stitched flows, and any domain mechanisms
- applies at both macro (api endpoint, service) and micro (function, component) levels

.how:
- always start with a **procedure type** that defines:
  - function signature or interface
  - expected inputs and output shape
  - error modes and invariants
  - why it exists (motivation or business rule)

.examples:

👍 good
    // domain/procedures/sendInvoice.ts

    /**
     * .what = sends an invoice to the customer and marks it as sent
     * .why = required for customer bill compliance and automation
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

👎 bad
    // logic/sendInvoice.ts

    export const sendInvoice = async (invoice, customer) => {
      // suddenly starts to do 4 tasks and mutates stuff randomly
    };

.enforcement:
- if a PR implements logic without any visible contract: **blocker**
- if types are vague or inferred (e.g. `any`, `unknown`): **blocker**
- if behavior differs from contract or a test is absent: **blocker**

