.tactic = name:ubiqlang

.what = enforce a rigorous, domain-driven naming system rooted in ubiquitous language
.where:
  - ubiquitous language = the shared, unambiguous vocabulary used by both domain experts and developers
  - this tactic applies to all names: types, variables, functions, slugs, and folders

.why:
  - eliminates ambiguity and cognitive friction
  - ensures that everyone speaks the same language — in code, UI, tests, and docs
  - prevents synonym drift (e.g., "client" vs "customer") and overload traps (e.g., "update" meaning 3 things)

.how:
  - eliminate synonyms
    - choose one canonical word per concept (e.g., always use `customer`, never `client`, `user`, or `account`)
  - eliminate overloads
    - each term must refer to one concept only (e.g., avoid using `update` for both "save data" and "fetch latest")
  - use consistent term stacking across all code (e.g., `customerPhoneUpdate`, not `editPhoneNumber`)
  - whenever a new term is introduced:
    - define its interface, expected shape, and role
    - document its meaning clearly and visibly (ideally in context or hover docs)
    - ensure its usage is verified across type definitions, business rules, and communication flows

.examples:
  .positive:
    - `customer` instead of `client`, `user`, or `buyer`
    - `jobQuote` as the single term for estimates/proposals
    - `leadCapture` as the canonical action for inbound lead collection
    - `customerPhoneUpdate` for updating a phone number
    - `invoiceDraft` and `invoiceFinal` for two distinct invoice states

  .negative:
    - `client`, `user`, `account`, `buyer` all referring to the same actor
    - `editCustomerPhone`, `changePhone`, `updateNumber` used interchangeably
    - `job` used for both a requested service and a completed one
    - `update()` overloaded to mean save, patch, sync, or refresh
    - `quote`, `estimate`, `proposal`, and `bid` all floating without clear hierarchy
