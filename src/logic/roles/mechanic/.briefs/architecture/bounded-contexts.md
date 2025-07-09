.tactic = arch:bounded-contexts

.what = enforce clear separation of concerns using bounded contexts — each domain must own its logic, models, and procedures

.scope:
  - applies to all modules, folders, stitched routes, domain objects, and services
  - especially enforced within `domain/`, `services/`, `routes/`, and stitched thread flows

.why:
  - upholds the **single responsibility principle** at the system level:
    - each context owns exactly one domain concern (e.g. invoicing, job management, customer data)
  - enforces **low-trust contracts** between contexts:
    - no assumptions about internal structures or invariants of other domains
    - all interaction must happen through **explicit, versionable contracts**
  - prevents entanglement, duplication, and reach-in violations
  - allows teams to reason about one domain in isolation

.how:
  - define one folder per bounded context (e.g. `invoice/`, `customer/`, `job/`)
    - each folder must include its own domain objects, contracts, and procedures
  - forbid imports from other domains' **internal** logic or types
    - instead, expose explicit interfaces or shared types through `contracts/`, `shared/`, or stitched artifacts
  - ensure that each context is **autonomous** and testable in isolation
    - domain folders must never reach into another folder's `db/`, `logic/`, or `utils/`
  - stitched logic must route between contexts via artifacts or high-trust gateways
    - never directly call a foreign context’s service or procedure unless it is exported as a contract

.enforcement:
  - any import of another domain’s internal file or model = BLOCKER
  - procedures must not assume or enforce foreign invariants directly
  - stitched logic must respect bounded context ownership — no direct mutation of another domain's stash

.definitions:
  - **bounded context** = a named scope of ownership over a domain's concepts, contracts, and behaviors
  - **single responsibility** = a context may only solve problems related to its own domain
  - **low-trust contract** = cross-context interactions must rely only on validated inputs and canonical exports

.examples:

  .positive:
    - `job/JobQuote.ts` imports `CustomerPhoneUpdate` from `contracts/`, not from `customer/logic/`
    - `invoice/` has its own `InvoiceDraft`, `InvoiceFinal`, and `generateInvoice.ts`
    - `routes/submitJob.ts` orchestrates job + invoice by stitching, not by importing both

  .negative:
    - `job.ts` imports `from '../../invoice/utils.ts'` ⛔ reach-in
    - `invoiceService.ts` directly updates `customer.email` ⛔ cross-context mutation
    - `customer.ts` imports `JobQuote` and infers state ⛔ ownership violation



- src
  - contract
    - endpoints // public endpoints, deployed and exposed publically
    - commands // internal operations, locally ran
  - data
    - sdks // the sdks used by this service
    - daos // the daos owned by this service
  - domain
    - objects // the domain resources
  - logic // the domain mechanisms
