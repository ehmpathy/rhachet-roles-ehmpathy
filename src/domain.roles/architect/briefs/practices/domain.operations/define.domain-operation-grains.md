# define.domain-operation-grains

## .what

domain.operations have three grains:

| grain | role | contains | purity |
|-------|------|----------|--------|
| **transformer** | compute | decode-friction logic, format conversion | pure |
| **communicator** | commute | raw i/o boundary (SDK, DAO, service calls) | impure |
| **orchestrator** | compose | named operation calls only | depends |

transformers and communicators are both **leaf operations** — they do the work.
orchestrators **compose** leaf operations into workflows.

## .why

transformers compute. communicators commute. orchestrators compose.

this separation enables:
- orchestrators read as narrative — each line tells *what* happens
- transformers encapsulate *how* to compute — implementation detail hidden
- communicators encapsulate *how* to commute — auth + connection + i/o hidden
- readers grasp intent at orchestrator level without decode
- robots spend fewer tokens on comprehension

## .the three grains

### transformers

pure computation. no side effects. decode-friction logic + format conversion.

- input → output, deterministic
- no i/o, no external dependencies
- testable without mocks

**examples:**
- `asKeyrackKeyOrg` — extract org from slug
- `isEligibleForPremiumFeatures` — compute boolean from user attributes
- `asUserEmail` — extract email from user
- `computeInvoiceTotal` — sum line items
- `asStripeCustomer` — domain Customer → stripe api format
- `asInvoice` — quickbooks response → domain Invoice

### communicators

raw i/o boundary. sdks, daos, service clients.

- handle connection, auth, request/response
- encapsulate authentication (api keys, oauth, tokens)
- minimal translation (sdk input/output shapes only)
- verify external communications are functional

**examples:**
- `sdkStripe.setCustomer` — raw stripe api call
- `sdkStripe.getCustomer` — raw stripe api call
- `daoAppointment.upsert` — raw database upsert
- `daoInvoice.findByRef` — raw database query
- `svcDeals.getRecommendedDeals` — raw service call
- `sdkSqs.emit` — raw queue emit

### orchestrators

composition. named operation calls only. no decode-friction.

- compose transformers and communicators into workflows
- each line tells *what* happens, not *how*
- no inline logic — delegate to leaf operations

**examples:**
- `setCustomerInStripe` — asStripeCustomer (transformer) + sdkStripe.setCustomer (communicator)
- `getInvoiceFromQuickbooks` — sdkQuickbooks.getInvoice (communicator) + asInvoice (transformer)
- `syncCustomerFromStripe` — sdkStripe.getCustomer (communicator) + asCustomer (transformer) + daoCustomer.upsert (communicator)
- `genInvoice` — compose multiple transformers + communicators into invoice workflow

## .the distinction

| aspect | transformer | communicator |
|--------|-----------|--------------|
| purity | pure | impure |
| i/o | none | yes (raw boundary) |
| does | computation, format conversion | auth, connection, request/response |
| test strategy | unit test, no mocks | integration test, real or fake deps |
| failure modes | none (deterministic) | network, timeout, rate limit, etc. |

both are leaf operations that orchestrators compose.

## .see also

- `rule.require.orchestrators-as-narrative` — orchestrators must read as narrative
- `rule.forbid.decode-friction-in-orchestrators` — orchestrators must not contain decode-friction
- `philosophy.transformer-orchestrator-separation.[philosophy]` — the book metaphor
